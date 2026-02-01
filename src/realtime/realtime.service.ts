import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { InventoryMovementRecord } from '../modules/inventory/entities/inventory-movement.entity';
import { StockProjectionRecord } from '../modules/inventory/entities/stock-projection.entity';
import { CartRecord } from '../modules/pos/entities/cart.entity';
import { SaleRecord } from '../modules/pos/entities/sale.entity';

export interface RealtimeContext {
  userId?: string;
  OrganizationId?: string;
  companyId?: string;
  deviceId?: string;
  permissions?: string[];
  ip?: string;
}

@Injectable()
export class RealtimeService {
  private servers = new Map<string, Server>();
  private readonly logger = new Logger(RealtimeService.name);
  private readonly rateLimits = new Map<string, { count: number; resetAt: number }>();
  private readonly defaultWindowMs = 10_000;
  private readonly defaultLimit = 40;

  constructor(private readonly jwtService: JwtService) {}

  setServer(server: Server, namespace = 'realtime') {
    this.servers.set(namespace, server);
  }

  getServer(namespace = 'realtime'): Server | undefined {
    return this.servers.get(namespace);
  }

  async authenticateClient(client: Socket): Promise<RealtimeContext> {
    const token = this.extractToken(client);
    if (!token) {
      throw new WsException('Missing authentication token');
    }

    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_SECRET || 'demo-secret',
      });

      const context: RealtimeContext = {
        userId: payload.sub,
        OrganizationId: payload.OrganizationId,
        companyId: payload.companyId,
        deviceId: payload.deviceId,
        permissions: payload.permissions ?? [],
        ip: client.handshake.address,
      };

      client.data.context = context;
      return context;
    } catch {
      throw new WsException('Invalid token');
    }
  }

  registerDefaultRooms(client: Socket, context: RealtimeContext) {
    if (context.userId) {
      client.join(`user:${context.userId}`);
    }
    if (context.OrganizationId) {
      client.join(`Organization:${context.OrganizationId}`);
    }
    if (context.deviceId) {
      client.join(`device:${context.deviceId}`);
    }
  }

  enforceRateLimit(client: Socket, channel: string, max = this.defaultLimit, windowMs = this.defaultWindowMs) {
    const context = this.resolveContext(client);
    const key = `${context.userId ?? 'anonymous'}:${channel}:${context.deviceId ?? client.id}`;
    const now = Date.now();
    const bucket = this.rateLimits.get(key);

    if (!bucket || bucket.resetAt < now) {
      this.rateLimits.set(key, { count: 1, resetAt: now + windowMs });
      return;
    }

    if (bucket.count >= max) {
      this.logSecurityEvent(context, channel, 'rate-limit', { ip: context.ip ?? client.handshake.address });
      throw new WsException('Rate limit exceeded');
    }

    bucket.count += 1;
  }

  resolveContext(client: Socket): RealtimeContext {
    return client.data?.context ?? { ip: client.handshake.address };
  }

  emitEvent(event: string, payload: any, rooms: string[] = [], namespace = 'realtime') {
    const server = this.getServer(namespace);
    if (!server) {
      this.logger.warn(`Skipping emit for ${event}: socket server not initialized for namespace ${namespace}`);
      return;
    }

    const target = rooms.length > 0 ? server.to(rooms) : server;
    target.emit(event, payload);
  }

  emitToOrganization(OrganizationId: string | undefined, event: string, payload: any) {
    if (!OrganizationId) return;
    this.emitEvent(event, payload, [`Organization:${OrganizationId}`]);
  }

  emitToUser(userId: string | undefined, event: string, payload: any) {
    if (!userId) return;
    this.emitEvent(event, payload, [`user:${userId}`]);
  }

  emitPosCartUpdated(cart: CartRecord) {
    const payload = {
      id: cart.id,
      OrganizationId: cart.OrganizationId,
      companyId: cart.companyId,
      userId: cart.userId,
      status: cart.status,
      total: cart.total,
      warehouseId: cart.warehouseId,
      updatedAt: cart.updatedAt,
    };
    this.emitToOrganization(cart.OrganizationId, 'pos:cart:updated', payload);
    this.emitToUser(cart.userId, 'pos:cart:updated', payload);
  }

  emitPosCartDeleted(cartId: string, OrganizationId: string | undefined, userId?: string) {
    const payload = { id: cartId, OrganizationId };
    this.emitToOrganization(OrganizationId, 'pos:cart:deleted', payload);
    this.emitToUser(userId, 'pos:cart:deleted', payload);
  }

  emitPosInventoryAvailability(projection: StockProjectionRecord, OrganizationId: string) {
    const payload = {
      variantId: projection.variantId,
      warehouseId: projection.warehouseId,
      locationId: projection.locationId,
      available: projection.available,
      onHand: projection.onHand,
      reserved: projection.reserved,
      version: projection.version,
      OrganizationId,
    };
    this.emitToOrganization(OrganizationId, 'pos:inventory:availability', payload);
  }

  emitInventoryStockUpdated(projection: StockProjectionRecord) {
    const payload = {
      variantId: projection.variantId,
      warehouseId: projection.warehouseId,
      locationId: projection.locationId,
      batchId: projection.batchId,
      onHand: projection.onHand,
      reserved: projection.reserved,
      available: projection.available,
      version: projection.version,
      OrganizationId: projection.OrganizationId,
      companyId: projection.companyId,
    };
    this.emitToOrganization(projection.OrganizationId, 'inventory:stock:updated', payload);
  }

  emitDashboardSalesTick(sale: SaleRecord) {
    const payload = {
      saleId: sale.id,
      total: sale.total,
      storeId: sale.warehouseId,
      OrganizationId: sale.OrganizationId,
      companyId: sale.companyId,
      timestamp: sale.updatedAt ?? sale.createdAt,
    };
    this.emitToOrganization(sale.OrganizationId, 'dashboard:sales:tick', payload);
  }

  emitInventoryAlert(projection: StockProjectionRecord, threshold = 5) {
    if (projection.available > threshold) return;
    const payload = {
      variantId: projection.variantId,
      warehouseId: projection.warehouseId,
      available: projection.available,
      OrganizationId: projection.OrganizationId,
      alert: 'low_stock',
    };
    this.emitToOrganization(projection.OrganizationId, 'dashboard:inventory:alerts', payload);
  }

  logConnection(context: RealtimeContext, event: 'connected' | 'disconnected', client: Socket) {
    this.logger.log(
      `[ws:${event}] user=${context.userId ?? 'anonymous'} Organization=${context.OrganizationId ?? '-'} device=${context.deviceId ?? '-'} ip=${client.handshake.address}`,
    );
  }

  logSecurityEvent(context: RealtimeContext, event: string, action: string, meta?: Record<string, any>) {
    const details = { userId: context.userId, OrganizationId: context.OrganizationId, deviceId: context.deviceId, ip: context.ip, ...meta };
    this.logger.log(`[ws:audit] event=${event} action=${action} scope=${JSON.stringify(details)}`);
  }

  logDomainEvent(event: string, OrganizationId?: string, companyId?: string) {
    this.logger.debug(`[ws:event] ${event} Organization=${OrganizationId ?? '-'} company=${companyId ?? '-'}`);
  }

  auditMovementEvent(projection: StockProjectionRecord, movement: InventoryMovementRecord) {
    this.logDomainEvent(`movement:${movement.operationId}`, projection.OrganizationId, projection.companyId);
  }

  private extractToken(client: Socket): string | undefined {
    const authToken = (client.handshake.auth as any)?.token;
    if (typeof authToken === 'string') return this.normalizeToken(authToken);

    const queryToken = client.handshake.query?.token;
    if (typeof queryToken === 'string') return this.normalizeToken(queryToken);
    if (Array.isArray(queryToken) && queryToken.length > 0) {
      return this.normalizeToken(queryToken[0]);
    }

    const headerAuth = client.handshake.headers['authorization'];
    if (typeof headerAuth === 'string') {
      return this.normalizeToken(headerAuth);
    }
    return undefined;
  }

  private normalizeToken(value: string): string {
    return value.toLowerCase().startsWith('bearer ') ? value.split(' ')[1] : value;
  }
}

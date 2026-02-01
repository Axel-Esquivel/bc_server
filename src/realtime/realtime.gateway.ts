import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { RealtimeService } from './realtime.service';

const envOrigins =
  process.env.CORS_ORIGINS?.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean) ?? [];
const isDevelopment = process.env.NODE_ENV === 'development';
const allowedOrigins = envOrigins.length > 0 ? envOrigins : isDevelopment ? ['http://localhost:4200'] : ['*'];

@WebSocketGateway({
  namespace: '/realtime',
  cors: {
    origin: allowedOrigins,
    credentials: true,
  },
})
export class RealtimeGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(RealtimeGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(private readonly realtimeService: RealtimeService) {}

  afterInit(server: Server) {
    this.realtimeService.setServer(server, 'realtime');
    this.logger.log('Realtime gateway initialized');
  }

  async handleConnection(client: Socket) {
    try {
      const context = await this.realtimeService.authenticateClient(client);
      this.realtimeService.registerDefaultRooms(client, context);
      this.realtimeService.logConnection(context, 'connected', client);
      this.logger.log(`Socket connected: ${client.id}`);
    } catch (error) {
      this.logger.warn(`Disconnecting socket ${client.id}: ${error.message}`);
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    const context = this.realtimeService.resolveContext(client);
    this.realtimeService.logConnection(context, 'disconnected', client);
  }

  @SubscribeMessage('join:Organization')
  handleJoinOrganization(@ConnectedSocket() client: Socket, @MessageBody() data: { OrganizationId: string }) {
    this.realtimeService.enforceRateLimit(client, 'join:Organization', 15, 60_000);
    const context = this.realtimeService.resolveContext(client);
    if (context.OrganizationId && context.OrganizationId === data?.OrganizationId) {
      client.join(`Organization:${context.OrganizationId}`);
      this.realtimeService.logSecurityEvent(context, 'join:Organization', 'joined', { OrganizationId: context.OrganizationId });
      return { joined: context.OrganizationId };
    }

    this.realtimeService.logSecurityEvent(context, 'join:Organization', 'rejected', {
      requested: data?.OrganizationId,
    });
    return { error: 'Organization mismatch' };
  }

  @SubscribeMessage('join:room')
  handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { room: string; allowOrganizationscoped?: boolean },
  ) {
    this.realtimeService.enforceRateLimit(client, 'join:room');
    const context = this.realtimeService.resolveContext(client);
    if (data?.allowOrganizationscoped && context.OrganizationId && data.room.startsWith(`Organization:${context.OrganizationId}:`)) {
      client.join(data.room);
      this.realtimeService.logSecurityEvent(context, 'join:room', 'joined', { room: data.room });
      return { joined: data.room };
    }

    return { error: 'Room not allowed' };
  }
}

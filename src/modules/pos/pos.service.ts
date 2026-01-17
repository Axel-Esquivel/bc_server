import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { InventoryDirection } from '../inventory/entities/inventory-movement.entity';
import { InventoryService } from '../inventory/inventory.service';
import { RealtimeService } from '../../realtime/realtime.service';
import { ModuleStateService } from '../../core/database/module-state.service';
import { AddCartLineDto } from './dto/add-cart-line.dto';
import { AddPaymentDto } from './dto/add-payment.dto';
import { ConfirmCartDto } from './dto/confirm-cart.dto';
import { CreateCartDto } from './dto/create-cart.dto';
import { CartLineRecord } from './entities/cart-line.entity';
import { CartRecord, CartStatus } from './entities/cart.entity';
import { PaymentRecord } from './entities/payment.entity';
import { Promotion, ComboRule } from './entities/promotion.entity';
import { SaleLineRecord } from './entities/sale-line.entity';
import { SaleRecord, SaleStatus } from './entities/sale.entity';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { PosTerminal } from '../workspaces/dto/pos-terminal.dto';

interface PosState {
  carts: CartRecord[];
  sales: SaleRecord[];
  promotions: Promotion[];
  combos: ComboRule[];
}

@Injectable()
export class PosService implements OnModuleInit {
  // TODO: replace in-memory collections with MongoDB persistence and domain events for CQRS projections.
  private readonly logger = new Logger(PosService.name);
  private readonly stateKey = 'module:pos';
  private carts: CartRecord[] = [];
  private sales: SaleRecord[] = [];
  private promotions: Promotion[] = [];
  private combos: ComboRule[] = [];

  constructor(
    private readonly inventoryService: InventoryService,
    private readonly realtimeService: RealtimeService,
    private readonly moduleState: ModuleStateService,
    private readonly workspacesService: WorkspacesService,
  ) {}

  async onModuleInit(): Promise<void> {
    const state = await this.moduleState.loadState<PosState>(this.stateKey, {
      carts: [],
      sales: [],
      promotions: [],
      combos: [],
    });
    this.carts = state.carts ?? [];
    this.sales = state.sales ?? [];
    this.promotions = state.promotions ?? [];
    this.combos = state.combos ?? [];
  }

  createCart(dto: CreateCartDto): CartRecord {
    const cart: CartRecord = {
      id: uuid(),
      workspaceId: dto.workspaceId,
      companyId: dto.companyId,
      warehouseId: dto.warehouseId,
      userId: dto.userId,
      currency: dto.currency ?? 'USD',
      status: CartStatus.OPEN,
      subtotal: 0,
      discountTotal: 0,
      total: 0,
      lines: [],
      payments: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.carts.push(cart);
    this.realtimeService.emitPosCartUpdated(cart);
    this.persistState();
    return cart;
  }

  addLine(cartId: string, dto: AddCartLineDto): CartRecord {
    const cart = this.findCart(cartId);
    this.ensureTenant(cart.workspaceId, cart.companyId, dto.workspaceId, dto.companyId);

    if (cart.status !== CartStatus.OPEN) {
      throw new BadRequestException('Cart is not open for modifications');
    }

    const line: CartLineRecord = {
      id: uuid(),
      variantId: dto.variantId,
      quantity: dto.quantity,
      unitPrice: dto.unitPrice,
      discountAmount: dto.discountAmount ?? 0,
      locationId: dto.locationId,
      batchId: dto.batchId,
      reservedOperationId: `reserve:${cart.id}:${uuid()}`,
      total: 0,
    };

    const projection = this.inventoryService.reserveStock(line.reservedOperationId, {
      variantId: dto.variantId,
      warehouseId: cart.warehouseId,
      locationId: dto.locationId,
      batchId: dto.batchId,
      quantity: dto.quantity,
      workspaceId: cart.workspaceId,
      companyId: cart.companyId,
    });

    cart.lines.push(line);
    this.applyPricing(cart);
    this.realtimeService.emitPosCartUpdated(cart);
    this.realtimeService.emitPosInventoryAvailability(projection, cart.workspaceId);
    this.persistState();
    return cart;
  }

  addPayment(cartId: string, dto: AddPaymentDto): CartRecord {
    const cart = this.findCart(cartId);
    this.ensureTenant(cart.workspaceId, cart.companyId, dto.workspaceId, dto.companyId);

    if (cart.status !== CartStatus.OPEN) {
      throw new BadRequestException('Cart is not open for payments');
    }

    const payment: PaymentRecord = {
      id: uuid(),
      method: dto.method,
      amount: dto.amount,
      currency: dto.currency ?? cart.currency,
      reference: dto.reference,
      workspaceId: dto.workspaceId,
      companyId: dto.companyId,
      cartId: cart.id,
    };

    cart.payments.push(payment);
    cart.updatedAt = new Date();
    this.realtimeService.emitPosCartUpdated(cart);
    this.persistState();
    return cart;
  }

  confirmCart(cartId: string, dto: ConfirmCartDto, cashierUserId: string): SaleRecord {
    const cart = this.findCart(cartId);
    this.ensureTenant(cart.workspaceId, cart.companyId, dto.workspaceId, dto.companyId);
    const terminal = this.getTerminal(dto.workspaceId, dto.terminalId);
    if (terminal.companyId !== cart.companyId) {
      throw new BadRequestException('Terminal does not belong to the company');
    }
    if (terminal.warehouseId !== cart.warehouseId) {
      throw new BadRequestException('Terminal does not belong to the warehouse');
    }
    if (!terminal.allowedUsers.includes(cashierUserId)) {
      throw new ForbiddenException('User not allowed for terminal');
    }

    if (cart.status !== CartStatus.OPEN) {
      throw new BadRequestException('Cart is already processed');
    }

    if (cart.lines.length === 0) {
      throw new BadRequestException('Cart has no lines to confirm');
    }

    const totalPaid = cart.payments.reduce((acc, payment) => acc + payment.amount, 0);
    if (totalPaid < cart.total) {
      throw new BadRequestException('Insufficient payment to confirm sale');
    }

    const sale: SaleRecord = {
      id: uuid(),
      workspaceId: cart.workspaceId,
      companyId: cart.companyId,
      warehouseId: cart.warehouseId,
      branchId: terminal.branchId,
      terminalId: terminal.id,
      cashierUserId,
      cartId: cart.id,
      customerId: dto.customerId,
      currency: cart.currency,
      status: SaleStatus.COMPLETED,
      subtotal: cart.subtotal,
      discountTotal: cart.discountTotal,
      total: cart.total,
      lines: [],
      payments: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    cart.lines.forEach((line) => {
      const releaseProjection = this.inventoryService.releaseReservation(line.reservedOperationId);
      const { projection } = this.inventoryService.recordMovement({
        direction: InventoryDirection.OUT,
        variantId: line.variantId,
        warehouseId: cart.warehouseId,
        locationId: line.locationId,
        batchId: line.batchId,
        quantity: line.quantity,
        operationId: `${sale.id}:${line.id}`,
        references: { saleId: sale.id, cartId: cart.id },
        workspaceId: cart.workspaceId,
        companyId: cart.companyId,
      });

      this.realtimeService.emitPosInventoryAvailability(releaseProjection, cart.workspaceId);
      this.realtimeService.emitPosInventoryAvailability(projection, cart.workspaceId);

      const saleLine: SaleLineRecord = {
        id: uuid(),
        variantId: line.variantId,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        discountAmount: line.discountAmount,
        total: line.total,
      };

      sale.lines.push(saleLine);
    });

    sale.payments = cart.payments.map((payment) => ({ ...payment, saleId: sale.id }));
    this.sales.push(sale);

    cart.status = CartStatus.CONFIRMED;
    cart.saleId = sale.id;
    cart.updatedAt = new Date();
    this.realtimeService.emitPosCartUpdated(cart);
    this.realtimeService.emitDashboardSalesTick(sale);
    this.persistState();
    return sale;
  }

  listCarts(workspaceId?: string, companyId?: string): CartRecord[] {
    return this.carts.filter((cart) => {
      if (workspaceId && cart.workspaceId !== workspaceId) return false;
      if (companyId && cart.companyId !== companyId) return false;
      return true;
    });
  }

  listSales(params: {
    workspaceId?: string;
    companyId?: string;
    terminalId?: string;
    cashierUserId?: string;
    dateFrom?: Date;
    dateTo?: Date;
  } = {}): SaleRecord[] {
    return this.sales.filter((sale) => {
      if (params.workspaceId && sale.workspaceId !== params.workspaceId) return false;
      if (params.companyId && sale.companyId !== params.companyId) return false;
      if (params.terminalId && sale.terminalId !== params.terminalId) return false;
      if (params.cashierUserId && sale.cashierUserId !== params.cashierUserId) return false;
      if (params.dateFrom && sale.createdAt < params.dateFrom) return false;
      if (params.dateTo && sale.createdAt > params.dateTo) return false;
      return true;
    });
  }

  private applyPricing(cart: CartRecord) {
    cart.subtotal = 0;
    cart.discountTotal = 0;

    cart.lines.forEach((line) => {
      const lineSubtotal = line.quantity * line.unitPrice;
      const appliedDiscount = line.discountAmount ?? 0;
      const promotionalDiscount = this.applyPromotions(line, cart.workspaceId, cart.companyId);
      const totalDiscount = appliedDiscount + promotionalDiscount;

      line.total = lineSubtotal - totalDiscount;
      cart.subtotal += lineSubtotal;
      cart.discountTotal += totalDiscount;
    });

    cart.total = cart.subtotal - cart.discountTotal;
    cart.updatedAt = new Date();
  }

  private applyPromotions(line: CartLineRecord, workspaceId: string, companyId: string): number {
    // Placeholder for promo + combo evaluation based on docs/10_PRICING_DISCOUNTS_PROMOS.md
    // and docs/06_SALES_POS.md. Real logic will query price lists, promotions, and combo rules.
    const activePromotions = this.promotions.filter(
      (promotion) => promotion.workspaceId === workspaceId && promotion.companyId === companyId,
    );

    if (activePromotions.length === 0) {
      return 0;
    }

    const rate = activePromotions[0].discountRate ?? 0;
    return (line.quantity * line.unitPrice * rate) / 100;
  }

  private findCart(cartId: string): CartRecord {
    const cart = this.carts.find((item) => item.id === cartId);
    if (!cart) {
      throw new NotFoundException('Cart not found');
    }
    return cart;
  }

  private ensureTenant(
    workspaceId: string,
    companyId: string,
    expectedWorkspaceId: string,
    expectedCompanyId: string,
  ) {
    if (workspaceId !== expectedWorkspaceId || companyId !== expectedCompanyId) {
      throw new BadRequestException('Workspace or company mismatch');
    }
  }

  private persistState() {
    void this.moduleState
      .saveState<PosState>(this.stateKey, {
        carts: this.carts,
        sales: this.sales,
        promotions: this.promotions,
        combos: this.combos,
      })
      .catch((error) => {
        const message = error instanceof Error ? error.stack ?? error.message : String(error);
        this.logger.error(`Failed to persist POS state: ${message}`);
      });
  }

  private getTerminal(workspaceId: string, terminalId: string): PosTerminal {
    const settings = this.workspacesService.listPosTerminals(workspaceId);
    const terminal = settings.terminals.find((item) => item.id === terminalId);
    if (!terminal) {
      throw new NotFoundException('POS terminal not found');
    }
    return terminal;
  }
}

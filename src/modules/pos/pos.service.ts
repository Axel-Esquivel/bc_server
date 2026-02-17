import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { InventoryDirection } from '../inventory/entities/inventory-movement.entity';
import { InventoryService } from '../inventory/inventory.service';
import { RealtimeService } from '../../realtime/realtime.service';
import { ModuleStateService } from '../../core/database/module-state.service';
import { CoreEventsService } from '../../core/events/core-events.service';
import { createBusinessEvent } from '../../core/events/business-event';
import type { JsonObject } from '../../core/events/business-event';
import { OutboxService } from '../outbox/outbox.service';
import { AddCartLineDto } from './dto/add-cart-line.dto';
import { AddPaymentDto } from './dto/add-payment.dto';
import { ClosePosSessionDto } from './dto/close-pos-session.dto';
import { ConfirmCartDto } from './dto/confirm-cart.dto';
import { CreateCartDto } from './dto/create-cart.dto';
import { CreatePosSaleDto } from './dto/create-pos-sale.dto';
import { OpenPosSessionDto } from './dto/open-pos-session.dto';
import { PosSaleActionDto } from './dto/pos-sale-action.dto';
import { CartLineRecord } from './entities/cart-line.entity';
import { CartRecord, CartStatus } from './entities/cart.entity';
import { PaymentMethod, PaymentRecord } from './entities/payment.entity';
import { Promotion, ComboRule } from './entities/promotion.entity';
import { SaleLineRecord } from './entities/sale-line.entity';
import { SaleRecord, SaleStatus } from './entities/sale.entity';
import { PosSessionRecord, PosSessionStatus } from './entities/pos-session.entity';
import { OrganizationsService } from '../organizations/organizations.service';
import { CompaniesService } from '../companies/companies.service';
import { PosTerminal } from '../organizations/types/pos-terminal.types';

interface PosState {
  sessions: PosSessionRecord[];
  carts: CartRecord[];
  sales: SaleRecord[];
  promotions: Promotion[];
  combos: ComboRule[];
}

interface PosSaleCompletedPayload extends JsonObject {
  totals: {
    subtotal: number;
    tax: number;
    discount: number;
    grandTotal: number;
  };
  payment: {
    method: string;
    amount: number;
  } | null;
  lines: Array<{
    productId: string;
    qty: number;
    unitPrice: number;
    total: number;
  }>;
  currency: string;
  occurredAt: string;
}

interface PosSaleEventPayload extends JsonObject {
  saleId: string;
  status: SaleStatus;
  totals: {
    subtotal: number;
    tax: number;
    discount: number;
    grandTotal: number;
  };
  payment: {
    method: string;
    amount: number;
  } | null;
  lines: Array<{
    productId: string;
    qty: number;
    unitPrice: number;
    total: number;
  }>;
  currency: string;
  occurredAt: string;
  companyId: string;
  enterpriseId: string;
  warehouseId: string;
  terminalId?: string;
}

interface PosSessionEventPayload extends JsonObject {
  sessionId: string;
  cartId?: string;
  userId?: string;
  OrganizationId: string;
  companyId: string;
  enterpriseId: string;
  warehouseId: string;
  occurredAt: string;
  openingAmount?: number;
  closingAmount?: number;
  status?: PosSessionStatus;
}

@Injectable()
export class PosService implements OnModuleInit {
  // TODO: replace in-memory collections with MongoDB persistence and domain events for CQRS projections.
  private readonly logger = new Logger(PosService.name);
  private readonly stateKey = 'module:pos';
  private sessions: PosSessionRecord[] = [];
  private carts: CartRecord[] = [];
  private sales: SaleRecord[] = [];
  private promotions: Promotion[] = [];
  private combos: ComboRule[] = [];

  constructor(
    private readonly inventoryService: InventoryService,
    private readonly realtimeService: RealtimeService,
    private readonly moduleState: ModuleStateService,
    private readonly OrganizationsService: OrganizationsService,
    private readonly companiesService: CompaniesService,
    private readonly coreEventsService: CoreEventsService,
    private readonly outboxService: OutboxService,
  ) {}

  async onModuleInit(): Promise<void> {
    const state = await this.moduleState.loadState<PosState>(this.stateKey, {
      sessions: [],
      carts: [],
      sales: [],
      promotions: [],
      combos: [],
    });
    this.sessions = state.sessions ?? [];
    this.carts = state.carts ?? [];
    this.sales = state.sales ?? [];
    this.promotions = state.promotions ?? [];
    this.combos = state.combos ?? [];
  }

  createCart(dto: CreateCartDto): CartRecord {
    const cart: CartRecord = {
      id: uuid(),
      OrganizationId: dto.OrganizationId,
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
    const enterpriseId = this.resolveEnterpriseId(cart.companyId);
    this.emitSessionOpened({
      OrganizationId: cart.OrganizationId,
      companyId: cart.companyId,
      enterpriseId,
      sessionId: cart.id,
      cartId: cart.id,
      userId: cart.userId,
      warehouseId: cart.warehouseId,
      occurredAt: cart.createdAt.toISOString(),
      openingAmount: 0,
      status: PosSessionStatus.OPEN,
    });
    return cart;
  }

  addLine(cartId: string, dto: AddCartLineDto): CartRecord {
    const cart = this.findCart(cartId);
    this.ensureTenant(cart.OrganizationId, cart.companyId, dto.OrganizationId, dto.companyId);

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

    const enterpriseId = this.resolveEnterpriseId(cart.companyId);
    const projection = this.inventoryService.reserveStock(line.reservedOperationId, {
      variantId: dto.variantId,
      warehouseId: cart.warehouseId,
      enterpriseId,
      locationId: dto.locationId,
      batchId: dto.batchId,
      quantity: dto.quantity,
      OrganizationId: cart.OrganizationId,
      companyId: cart.companyId,
    });

    cart.lines.push(line);
    this.applyPricing(cart);
    this.realtimeService.emitPosCartUpdated(cart);
    this.realtimeService.emitPosInventoryAvailability(projection, cart.OrganizationId);
    this.persistState();
    return cart;
  }

  addPayment(cartId: string, dto: AddPaymentDto): CartRecord {
    const cart = this.findCart(cartId);
    this.ensureTenant(cart.OrganizationId, cart.companyId, dto.OrganizationId, dto.companyId);

    if (cart.status !== CartStatus.OPEN) {
      throw new BadRequestException('Cart is not open for payments');
    }

    const payment: PaymentRecord = {
      id: uuid(),
      method: dto.method,
      amount: dto.amount,
      currency: dto.currency ?? cart.currency,
      reference: dto.reference,
      OrganizationId: dto.OrganizationId,
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
    this.ensureTenant(cart.OrganizationId, cart.companyId, dto.OrganizationId, dto.companyId);
    const terminal = this.getTerminal(dto.OrganizationId, dto.terminalId);
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

    const enterpriseId = this.resolveEnterpriseId(cart.companyId);
    const sale: SaleRecord = {
      id: uuid(),
      OrganizationId: cart.OrganizationId,
      companyId: cart.companyId,
      enterpriseId,
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
        enterpriseId,
        locationId: line.locationId,
        batchId: line.batchId,
        quantity: line.quantity,
        operationId: `${sale.id}:${line.id}`,
        references: { saleId: sale.id, cartId: cart.id },
        OrganizationId: cart.OrganizationId,
        companyId: cart.companyId,
      });

      this.realtimeService.emitPosInventoryAvailability(releaseProjection, cart.OrganizationId);
      this.realtimeService.emitPosInventoryAvailability(projection, cart.OrganizationId);

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

    this.emitSaleCompletedEvent(sale);
    this.emitSessionClosed({
      OrganizationId: cart.OrganizationId,
      companyId: cart.companyId,
      enterpriseId,
      sessionId: cart.id,
      cartId: cart.id,
      userId: cart.userId,
      warehouseId: cart.warehouseId,
      occurredAt: (sale.updatedAt ?? sale.createdAt).toISOString(),
      closingAmount: sale.total,
      status: PosSessionStatus.CLOSED,
    });
    return sale;
  }

  openSession(dto: OpenPosSessionDto): PosSessionRecord {
    this.ensureEnterprise(dto.companyId, dto.enterpriseId);

    const activeSession = this.sessions.find(
      (session) =>
        session.companyId === dto.companyId &&
        session.enterpriseId === dto.enterpriseId &&
        session.cashierUserId === dto.cashierUserId &&
        session.status === PosSessionStatus.OPEN,
    );
    if (activeSession) {
      throw new BadRequestException('There is already an open session for this cashier');
    }

    const session: PosSessionRecord = {
      id: uuid(),
      OrganizationId: dto.OrganizationId,
      companyId: dto.companyId,
      enterpriseId: dto.enterpriseId,
      cashierUserId: dto.cashierUserId,
      status: PosSessionStatus.OPEN,
      openingAmount: dto.openingAmount,
      openedAt: new Date(),
      closedAt: undefined,
      closingAmount: undefined,
      warehouseId: dto.warehouseId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.sessions.push(session);
    this.persistState();
    this.emitSessionOpened({
      OrganizationId: session.OrganizationId,
      companyId: session.companyId,
      enterpriseId: session.enterpriseId,
      sessionId: session.id,
      userId: session.cashierUserId,
      warehouseId: session.warehouseId,
      occurredAt: session.openedAt.toISOString(),
      openingAmount: session.openingAmount,
      status: session.status,
    });
    return session;
  }

  closeSession(dto: ClosePosSessionDto): PosSessionRecord {
    this.ensureEnterprise(dto.companyId, dto.enterpriseId);
    const session = this.sessions.find((item) => item.id === dto.sessionId);
    if (!session) {
      throw new NotFoundException('POS session not found');
    }
    if (session.enterpriseId !== dto.enterpriseId) {
      throw new BadRequestException('Session does not belong to the provided enterprise');
    }
    if (session.status !== PosSessionStatus.OPEN) {
      throw new BadRequestException('POS session is already closed');
    }
    if (session.OrganizationId !== dto.OrganizationId || session.companyId !== dto.companyId) {
      throw new BadRequestException('Session does not belong to the provided Organization/company');
    }

    session.status = PosSessionStatus.CLOSED;
    session.closedAt = new Date();
    session.closingAmount = dto.closingAmount;
    session.updatedAt = new Date();

    this.persistState();
    this.emitSessionClosed({
      OrganizationId: session.OrganizationId,
      companyId: session.companyId,
      enterpriseId: session.enterpriseId,
      sessionId: session.id,
      userId: dto.cashierUserId ?? session.cashierUserId,
      warehouseId: session.warehouseId,
      occurredAt: (session.closedAt ?? new Date()).toISOString(),
      closingAmount: session.closingAmount,
      status: session.status,
    });
    return session;
  }

  createSale(dto: CreatePosSaleDto): SaleRecord {
    this.ensureEnterprise(dto.companyId, dto.enterpriseId);
    const session = this.findSession(dto.sessionId);
    if (session.status !== PosSessionStatus.OPEN) {
      throw new BadRequestException('Cannot create sale without an open session');
    }
    if (session.enterpriseId !== dto.enterpriseId) {
      throw new BadRequestException('Session does not belong to the provided enterprise');
    }

    const totals = this.calculateSaleTotals(dto.lines);
    const payments = dto.payments ?? [];
    if (payments.some((payment) => payment.method !== PaymentMethod.CASH)) {
      throw new BadRequestException('Only CASH payments are supported');
    }
    const sale: SaleRecord = {
      id: uuid(),
      OrganizationId: dto.OrganizationId,
      companyId: dto.companyId,
      enterpriseId: dto.enterpriseId,
      warehouseId: dto.warehouseId,
      sessionId: dto.sessionId,
      customerId: dto.customerId,
      currency: dto.currency ?? 'USD',
      status: SaleStatus.DRAFT,
      subtotal: totals.subtotal,
      discountTotal: 0,
      total: totals.grandTotal,
      lines: dto.lines.map((line) => ({
        id: uuid(),
        variantId: line.productId,
        quantity: line.qty,
        unitPrice: line.unitPrice,
        discountAmount: 0,
        total: line.qty * line.unitPrice,
      })),
      payments: payments.map((payment) => ({
        id: uuid(),
        method: payment.method,
        amount: payment.amount,
        currency: dto.currency ?? 'USD',
        reference: undefined,
        OrganizationId: dto.OrganizationId,
        companyId: dto.companyId,
      })),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.sales.push(sale);
    this.persistState();
    this.emitSaleDomainEvent(sale, 'pos.sale.created', totals);
    return sale;
  }

  postSale(saleId: string, dto: PosSaleActionDto): SaleRecord {
    this.ensureEnterprise(dto.companyId, dto.enterpriseId);
    const sale = this.findSale(saleId);
    if (sale.enterpriseId !== dto.enterpriseId) {
      throw new BadRequestException('Sale does not belong to the provided enterprise');
    }
    if (sale.status !== SaleStatus.DRAFT) {
      throw new BadRequestException('Sale is not in draft status');
    }
    const session = sale.sessionId ? this.findSession(sale.sessionId) : null;
    if (!session || session.status !== PosSessionStatus.OPEN) {
      throw new BadRequestException('Cannot post sale without an open session');
    }

    this.validateStockAvailability(sale);
    sale.lines.forEach((line) => {
      this.inventoryService.recordMovement({
        direction: InventoryDirection.OUT,
        variantId: line.variantId,
        warehouseId: sale.warehouseId,
        enterpriseId: sale.enterpriseId,
        quantity: line.quantity,
        operationId: `${sale.id}:${line.id}`,
        references: { saleId: sale.id },
        OrganizationId: sale.OrganizationId,
        companyId: sale.companyId,
      });
    });

    this.validatePayments(sale);
    sale.status = SaleStatus.COMPLETED;
    sale.updatedAt = new Date();
    this.persistState();

    const totals = this.calculateSaleTotalsFromSale(sale);
    this.emitSaleDomainEvent(sale, 'pos.sale.posted', totals);
    return sale;
  }

  voidSale(saleId: string, dto: PosSaleActionDto): SaleRecord {
    this.ensureEnterprise(dto.companyId, dto.enterpriseId);
    const sale = this.findSale(saleId);
    if (sale.enterpriseId !== dto.enterpriseId) {
      throw new BadRequestException('Sale does not belong to the provided enterprise');
    }
    if (sale.status === SaleStatus.CANCELLED) {
      return sale;
    }
    sale.status = SaleStatus.CANCELLED;
    sale.updatedAt = new Date();
    this.persistState();
    const totals = this.calculateSaleTotalsFromSale(sale);
    this.emitSaleDomainEvent(sale, 'pos.sale.voided', totals);
    return sale;
  }

  listCarts(OrganizationId?: string, companyId?: string): CartRecord[] {
    return this.carts.filter((cart) => {
      if (OrganizationId && cart.OrganizationId !== OrganizationId) return false;
      if (companyId && cart.companyId !== companyId) return false;
      return true;
    });
  }

  listSales(params: {
    OrganizationId?: string;
    companyId?: string;
    terminalId?: string;
    cashierUserId?: string;
    dateFrom?: Date;
    dateTo?: Date;
  } = {}): SaleRecord[] {
    return this.sales.filter((sale) => {
      if (params.OrganizationId && sale.OrganizationId !== params.OrganizationId) return false;
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
      const promotionalDiscount = this.applyPromotions(line, cart.OrganizationId, cart.companyId);
      const totalDiscount = appliedDiscount + promotionalDiscount;

      line.total = lineSubtotal - totalDiscount;
      cart.subtotal += lineSubtotal;
      cart.discountTotal += totalDiscount;
    });

    cart.total = cart.subtotal - cart.discountTotal;
    cart.updatedAt = new Date();
  }

  private applyPromotions(line: CartLineRecord, OrganizationId: string, companyId: string): number {
    // Placeholder for promo + combo evaluation based on docs/10_PRICING_DISCOUNTS_PROMOS.md
    // and docs/06_SALES_POS.md. Real logic will query price lists, promotions, and combo rules.
    const activePromotions = this.promotions.filter(
      (promotion) => promotion.OrganizationId === OrganizationId && promotion.companyId === companyId,
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
    OrganizationId: string,
    companyId: string,
    expectedOrganizationId: string,
    expectedCompanyId: string,
  ) {
    if (OrganizationId !== expectedOrganizationId || companyId !== expectedCompanyId) {
      throw new BadRequestException('Organization or company mismatch');
    }
  }

  private persistState() {
    void this.moduleState
      .saveState<PosState>(this.stateKey, {
        sessions: this.sessions,
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

  private getTerminal(OrganizationId: string, terminalId: string): PosTerminal {
    const settings = this.OrganizationsService.listPosTerminals(OrganizationId);
    const terminal = settings.terminals.find((item) => item.id === terminalId);
    if (!terminal) {
      throw new NotFoundException('POS terminal not found');
    }
    return terminal;
  }

  private emitSaleCompletedEvent(sale: SaleRecord): void {
    try {
      const company = this.companiesService.getCompany(sale.companyId);
      const enterpriseId = company.defaultEnterpriseId ?? company.enterprises?.[0]?.id ?? '';
      if (!enterpriseId) {
        throw new BadRequestException('Enterprise not resolved for sale');
      }

      const totals = {
        subtotal: sale.subtotal,
        tax: 0,
        discount: sale.discountTotal,
        grandTotal: sale.total,
      };
      const payment = sale.payments[0]
        ? { method: sale.payments[0].method, amount: sale.payments[0].amount }
        : null;
      const lines = sale.lines.map((line) => ({
        productId: line.variantId,
        qty: line.quantity,
        unitPrice: line.unitPrice,
        total: line.total,
      }));

      const occurredAt = sale.createdAt ?? new Date();
      const salePayload: PosSaleEventPayload = {
        saleId: sale.id,
        status: sale.status,
        totals,
        payment,
        lines,
        currency: sale.currency ?? company.defaultCurrencyId ?? company.baseCurrencyId,
        occurredAt: occurredAt.toISOString(),
        companyId: sale.companyId,
        enterpriseId,
        warehouseId: sale.warehouseId,
        terminalId: sale.terminalId,
      };

      void this.outboxService
        .add({
          organizationId: sale.OrganizationId,
          enterpriseId,
          moduleKey: 'pos',
          eventType: 'pos.sale.created',
          payload: salePayload,
        })
        .catch((error) => {
          const message = error instanceof Error ? error.stack ?? error.message : String(error);
          this.logger.error(`Failed to enqueue POS sale created event ${sale.id}: ${message}`);
        });

      void this.outboxService
        .add({
          organizationId: sale.OrganizationId,
          enterpriseId,
          moduleKey: 'pos',
          eventType: 'pos.sale.updated',
          payload: salePayload,
        })
        .catch((error) => {
          const message = error instanceof Error ? error.stack ?? error.message : String(error);
          this.logger.error(`Failed to enqueue POS sale updated event ${sale.id}: ${message}`);
        });

      const event = createBusinessEvent<PosSaleCompletedPayload>({
        type: 'pos.sale.completed',
        organizationId: sale.OrganizationId,
        occurredAt,
        context: {
          enterpriseId,
          companyId: sale.companyId,
          countryId: company.baseCountryId,
          currencyId: sale.currency ?? company.defaultCurrencyId ?? company.baseCurrencyId,
          year: occurredAt.getUTCFullYear(),
          month: occurredAt.getUTCMonth() + 1,
        },
        ref: { entity: 'pos.sale', id: sale.id },
        payload: {
          totals,
          payment,
          lines,
          currency: sale.currency ?? company.defaultCurrencyId ?? company.baseCurrencyId,
          occurredAt: occurredAt.toISOString(),
        },
      });

      void this.coreEventsService.enqueue(event).catch((error) => {
        const message = error instanceof Error ? error.stack ?? error.message : String(error);
        this.logger.error(`Failed to enqueue POS sale event ${sale.id}: ${message}`);
      });

      void this.outboxService
        .add({
          organizationId: sale.OrganizationId,
          enterpriseId,
          moduleKey: 'pos',
          eventType: 'pos.sale.posted',
          payload: salePayload,
        })
        .catch((error) => {
          const message = error instanceof Error ? error.stack ?? error.message : String(error);
          this.logger.error(`Failed to enqueue POS sale posted event ${sale.id}: ${message}`);
        });
    } catch (error) {
      const message = error instanceof Error ? error.stack ?? error.message : String(error);
      this.logger.error(`Failed to emit POS sale event ${sale.id}: ${message}`);
    }
  }

  private resolveEnterpriseId(companyId: string): string {
    const company = this.companiesService.getCompany(companyId);
    const enterpriseId = company.defaultEnterpriseId ?? company.enterprises?.[0]?.id ?? '';
    if (!enterpriseId) {
      throw new BadRequestException('Enterprise not resolved for POS inventory operations');
    }
    return enterpriseId;
  }

  private ensureEnterprise(companyId: string, enterpriseId: string): void {
    const resolved = this.resolveEnterpriseId(companyId);
    if (resolved !== enterpriseId) {
      throw new BadRequestException('Enterprise does not match company context');
    }
  }

  private emitSessionOpened(payload: PosSessionEventPayload): void {
    try {
      void this.outboxService
        .add({
          organizationId: payload.OrganizationId,
          enterpriseId: payload.enterpriseId,
          moduleKey: 'pos',
          eventType: 'pos.session.opened',
          payload,
        })
        .catch((error) => {
          const message = error instanceof Error ? error.stack ?? error.message : String(error);
          this.logger.error(`Failed to enqueue POS session opened event ${payload.sessionId}: ${message}`);
        });
    } catch (error) {
      const message = error instanceof Error ? error.stack ?? error.message : String(error);
      this.logger.error(`Failed to emit POS session opened event ${payload.sessionId}: ${message}`);
    }
  }

  private emitSessionClosed(payload: PosSessionEventPayload): void {
    try {
      void this.outboxService
        .add({
          organizationId: payload.OrganizationId,
          enterpriseId: payload.enterpriseId,
          moduleKey: 'pos',
          eventType: 'pos.session.closed',
          payload,
        })
        .catch((error) => {
          const message = error instanceof Error ? error.stack ?? error.message : String(error);
          this.logger.error(`Failed to enqueue POS session closed event ${payload.sessionId}: ${message}`);
        });
    } catch (error) {
      const message = error instanceof Error ? error.stack ?? error.message : String(error);
      this.logger.error(`Failed to emit POS session closed event ${payload.sessionId}: ${message}`);
    }
  }

  private emitSaleDomainEvent(
    sale: SaleRecord,
    eventType: 'pos.sale.created' | 'pos.sale.posted' | 'pos.sale.voided',
    totals: { subtotal: number; tax: number; discount: number; grandTotal: number },
  ): void {
    const payload: PosSaleEventPayload = {
      saleId: sale.id,
      status: sale.status,
      totals,
      payment: sale.payments[0]
        ? { method: sale.payments[0].method, amount: sale.payments[0].amount }
        : null,
      lines: sale.lines.map((line) => ({
        productId: line.variantId,
        qty: line.quantity,
        unitPrice: line.unitPrice,
        total: line.total,
      })),
      currency: sale.currency,
      occurredAt: (sale.updatedAt ?? sale.createdAt).toISOString(),
      companyId: sale.companyId,
      enterpriseId: sale.enterpriseId,
      warehouseId: sale.warehouseId,
      terminalId: sale.terminalId,
    };

    void this.outboxService
      .add({
        organizationId: sale.OrganizationId,
        enterpriseId: sale.enterpriseId,
        moduleKey: 'pos',
        eventType,
        payload,
      })
      .catch((error) => {
        const message = error instanceof Error ? error.stack ?? error.message : String(error);
        this.logger.error(`Failed to enqueue POS sale event ${sale.id}: ${message}`);
      });
  }

  private calculateSaleTotals(lines: CreatePosSaleDto['lines']) {
    const subtotal = lines.reduce((acc, line) => acc + line.qty * line.unitPrice, 0);
    const tax = lines.reduce((acc, line) => acc + (line.taxRate ? (line.qty * line.unitPrice * line.taxRate) / 100 : 0), 0);
    return {
      subtotal,
      tax,
      discount: 0,
      grandTotal: subtotal + tax,
    };
  }

  private calculateSaleTotalsFromSale(sale: SaleRecord) {
    const subtotal = sale.lines.reduce((acc, line) => acc + line.quantity * line.unitPrice, 0);
    return {
      subtotal,
      tax: 0,
      discount: sale.discountTotal,
      grandTotal: sale.total,
    };
  }

  private validateStockAvailability(sale: SaleRecord): void {
    sale.lines.forEach((line) => {
      const projection = this.inventoryService.listStock({
        variantId: line.variantId,
        warehouseId: sale.warehouseId,
        enterpriseId: sale.enterpriseId,
      })[0];
      if (!projection) {
        throw new BadRequestException('Stock not found for sale line');
      }
      if (projection.available < line.quantity) {
        throw new BadRequestException('Insufficient stock to post sale');
      }
    });
  }

  private validatePayments(sale: SaleRecord): void {
    const totalPaid = sale.payments.reduce((acc, payment) => acc + payment.amount, 0);
    if (totalPaid < sale.total) {
      throw new BadRequestException('Insufficient payment to confirm sale');
    }
  }

  private findSession(sessionId: string): PosSessionRecord {
    const session = this.sessions.find((item) => item.id === sessionId);
    if (!session) {
      throw new NotFoundException('POS session not found');
    }
    return session;
  }

  private findSale(saleId: string): SaleRecord {
    const sale = this.sales.find((item) => item.id === saleId);
    if (!sale) {
      throw new NotFoundException('Sale not found');
    }
    return sale;
  }
}

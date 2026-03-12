import { BadRequestException, Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { InventoryDirection } from '../inventory/entities/inventory-movement.entity';
import { InventoryService } from '../inventory/inventory.service';
import { ModuleStateService } from '../../core/database/module-state.service';
import { ProductsService } from '../products/products.service';
import { CompaniesService } from '../companies/companies.service';
import { OutboxService } from '../outbox/outbox.service';
import { UsersService } from '../users/users.service';
import { WarehousesService } from '../warehouses/warehouses.service';
import type { JsonObject } from '../../core/events/business-event';
import { CreatePosPaymentDto, CreatePosSaleDto, CreatePosSaleLineDto } from './dto/create-pos-sale.dto';
import { CreatePosConfigDto } from './dto/create-pos-config.dto';
import { UpdatePosConfigDto } from './dto/update-pos-config.dto';
import { OpenPosSessionDto } from './dto/open-pos-session.dto';
import { ClosePosSessionDto } from './dto/close-pos-session.dto';
import { PosSaleActionDto } from './dto/pos-sale-action.dto';
import { ActivePosSessionQueryDto } from './dto/active-pos-session.dto';
import { PosConfigListQueryDto } from './dto/pos-config-list-query.dto';
import { CreatePosCashMovementDto } from './dto/create-pos-cash-movement.dto';
import { PosCashMovementListQueryDto } from './dto/pos-cash-movement-list-query.dto';
import { PosSessionSummaryDto } from './dto/pos-session-summary.dto';
import { PaymentMethod, PaymentRecord } from './entities/payment.entity';
import { PosCashMovementRecord, PosCashMovementType } from './entities/pos-cash-movement.entity';
import { PosConfigRecord } from './entities/pos-config.entity';
import { PosDenominationType, PosSessionDenominationRecord } from './entities/pos-session-denomination.entity';
import { PosSessionRecord, PosSessionStatus } from './entities/pos-session.entity';
import { SaleRecord, SaleStatus } from './entities/sale.entity';
import { SaleLineRecord } from './entities/sale-line.entity';

interface PosState {
  sessions: PosSessionRecord[];
  sales: SaleRecord[];
  configs: PosConfigRecord[];
  cashMovements: PosCashMovementRecord[];
}

interface PosSaleCompletedPayload extends JsonObject {
  saleId: string;
  status: SaleStatus;
  totals: {
    subtotal: number;
    discount: number;
    grandTotal: number;
  };
  payment: {
    method: string;
    amount: number;
  } | null;
  lines: Array<{
    variantId: string;
    qty: number;
    unitPrice: number;
    total: number;
  }>;
  currency: string;
  occurredAt: string;
  companyId: string;
  enterpriseId: string;
  warehouseId: string;
}


@Injectable()
export class PosService implements OnModuleInit {
  private readonly logger = new Logger(PosService.name);
  private readonly stateKey = 'module:pos';
  private sessions: PosSessionRecord[] = [];
  private sales: SaleRecord[] = [];
  private configs: PosConfigRecord[] = [];
  private cashMovements: PosCashMovementRecord[] = [];

  constructor(
    private readonly inventoryService: InventoryService,
    private readonly moduleState: ModuleStateService,
    private readonly productsService: ProductsService,
    private readonly companiesService: CompaniesService,
    private readonly outboxService: OutboxService,
    private readonly usersService: UsersService,
    private readonly warehousesService: WarehousesService,
  ) {}

  async onModuleInit(): Promise<void> {
    const state = await this.moduleState.loadState<PosState>(this.stateKey, {
      sessions: [],
      sales: [],
      configs: [],
      cashMovements: [],
    });
    this.sessions = state.sessions ?? [];
    this.sales = state.sales ?? [];
    this.configs = state.configs ?? [];
    this.cashMovements = state.cashMovements ?? [];
  }

  async createConfig(dto: CreatePosConfigDto): Promise<PosConfigRecord> {
    this.ensureEnterprise(dto.companyId, dto.enterpriseId);
    await this.ensureUsersExist(dto.allowedUserIds);
    const warehouse = this.ensureWarehouse(dto.warehouseId, dto.OrganizationId, dto.enterpriseId);
    this.ensureCurrencyAllowed(dto.companyId, dto.enterpriseId, dto.currencyId);

    const code = this.normalizeCode(dto.code);
    const name = this.normalizeName(dto.name, 'El nombre del POS es requerido.');
    const existing = this.configs.find(
      (config) =>
        config.OrganizationId === dto.OrganizationId &&
        config.enterpriseId === dto.enterpriseId &&
        config.code === code,
    );
    if (existing) {
      throw new BadRequestException('Ya existe un POS con ese codigo.');
    }

    const now = new Date();
    const record: PosConfigRecord = {
      id: uuid(),
      name,
      code,
      OrganizationId: dto.OrganizationId,
      companyId: dto.companyId,
      enterpriseId: dto.enterpriseId,
      warehouseId: warehouse.id,
      currencyId: dto.currencyId,
      active: dto.active ?? true,
      allowedPaymentMethods: this.normalizePaymentMethods(dto.allowedPaymentMethods),
      allowedUserIds: this.normalizeUserIds(dto.allowedUserIds),
      requiresOpening: dto.requiresOpening ?? true,
      allowOtherUsersClose: dto.allowOtherUsersClose ?? false,
      notes: dto.notes?.trim() || undefined,
      createdAt: now,
      updatedAt: now,
    };
    this.configs.push(record);
    this.persistState();
    return record;
  }

  listConfigs(query: PosConfigListQueryDto = {}): PosConfigRecord[] {
    return this.configs.filter((config) => {
      if (query.OrganizationId && config.OrganizationId !== query.OrganizationId) return false;
      if (query.companyId && config.companyId !== query.companyId) return false;
      if (query.enterpriseId && config.enterpriseId !== query.enterpriseId) return false;
      if (query.warehouseId && config.warehouseId !== query.warehouseId) return false;
      if (query.active !== undefined && config.active !== query.active) return false;
      return true;
    });
  }

  getConfig(id: string): PosConfigRecord {
    const config = this.configs.find((item) => item.id === id);
    if (!config) {
      throw new NotFoundException('POS no encontrado.');
    }
    return config;
  }

  async updateConfig(id: string, dto: UpdatePosConfigDto): Promise<PosConfigRecord> {
    const config = this.getConfig(id);

    if (dto.OrganizationId && dto.OrganizationId !== config.OrganizationId) {
      throw new BadRequestException('OrganizationId no puede cambiarse.');
    }
    if (dto.companyId && dto.companyId !== config.companyId) {
      throw new BadRequestException('CompanyId no puede cambiarse.');
    }
    if (dto.enterpriseId && dto.enterpriseId !== config.enterpriseId) {
      throw new BadRequestException('EnterpriseId no puede cambiarse.');
    }

    const nextCode = dto.code ? this.normalizeCode(dto.code) : config.code;
    const duplicate = this.configs.find(
      (item) =>
        item.id !== config.id &&
        item.OrganizationId === config.OrganizationId &&
        item.enterpriseId === config.enterpriseId &&
        item.code === nextCode,
    );
    if (duplicate) {
      throw new BadRequestException('Ya existe un POS con ese codigo.');
    }

    let warehouseId = config.warehouseId;
    if (dto.warehouseId) {
      const warehouse = this.ensureWarehouse(dto.warehouseId, config.OrganizationId, config.enterpriseId);
      warehouseId = warehouse.id;
    }

    if (dto.currencyId) {
      this.ensureCurrencyAllowed(config.companyId, config.enterpriseId, dto.currencyId);
    }

    if (dto.allowedUserIds) {
      await this.ensureUsersExist(dto.allowedUserIds);
    }

    const next: PosConfigRecord = {
      ...config,
      name: dto.name ? this.normalizeName(dto.name, 'El nombre del POS es requerido.') : config.name,
      code: nextCode,
      warehouseId,
      currencyId: dto.currencyId ?? config.currencyId,
      active: dto.active ?? config.active,
      allowedPaymentMethods: dto.allowedPaymentMethods
        ? this.normalizePaymentMethods(dto.allowedPaymentMethods)
        : config.allowedPaymentMethods,
      allowedUserIds: dto.allowedUserIds ? this.normalizeUserIds(dto.allowedUserIds) : config.allowedUserIds,
      requiresOpening: dto.requiresOpening ?? config.requiresOpening,
      allowOtherUsersClose: dto.allowOtherUsersClose ?? config.allowOtherUsersClose,
      notes: dto.notes?.trim() || config.notes,
      updatedAt: new Date(),
    };

    const index = this.configs.findIndex((item) => item.id === config.id);
    if (index !== -1) {
      this.configs[index] = next;
    }
    this.persistState();
    return next;
  }

  removeConfig(id: string): void {
    const config = this.getConfig(id);
    if (!config.active) {
      return;
    }
    config.active = false;
    config.updatedAt = new Date();
    this.persistState();
  }

  listAvailableConfigsForUser(userId: string, query: PosConfigListQueryDto = {}): PosConfigRecord[] {
    if (!userId) {
      return [];
    }
    return this.listConfigs(query).filter(
      (config) => config.active && config.allowedUserIds.includes(userId),
    );
  }

  openSession(dto: OpenPosSessionDto): PosSessionRecord {
    const config = this.getConfig(dto.posConfigId);
    this.ensureEnterprise(config.companyId, config.enterpriseId);
    this.ensureUserAccess(dto.cashierUserId, config);
    this.ensureWarehouseMatch(config);
    if (dto.OrganizationId !== config.OrganizationId) {
      throw new BadRequestException('OrganizationId no coincide con el POS configurado.');
    }
    if (dto.companyId !== config.companyId) {
      throw new BadRequestException('CompanyId no coincide con el POS configurado.');
    }
    if (dto.enterpriseId !== config.enterpriseId) {
      throw new BadRequestException('EnterpriseId no coincide con el POS configurado.');
    }
    if (dto.warehouseId !== config.warehouseId) {
      throw new BadRequestException('El almacen no coincide con el POS configurado.');
    }

    const denominations = this.normalizeDenominations(dto.openingDenominations ?? [], config.currencyId, 'opening');
    if (config.requiresOpening && denominations.length === 0) {
      throw new BadRequestException('Se requiere apertura por denominaciones para este POS.');
    }
    const openingAmount = denominations.length > 0 ? this.calculateDenominationsTotal(denominations) : (dto.openingAmount ?? 0);

    const existing = this.sessions.find(
      (session) =>
        session.OrganizationId === config.OrganizationId &&
        session.companyId === config.companyId &&
        session.enterpriseId === config.enterpriseId &&
        session.cashierUserId === dto.cashierUserId &&
        session.status === PosSessionStatus.OPEN,
    );
    if (existing) {
      throw new BadRequestException('Ya existe una sesion abierta para este cajero.');
    }

    const warehouseBusy = this.sessions.find(
      (session) =>
        session.OrganizationId === config.OrganizationId &&
        session.companyId === config.companyId &&
        session.enterpriseId === config.enterpriseId &&
        session.warehouseId === config.warehouseId &&
        session.status === PosSessionStatus.OPEN,
    );
    if (warehouseBusy) {
      throw new BadRequestException('El almacen ya tiene una sesion abierta.');
    }

    const now = new Date();
    const sessionId = uuid();
    const session: PosSessionRecord = {
      id: sessionId,
      posConfigId: config.id,
      OrganizationId: config.OrganizationId,
      companyId: config.companyId,
      enterpriseId: config.enterpriseId,
      warehouseId: config.warehouseId,
      cashierUserId: dto.cashierUserId,
      openedByUserId: dto.cashierUserId,
      status: PosSessionStatus.OPEN,
      openingAmount,
      openingDenominations: denominations.length > 0 ? denominations.map((item) => ({ ...item, sessionId })) : undefined,
      openedAt: now,
      notes: dto.notes?.trim() || undefined,
      createdAt: now,
      updatedAt: now,
    };
    this.sessions.push(session);
    this.persistState();
    return session;
  }

  getActiveSession(dto: ActivePosSessionQueryDto): PosSessionRecord | null {
    return (
      this.sessions.find(
        (session) =>
          session.OrganizationId === dto.OrganizationId &&
          session.companyId === dto.companyId &&
          session.enterpriseId === dto.enterpriseId &&
          session.cashierUserId === dto.cashierUserId &&
          session.status === PosSessionStatus.OPEN &&
          (!dto.posConfigId || session.posConfigId === dto.posConfigId),
      ) ?? null
    );
  }

  getSessionSummary(
    sessionId: string,
    context: { OrganizationId: string; companyId: string; enterpriseId: string },
  ): PosSessionSummaryDto {
    const session = this.sessions.find((item) => item.id === sessionId);
    if (!session) {
      throw new NotFoundException('Sesion POS no encontrada.');
    }
    if (session.OrganizationId !== context.OrganizationId || session.companyId !== context.companyId || session.enterpriseId !== context.enterpriseId) {
      throw new BadRequestException('La sesion no pertenece al contexto proporcionado.');
    }

    const sales = this.sales.filter(
      (sale) => sale.sessionId === sessionId && sale.status === SaleStatus.COMPLETED,
    );
    const paymentsByMethod = {
      [PaymentMethod.CASH]: 0,
      [PaymentMethod.CARD]: 0,
      [PaymentMethod.TRANSFER]: 0,
      [PaymentMethod.VOUCHER]: 0,
    } as Record<PaymentMethod, number>;

    let totalSales = 0;
    sales.forEach((sale) => {
      totalSales += sale.total;
      sale.payments.forEach((payment) => {
        if (paymentsByMethod[payment.method] !== undefined) {
          paymentsByMethod[payment.method] += payment.amount;
        }
      });
    });

    const cashPayments = paymentsByMethod[PaymentMethod.CASH] ?? 0;
    const expectedClosingAmount = this.calculateExpectedClosingAmount(sessionId);
    const cashMovements = this.calculateCashMovementsTotal(sessionId);
    const currency = sales[0]?.currency ?? this.getConfig(session.posConfigId).currencyId;

    return {
      sessionId,
      currency,
      openingAmount: session.openingAmount,
      expectedClosingAmount,
      totalSales,
      cashPayments,
      paymentsByMethod,
      cashMovements,
      openingDenominations: session.openingDenominations,
    };
  }

  closeSession(dto: ClosePosSessionDto): PosSessionRecord {
    const session = this.sessions.find((item) => item.id === dto.sessionId);
    if (!session) {
      throw new NotFoundException('Sesion POS no encontrada.');
    }
    if (session.status !== PosSessionStatus.OPEN) {
      throw new BadRequestException('La sesion POS no esta abierta.');
    }
    if (session.companyId !== dto.companyId || session.enterpriseId !== dto.enterpriseId) {
      throw new BadRequestException('La sesion no pertenece a la compania/empresa proporcionada.');
    }

    const config = this.getConfig(session.posConfigId);
    const closingUserId = dto.cashierUserId;
    if (session.cashierUserId !== closingUserId && !config.allowOtherUsersClose) {
      throw new BadRequestException('Solo el cajero que abrio la sesion puede cerrarla.');
    }

    const closingDenominations = this.normalizeDenominations(
      dto.closingDenominations ?? [],
      config.currencyId,
      'closing',
    );
    if (closingDenominations.length === 0) {
      throw new BadRequestException('Se requiere cierre por denominaciones.');
    }

    const expected = this.calculateExpectedClosingAmount(session.id);
    const counted = this.calculateDenominationsTotal(closingDenominations);
    const difference = counted - expected;
    if (difference !== 0 && !dto.notes?.trim()) {
      throw new BadRequestException('Se requiere observación si existe diferencia de caja.');
    }

    session.status = PosSessionStatus.CLOSED;
    session.expectedClosingAmount = expected;
    session.countedClosingAmount = counted;
    session.differenceAmount = difference;
    session.closingDenominations = closingDenominations.map((item) => ({ ...item, sessionId: session.id }));
    session.closedByUserId = closingUserId;
    session.closedAt = new Date();
    session.notes = dto.notes?.trim() || session.notes;
    session.updatedAt = new Date();
    this.persistState();
    return session;
  }

  createCashMovement(dto: CreatePosCashMovementDto): PosCashMovementRecord {
    const session = this.sessions.find((item) => item.id === dto.sessionId);
    if (!session) {
      throw new NotFoundException('Sesion POS no encontrada.');
    }
    if (session.status !== PosSessionStatus.OPEN) {
      throw new BadRequestException('La sesion POS no esta abierta.');
    }
    if (
      dto.OrganizationId !== session.OrganizationId ||
      dto.companyId !== session.companyId ||
      dto.enterpriseId !== session.enterpriseId
    ) {
      throw new BadRequestException('El movimiento no coincide con el contexto de la sesion.');
    }
    if (dto.createdByUserId !== session.cashierUserId) {
      this.ensureUserAccess(dto.createdByUserId, this.getConfig(session.posConfigId));
    }
    if (dto.paymentMethod !== PaymentMethod.CASH) {
      throw new BadRequestException('Los movimientos de caja deben ser en efectivo.');
    }
    if (dto.currencyId !== this.getConfig(session.posConfigId).currencyId) {
      throw new BadRequestException('La moneda del movimiento no coincide con el POS.');
    }
    if (!Number.isFinite(dto.amount) || dto.amount === 0) {
      throw new BadRequestException('El monto del movimiento no es valido.');
    }

    const signedAmount = this.getSignedMovementAmount(dto.type, dto.amount);
    if (signedAmount === 0) {
      throw new BadRequestException('El monto del movimiento no es valido.');
    }

    const now = new Date();
    const record: PosCashMovementRecord = {
      id: uuid(),
      sessionId: session.id,
      type: dto.type,
      amount: signedAmount,
      currencyId: dto.currencyId,
      paymentMethod: dto.paymentMethod,
      reason: dto.reason.trim(),
      notes: dto.notes?.trim() || undefined,
      createdByUserId: dto.createdByUserId,
      createdAt: now,
    };
    this.cashMovements.push(record);
    this.persistState();
    return record;
  }

  listCashMovements(query: PosCashMovementListQueryDto): PosCashMovementRecord[] {
    if (!query.sessionId) {
      return [];
    }
    const session = this.sessions.find((item) => item.id === query.sessionId);
    if (!session) {
      throw new NotFoundException('Sesion POS no encontrada.');
    }
    if (
      session.OrganizationId !== query.OrganizationId ||
      session.companyId !== query.companyId ||
      session.enterpriseId !== query.enterpriseId
    ) {
      throw new BadRequestException('La sesion no pertenece al contexto proporcionado.');
    }
    return this.cashMovements.filter((movement) => movement.sessionId === query.sessionId);
  }

  async searchVariants(query: { OrganizationId: string; enterpriseId: string; companyId?: string; q: string }) {
    return this.productsService.searchForPos(
      {
        OrganizationId: query.OrganizationId,
        enterpriseId: query.enterpriseId,
        companyId: query.companyId,
        q: query.q,
      },
      query.OrganizationId,
    );
  }

  async findVariantByCode(query: { OrganizationId: string; enterpriseId: string; companyId?: string; code: string }) {
    return this.productsService.findByCodeForPos(
      {
        OrganizationId: query.OrganizationId,
        enterpriseId: query.enterpriseId,
        companyId: query.companyId,
        code: query.code,
      },
      query.OrganizationId,
    );
  }

  createSale(dto: CreatePosSaleDto): SaleRecord {
    this.ensureEnterprise(dto.companyId, dto.enterpriseId);
    const session = this.ensureSessionOpen(dto.sessionId, dto.cashierUserId, dto.enterpriseId);
    const config = this.getConfig(session.posConfigId);
    if (!config.active) {
      throw new BadRequestException('El POS configurado no esta activo.');
    }
    if (dto.OrganizationId !== session.OrganizationId || dto.companyId !== session.companyId) {
      throw new BadRequestException('La venta no coincide con la organizacion o compania de la sesion.');
    }
    if (session.warehouseId !== dto.warehouseId) {
      throw new BadRequestException('El almacen de la sesion no coincide con el de la venta.');
    }
    if (dto.lines.length === 0) {
      throw new BadRequestException('La venta debe incluir al menos una linea.');
    }

    const totals = this.calculateTotals(dto.lines);
    const payments = dto.payments ?? [];
    if (payments.length === 0) {
      throw new BadRequestException('Se requiere un pago para confirmar la venta.');
    }
    const disallowed = payments.find((payment) => !config.allowedPaymentMethods.includes(payment.method));
    if (disallowed) {
      throw new BadRequestException('El metodo de pago no esta permitido para este POS.');
    }

    const sale: SaleRecord = {
      id: uuid(),
      OrganizationId: dto.OrganizationId,
      companyId: dto.companyId,
      enterpriseId: dto.enterpriseId,
      warehouseId: dto.warehouseId,
      sessionId: dto.sessionId,
      cashierUserId: dto.cashierUserId,
      customerId: dto.customerId,
      currency: dto.currency ?? 'USD',
      status: SaleStatus.DRAFT,
      subtotal: totals.subtotal,
      discountTotal: totals.discount,
      total: totals.grandTotal,
      lines: dto.lines.map((line) => this.mapSaleLine(line)),
      payments: payments.map((payment) => this.mapPayment(payment, dto)),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.sales.push(sale);
    this.persistState();
    return sale;
  }

  postSale(saleId: string, dto: PosSaleActionDto): SaleRecord {
    this.ensureEnterprise(dto.companyId, dto.enterpriseId);
    const sale = this.findSale(saleId);
    if (sale.status !== SaleStatus.DRAFT) {
      throw new BadRequestException('La venta no esta en borrador.');
    }
    if (sale.companyId !== dto.companyId || sale.enterpriseId !== dto.enterpriseId) {
      throw new BadRequestException('La venta no pertenece a la compania/empresa proporcionada.');
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
    this.emitSaleCompletedEvent(sale);
    return sale;
  }

  listRecentSales(filters: {
    OrganizationId?: string;
    companyId?: string;
    enterpriseId?: string;
    limit?: number;
  } = {}): SaleRecord[] {
    const result = this.sales.filter((sale) => {
      if (filters.OrganizationId && sale.OrganizationId !== filters.OrganizationId) return false;
      if (filters.companyId && sale.companyId !== filters.companyId) return false;
      if (filters.enterpriseId && sale.enterpriseId !== filters.enterpriseId) return false;
      return true;
    });
    const limit = Math.max(1, Math.min(filters.limit ?? 20, 100));
    return result.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, limit);
  }

  private ensureSessionOpen(sessionId: string, cashierUserId: string, enterpriseId: string): PosSessionRecord {
    const session = this.sessions.find((item) => item.id === sessionId);
    if (!session) {
      throw new NotFoundException('Sesion POS no encontrada.');
    }
    if (session.status !== PosSessionStatus.OPEN) {
      throw new BadRequestException('La sesion POS ya esta cerrada.');
    }
    if (session.cashierUserId !== cashierUserId || session.enterpriseId !== enterpriseId) {
      throw new BadRequestException('La sesion no coincide con el cajero o la empresa.');
    }
    const config = this.getConfig(session.posConfigId);
    if (!config.active) {
      throw new BadRequestException('El POS configurado no esta activo.');
    }
    return session;
  }

  private validateStockAvailability(sale: SaleRecord): void {
    sale.lines.forEach((line) => {
      const projection = this.inventoryService.listStock({
        variantId: line.variantId,
        enterpriseId: sale.enterpriseId,
        warehouseId: sale.warehouseId,
      })[0];
      if (!projection) {
        throw new BadRequestException('No se encontro proyeccion de stock para una linea.');
      }
      if (projection.available < line.quantity) {
        throw new BadRequestException('Stock insuficiente para confirmar la venta.');
      }
    });
  }

  private validatePayments(sale: SaleRecord): void {
    if (sale.payments.length === 0) {
      throw new BadRequestException('Se requiere un pago para confirmar la venta.');
    }
    const totalPaid = sale.payments.reduce((acc, payment) => acc + payment.amount, 0);
    if (totalPaid < sale.total) {
      throw new BadRequestException('Pago insuficiente para confirmar la venta.');
    }
  }

  private calculateTotals(lines: CreatePosSaleDto['lines']): {
    subtotal: number;
    discount: number;
    grandTotal: number;
  } {
    const subtotal = lines.reduce((acc, line) => acc + line.qty * line.unitPrice, 0);
    return {
      subtotal,
      discount: 0,
      grandTotal: subtotal,
    };
  }

  private mapSaleLine(line: CreatePosSaleLineDto): SaleLineRecord {
    return {
      id: uuid(),
      variantId: line.variantId,
      quantity: line.qty,
      unitPrice: line.unitPrice,
      discountAmount: 0,
      total: line.qty * line.unitPrice,
    };
  }

  private mapPayment(payment: CreatePosPaymentDto, dto: CreatePosSaleDto): PaymentRecord {
    return {
      id: uuid(),
      method: payment.method,
      amount: payment.amount,
      currency: dto.currency ?? 'USD',
      OrganizationId: dto.OrganizationId,
      companyId: dto.companyId,
    };
  }

  private ensureEnterprise(companyId: string, enterpriseId: string): void {
    const company = this.companiesService.getCompany(companyId);
    const enterpriseIds = (company.enterprises ?? []).map((item) => item.id);
    const resolved = company.defaultEnterpriseId ?? enterpriseIds[0] ?? '';
    const allowed = resolved === enterpriseId || enterpriseIds.includes(enterpriseId);
    if (!allowed) {
      throw new BadRequestException('EnterpriseId no coincide con la compania.');
    }
  }

  private findSale(saleId: string): SaleRecord {
    const sale = this.sales.find((item) => item.id === saleId);
    if (!sale) {
      throw new NotFoundException('Venta no encontrada.');
    }
    return sale;
  }

  private normalizeName(value: string | undefined, message: string): string {
    const name = value?.trim();
    if (!name) {
      throw new BadRequestException(message);
    }
    return name;
  }

  private normalizeCode(value: string | undefined): string {
    const code = value?.trim().toUpperCase();
    if (!code) {
      throw new BadRequestException('El codigo del POS es requerido.');
    }
    return code;
  }

  private normalizeUserIds(ids: string[]): string[] {
    const unique = Array.from(new Set(ids.map((id) => id.trim()).filter(Boolean)));
    if (unique.length === 0) {
      throw new BadRequestException('Debes asignar al menos un usuario permitido.');
    }
    return unique;
  }

  private normalizePaymentMethods(methods: PaymentMethod[]): PaymentMethod[] {
    const normalized = Array.from(new Set(methods));
    if (normalized.length === 0) {
      throw new BadRequestException('Debes asignar al menos un metodo de pago permitido.');
    }
    return normalized;
  }

  private async ensureUsersExist(ids: string[]): Promise<void> {
    const normalized = this.normalizeUserIds(ids);
    const resolved = await this.usersService.resolveUsers(normalized);
    const resolvedIds = new Set(resolved.map((user) => user.id));
    const missing = normalized.filter((id) => !resolvedIds.has(id));
    if (missing.length > 0) {
      throw new BadRequestException(`Usuarios no encontrados: ${missing.join(', ')}`);
    }
  }

  private ensureWarehouse(warehouseId: string, organizationId: string, enterpriseId: string) {
    const warehouse = this.warehousesService.findOne(warehouseId);
    if (warehouse.organizationId !== organizationId) {
      throw new BadRequestException('El almacén no pertenece a la organización.');
    }
    if (warehouse.enterpriseId !== enterpriseId) {
      throw new BadRequestException('El almacén no pertenece a la empresa.');
    }
    return warehouse;
  }

  private ensureWarehouseMatch(config: PosConfigRecord): void {
    this.ensureWarehouse(config.warehouseId, config.OrganizationId, config.enterpriseId);
  }

  private ensureCurrencyAllowed(companyId: string, enterpriseId: string, currencyId: string): void {
    const company = this.companiesService.getCompany(companyId);
    const enterprise = (company.enterprises ?? []).find((item) => item.id === enterpriseId);
    if (!enterprise) {
      throw new BadRequestException('Empresa no encontrada para la compañía.');
    }
    const allowed = new Set<string>();
    (enterprise.currencyIds ?? []).forEach((id) => allowed.add(id));
    if (enterprise.defaultCurrencyId) {
      allowed.add(enterprise.defaultCurrencyId);
    }
    (company.currencies ?? []).forEach((id) => allowed.add(id));
    if (company.baseCurrencyId) {
      allowed.add(company.baseCurrencyId);
    }
    if (!allowed.has(currencyId)) {
      throw new BadRequestException('Moneda no permitida para la empresa.');
    }
  }

  private ensureUserAccess(userId: string, config: PosConfigRecord): void {
    if (!config.allowedUserIds.includes(userId)) {
      throw new BadRequestException('Usuario no autorizado para este POS.');
    }
  }

  private normalizeDenominations(
    denominations: Array<{
      currencyId: string;
      denominationValue: number;
      denominationType: PosDenominationType;
      quantity: number;
    }>,
    currencyId: string,
    stage: 'opening' | 'closing',
  ): Array<Omit<PosSessionDenominationRecord, 'sessionId'>> {
    if (!denominations || denominations.length === 0) {
      return [];
    }

    const normalized = new Map<string, Omit<PosSessionDenominationRecord, 'sessionId'>>();

    denominations.forEach((item) => {
      if (item.currencyId !== currencyId) {
        throw new BadRequestException('La moneda de las denominaciones no coincide con el POS.');
      }
      if (!Number.isFinite(item.denominationValue) || item.denominationValue <= 0) {
        throw new BadRequestException('Las denominaciones deben tener un valor positivo.');
      }
      if (!Number.isFinite(item.quantity) || item.quantity < 0) {
        throw new BadRequestException('Las cantidades de denominaciones no son válidas.');
      }

      const quantity = Math.floor(item.quantity);
      if (quantity === 0) {
        return;
      }

      const key = `${item.denominationType}-${item.denominationValue}`;
      const existing = normalized.get(key);
      const nextQuantity = (existing?.quantity ?? 0) + quantity;
      const subtotal = item.denominationValue * nextQuantity;

      normalized.set(key, {
        stage,
        currencyId: item.currencyId,
        denominationValue: item.denominationValue,
        denominationType: item.denominationType,
        quantity: nextQuantity,
        subtotal,
      });
    });

    return Array.from(normalized.values());
  }

  private calculateDenominationsTotal(
    denominations: Array<Omit<PosSessionDenominationRecord, 'sessionId'>>,
  ): number {
    return denominations.reduce((acc, item) => acc + item.subtotal, 0);
  }

  private getSignedMovementAmount(type: PosCashMovementType, amount: number): number {
    const safeAmount = Math.abs(amount);
    switch (type) {
      case PosCashMovementType.INCOME:
      case PosCashMovementType.FLOAT:
        return safeAmount;
      case PosCashMovementType.EXPENSE:
      case PosCashMovementType.WITHDRAWAL:
        return -safeAmount;
      case PosCashMovementType.ADJUSTMENT:
        return amount;
      default:
        return amount;
    }
  }

  private calculateCashMovementsTotal(sessionId: string): number {
    return this.cashMovements
      .filter((movement) => movement.sessionId === sessionId)
      .reduce((acc, movement) => acc + movement.amount, 0);
  }

  private calculateExpectedClosingAmount(sessionId: string): number {
    const session = this.sessions.find((item) => item.id === sessionId);
    if (!session) {
      return 0;
    }
    const totalCash = this.sales
      .filter((sale) => sale.sessionId === sessionId && sale.status === SaleStatus.COMPLETED)
      .reduce((acc, sale) => {
        const cashPayments = sale.payments
          .filter((payment) => payment.method === PaymentMethod.CASH)
          .reduce((sum, payment) => sum + payment.amount, 0);
        return acc + cashPayments;
      }, 0);
    const cashMovements = this.calculateCashMovementsTotal(sessionId);
    return session.openingAmount + totalCash + cashMovements;
  }

  private persistState(): void {
    void this.moduleState
      .saveState<PosState>(this.stateKey, {
        sessions: this.sessions,
        sales: this.sales,
        configs: this.configs,
        cashMovements: this.cashMovements,
      })
      .catch((error) => {
        const message = error instanceof Error ? error.stack ?? error.message : String(error);
        this.logger.error(`No se pudo persistir el estado POS: ${message}`);
      });
  }

  private emitSaleCompletedEvent(sale: SaleRecord): void {
    try {
      const payment = sale.payments[0]
        ? { method: sale.payments[0].method, amount: sale.payments[0].amount }
        : null;
      const payload: PosSaleCompletedPayload = {
        saleId: sale.id,
        status: sale.status,
        totals: {
          subtotal: sale.subtotal,
          discount: sale.discountTotal,
          grandTotal: sale.total,
        },
        payment,
        lines: sale.lines.map((line) => ({
          variantId: line.variantId,
          qty: line.quantity,
          unitPrice: line.unitPrice,
          total: line.total,
        })),
        currency: sale.currency,
        occurredAt: (sale.updatedAt ?? sale.createdAt).toISOString(),
        companyId: sale.companyId,
        enterpriseId: sale.enterpriseId,
        warehouseId: sale.warehouseId,
      };

      void this.outboxService
        .add({
          organizationId: sale.OrganizationId,
          enterpriseId: sale.enterpriseId,
          moduleKey: 'pos',
          eventType: 'pos.sale.completed',
          payload,
        })
        .catch((error) => {
          const message = error instanceof Error ? error.stack ?? error.message : String(error);
          this.logger.error(`No se pudo encolar evento POS ${sale.id}: ${message}`);
        });
    } catch (error) {
      const message = error instanceof Error ? error.stack ?? error.message : String(error);
      this.logger.error(`No se pudo emitir evento POS ${sale.id}: ${message}`);
    }
  }
}

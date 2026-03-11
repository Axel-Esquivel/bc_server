import { BadRequestException, Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { InventoryDirection } from '../inventory/entities/inventory-movement.entity';
import { InventoryService } from '../inventory/inventory.service';
import { ModuleStateService } from '../../core/database/module-state.service';
import { ProductsService } from '../products/products.service';
import { CompaniesService } from '../companies/companies.service';
import { OutboxService } from '../outbox/outbox.service';
import type { JsonObject } from '../../core/events/business-event';
import { CreatePosPaymentDto, CreatePosSaleDto, CreatePosSaleLineDto } from './dto/create-pos-sale.dto';
import { OpenPosSessionDto } from './dto/open-pos-session.dto';
import { ClosePosSessionDto } from './dto/close-pos-session.dto';
import { PosSaleActionDto } from './dto/pos-sale-action.dto';
import { ActivePosSessionQueryDto } from './dto/active-pos-session.dto';
import { PaymentMethod, PaymentRecord } from './entities/payment.entity';
import { PosSessionRecord, PosSessionStatus } from './entities/pos-session.entity';
import { SaleRecord, SaleStatus } from './entities/sale.entity';
import { SaleLineRecord } from './entities/sale-line.entity';

interface PosState {
  sessions: PosSessionRecord[];
  sales: SaleRecord[];
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

  constructor(
    private readonly inventoryService: InventoryService,
    private readonly moduleState: ModuleStateService,
    private readonly productsService: ProductsService,
    private readonly companiesService: CompaniesService,
    private readonly outboxService: OutboxService,
  ) {}

  async onModuleInit(): Promise<void> {
    const state = await this.moduleState.loadState<PosState>(this.stateKey, {
      sessions: [],
      sales: [],
    });
    this.sessions = state.sessions ?? [];
    this.sales = state.sales ?? [];
  }

  openSession(dto: OpenPosSessionDto): PosSessionRecord {
    this.ensureEnterprise(dto.companyId, dto.enterpriseId);

    const existing = this.sessions.find(
      (session) =>
        session.OrganizationId === dto.OrganizationId &&
        session.companyId === dto.companyId &&
        session.enterpriseId === dto.enterpriseId &&
        session.cashierUserId === dto.cashierUserId &&
        session.status === PosSessionStatus.OPEN,
    );
    if (existing) {
      throw new BadRequestException('Ya existe una sesion abierta para este cajero.');
    }

    const warehouseBusy = this.sessions.find(
      (session) =>
        session.OrganizationId === dto.OrganizationId &&
        session.companyId === dto.companyId &&
        session.enterpriseId === dto.enterpriseId &&
        session.warehouseId === dto.warehouseId &&
        session.status === PosSessionStatus.OPEN,
    );
    if (warehouseBusy) {
      throw new BadRequestException('El almacen ya tiene una sesion abierta.');
    }

    const now = new Date();
    const session: PosSessionRecord = {
      id: uuid(),
      OrganizationId: dto.OrganizationId,
      companyId: dto.companyId,
      enterpriseId: dto.enterpriseId,
      warehouseId: dto.warehouseId,
      cashierUserId: dto.cashierUserId,
      status: PosSessionStatus.OPEN,
      openingAmount: dto.openingAmount ?? 0,
      openedAt: now,
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
          session.status === PosSessionStatus.OPEN,
      ) ?? null
    );
  }

  closeSession(dto: ClosePosSessionDto): PosSessionRecord {
    this.ensureEnterprise(dto.companyId, dto.enterpriseId);
    const session = this.sessions.find((item) => item.id === dto.sessionId);
    if (!session) {
      throw new NotFoundException('Sesion POS no encontrada.');
    }
    if (session.status !== PosSessionStatus.OPEN) {
      throw new BadRequestException('La sesion POS ya esta cerrada.');
    }
    if (session.companyId !== dto.companyId || session.enterpriseId !== dto.enterpriseId) {
      throw new BadRequestException('La sesion no pertenece a la compania/empresa proporcionada.');
    }
    if (session.cashierUserId !== dto.cashierUserId) {
      throw new BadRequestException('La sesion no pertenece al cajero.');
    }

    session.status = PosSessionStatus.CLOSED;
    session.closingAmount = dto.closingAmount ?? 0;
    session.closedAt = new Date();
    session.updatedAt = new Date();
    this.persistState();
    return session;
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
    if (payments.some((payment) => payment.method !== PaymentMethod.CASH)) {
      throw new BadRequestException('Solo se permite pago en efectivo en esta fase.');
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

  private persistState(): void {
    void this.moduleState
      .saveState<PosState>(this.stateKey, {
        sessions: this.sessions,
        sales: this.sales,
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

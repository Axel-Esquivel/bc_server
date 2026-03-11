import { BadRequestException, Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { InventoryDirection } from '../inventory/entities/inventory-movement.entity';
import { InventoryService } from '../inventory/inventory.service';
import { ModuleStateService } from '../../core/database/module-state.service';
import { OutboxService } from '../outbox/outbox.service';
import type { JsonObject } from '../../core/events/business-event';
import { OrganizationsService } from '../organizations/organizations.service';
import { CompaniesService } from '../companies/companies.service';
import { CreatePosSaleDto } from './dto/create-pos-sale.dto';
import { OpenPosSessionDto } from './dto/open-pos-session.dto';
import { ClosePosSessionDto } from './dto/close-pos-session.dto';
import { PosSaleActionDto } from './dto/pos-sale-action.dto';
import { PaymentMethod, PaymentRecord } from './entities/payment.entity';
import { PosSessionRecord, PosSessionStatus } from './entities/pos-session.entity';
import { SaleRecord, SaleStatus } from './entities/sale.entity';
import { SaleLineRecord } from './entities/sale-line.entity';

interface PosState {
  sessions: PosSessionRecord[];
  sales: SaleRecord[];
}

interface PosSalePostedPayload extends JsonObject {
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
    private readonly outboxService: OutboxService,
    private readonly organizationsService: OrganizationsService,
    private readonly companiesService: CompaniesService,
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
    const openingAmount = dto.openingAmount ?? 0;

    const existing = this.sessions.find(
      (session) =>
        session.OrganizationId === dto.OrganizationId &&
        session.companyId === dto.companyId &&
        session.enterpriseId === dto.enterpriseId &&
        session.cashierUserId === dto.cashierUserId &&
        session.status === PosSessionStatus.OPEN,
    );
    if (existing) {
      throw new BadRequestException('There is already an open session for this cashier');
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
      openingAmount,
      openedAt: now,
      createdAt: now,
      updatedAt: now,
    };
    this.sessions.push(session);
    this.persistState();
    return session;
  }

  getActiveSession(dto: { OrganizationId: string; companyId: string; enterpriseId: string; cashierUserId: string }) {
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
      throw new NotFoundException('POS session not found');
    }
    if (session.status !== PosSessionStatus.OPEN) {
      throw new BadRequestException('POS session is already closed');
    }
    if (session.companyId !== dto.companyId || session.enterpriseId !== dto.enterpriseId) {
      throw new BadRequestException('Session does not belong to the provided company/enterprise');
    }
    if (session.cashierUserId !== dto.cashierUserId) {
      throw new BadRequestException('Session does not belong to the cashier');
    }

    session.status = PosSessionStatus.CLOSED;
    session.closingAmount = dto.closingAmount ?? 0;
    session.closedAt = new Date();
    session.updatedAt = new Date();
    this.persistState();
    return session;
  }

  createSale(dto: CreatePosSaleDto): SaleRecord {
    this.ensureEnterprise(dto.companyId, dto.enterpriseId);
    const session = this.ensureSessionOpen(dto.sessionId, dto.cashierUserId, dto.enterpriseId);
    if (session.warehouseId !== dto.warehouseId) {
      throw new BadRequestException('Session warehouse does not match sale warehouse');
    }
    if (dto.lines.length === 0) {
      throw new BadRequestException('Sale must contain at least one line');
    }

    const totals = this.calculateTotals(dto.lines);
    const payments = dto.payments ?? [];
    if (payments.some((payment) => payment.method !== PaymentMethod.CASH)) {
      throw new BadRequestException('Only CASH payment is enabled for now');
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
      lines: dto.lines.map((line) => ({
        id: uuid(),
        variantId: line.variantId,
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
        OrganizationId: dto.OrganizationId,
        companyId: dto.companyId,
      })),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.sales.push(sale);
    this.persistState();
    return sale;
  }

  async postSale(saleId: string, dto: PosSaleActionDto): Promise<SaleRecord> {
    this.ensureEnterprise(dto.companyId, dto.enterpriseId);
    const sale = this.findSale(saleId);
    if (sale.status !== SaleStatus.DRAFT) {
      throw new BadRequestException('Sale is not in draft status');
    }
    if (sale.companyId !== dto.companyId || sale.enterpriseId !== dto.enterpriseId) {
      throw new BadRequestException('Sale does not belong to the provided company/enterprise');
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
    this.emitSalePostedEvent(sale);
    return sale;
  }

  listSales(filters: {
    OrganizationId?: string;
    companyId?: string;
    enterpriseId?: string;
    dateFrom?: Date;
    dateTo?: Date;
  } = {}): SaleRecord[] {
    return this.sales.filter((sale) => {
      if (filters.OrganizationId && sale.OrganizationId !== filters.OrganizationId) return false;
      if (filters.companyId && sale.companyId !== filters.companyId) return false;
      if (filters.enterpriseId && sale.enterpriseId !== filters.enterpriseId) return false;
      if (filters.dateFrom && sale.createdAt < filters.dateFrom) return false;
      if (filters.dateTo && sale.createdAt > filters.dateTo) return false;
      return true;
    });
  }

  private ensureSessionOpen(sessionId: string, cashierUserId: string, enterpriseId: string): PosSessionRecord {
    const session = this.sessions.find((item) => item.id === sessionId);
    if (!session) {
      throw new NotFoundException('POS session not found');
    }
    if (session.status !== PosSessionStatus.OPEN) {
      throw new BadRequestException('POS session is already closed');
    }
    if (session.cashierUserId !== cashierUserId || session.enterpriseId !== enterpriseId) {
      throw new BadRequestException('Session does not match cashier or enterprise');
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
        throw new BadRequestException('Stock projection not found for sale line');
      }
      if (projection.available < line.quantity) {
        throw new BadRequestException('Insufficient stock to post sale');
      }
    });
  }

  private validatePayments(sale: SaleRecord): void {
    if (sale.payments.length === 0) {
      throw new BadRequestException('Payment is required to confirm sale');
    }
    const totalPaid = sale.payments.reduce((acc, payment) => acc + payment.amount, 0);
    if (totalPaid < sale.total) {
      throw new BadRequestException('Insufficient payment to confirm sale');
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

  private emitSalePostedEvent(sale: SaleRecord): void {
    try {
      const payment = sale.payments[0]
        ? { method: sale.payments[0].method, amount: sale.payments[0].amount }
        : null;
      const payload: PosSalePostedPayload = {
        saleId: sale.id,
        status: sale.status,
        totals: {
          subtotal: sale.subtotal,
          tax: 0,
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
          this.logger.error(`Failed to enqueue POS sale posted event ${sale.id}: ${message}`);
        });
    } catch (error) {
      const message = error instanceof Error ? error.stack ?? error.message : String(error);
      this.logger.error(`Failed to emit POS sale event ${sale.id}: ${message}`);
    }
  }

  private ensureEnterprise(companyId: string, enterpriseId: string): void {
    const company = this.companiesService.getCompany(companyId);
    const enterpriseIds = (company.enterprises ?? []).map((item) => item.id);
    const resolved = company.defaultEnterpriseId ?? enterpriseIds[0] ?? '';
    const allowed = resolved === enterpriseId || enterpriseIds.includes(enterpriseId);
    if (!allowed) {
      throw new BadRequestException('Enterprise does not match company context');
    }
  }

  private findSale(saleId: string): SaleRecord {
    const sale = this.sales.find((item) => item.id === saleId);
    if (!sale) {
      throw new NotFoundException('Sale not found');
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
        this.logger.error(`Failed to persist POS state: ${message}`);
      });
  }
}

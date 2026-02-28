import { BadRequestException, Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { InventoryDirection } from '../inventory/entities/inventory-movement.entity';
import { InventoryService } from '../inventory/inventory.service';
import { ModuleStateService } from '../../core/database/module-state.service';
import { CompaniesService } from '../companies/companies.service';
import type { JsonObject } from '../../core/events/business-event';
import { CreateGoodsReceiptDto, GoodsReceiptLineDto } from './dto/create-goods-receipt.dto';
import { ConfirmPurchaseOrderDto } from './dto/confirm-purchase-order.dto';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { PurchaseSuggestionQueryDto } from './dto/purchase-suggestion-query.dto';
import { CreateSupplierCatalogItemDto } from './dto/create-supplier-catalog-item.dto';
import { UpdateSupplierCatalogItemDto } from './dto/update-supplier-catalog-item.dto';
import { ListSupplierCatalogQueryDto } from './dto/list-supplier-catalog-query.dto';
import { GoodsReceiptNote } from './entities/goods-receipt-note.entity';
import { PurchaseOrder, PurchaseOrderStatus } from './entities/purchase-order.entity';
import { PurchaseOrderLine, PurchaseOrderLineStatus } from './entities/purchase-order-line.entity';
import { SupplierCostHistory } from './entities/supplier-cost-history.entity';
import {
  SupplierCatalogBonusType,
  SupplierCatalogItem,
  SupplierCatalogStatus,
} from './entities/supplier-catalog-item.entity';
import { ProvidersService } from '../providers/providers.service';
import type { ProviderVariant } from '../providers/entities/provider.entity';

export type SuggestionDecision = 'pending' | 'accepted' | 'partially_accepted' | 'rejected';

export interface PurchaseSuggestion {
  id: string;
  variantId: string;
  warehouseId: string;
  recommendedQty: number;
  currentOnHand: number;
  available: number;
  reasons: string[];
  decision: SuggestionDecision;
  OrganizationId: string;
  companyId: string;
}

export interface SupplierCatalogRecord extends SupplierCatalogItem {
  createdAt?: Date;
  updatedAt?: Date;
}

export interface SupplierCatalogView extends SupplierCatalogRecord {
  lastReceiptCost?: number;
}

export interface SupplierProductVariantItem {
  supplierId: string;
  variantId: string;
  active: boolean;
  lastCost: number | null;
  lastCurrency: string | null;
  lastRecordedAt: string | null;
}

export interface SupplierLastCostResult {
  lastCost: number | null;
  lastCurrency: string | null;
  lastRecordedAt: string | null;
}

interface PurchasesState {
  suggestions: PurchaseSuggestion[];
  purchaseOrders: PurchaseOrder[];
  receipts: GoodsReceiptNote[];
  costHistory: SupplierCostHistory[];
  averageCosts: { variantId: string; averageCost: number; quantity: number }[];
  supplierCatalog: SupplierCatalogRecord[];
}

@Injectable()
export class PurchasesService implements OnModuleInit {
  // TODO: replace in-memory collections with MongoDB persistence and CQRS projections.
  private readonly logger = new Logger(PurchasesService.name);
  private readonly stateKey = 'module:purchases';
  private suggestions: PurchaseSuggestion[] = [];
  private purchaseOrders: PurchaseOrder[] = [];
  private receipts: GoodsReceiptNote[] = [];
  private costHistory: SupplierCostHistory[] = [];
  private averageCosts = new Map<string, { averageCost: number; quantity: number }>();
  private supplierCatalog: SupplierCatalogRecord[] = [];

  constructor(
    private readonly inventoryService: InventoryService,
    private readonly moduleState: ModuleStateService,
    private readonly companiesService: CompaniesService,
    private readonly providersService: ProvidersService,
  ) {}

  async onModuleInit(): Promise<void> {
    const state = await this.moduleState.loadState<PurchasesState>(this.stateKey, {
      suggestions: [],
      purchaseOrders: [],
      receipts: [],
      costHistory: [],
      averageCosts: [],
      supplierCatalog: [],
    });
    this.suggestions = state.suggestions ?? [];
    this.purchaseOrders = state.purchaseOrders ?? [];
    this.receipts = state.receipts ?? [];
    this.costHistory = state.costHistory ?? [];
    this.supplierCatalog = state.supplierCatalog ?? [];
    this.averageCosts = new Map(
      (state.averageCosts ?? []).map((entry) => [
        entry.variantId,
        { averageCost: entry.averageCost, quantity: entry.quantity },
      ]),
    );
  }

  generateSuggestions(query: PurchaseSuggestionQueryDto): PurchaseSuggestion[] {
    const minOnHand = query.minOnHand ?? 10;
    const targetOnHand = query.targetOnHand ?? minOnHand * 2;

    this.suggestions.splice(
      0,
      this.suggestions.length,
      ...this.suggestions.filter((s) => s.OrganizationId !== query.OrganizationId || s.companyId !== query.companyId),
    );

    const enterpriseId = this.resolveEnterpriseId(query.companyId);
    const projections = this.inventoryService.listStock({
      warehouseId: query.warehouseId,
      enterpriseId,
    });

    const OrganizationProjections = projections.filter(
      (projection) =>
        projection.OrganizationId === query.OrganizationId &&
        projection.companyId === query.companyId &&
        projection.enterpriseId === enterpriseId,
    );

    OrganizationProjections.forEach((projection) => {
      const reasons: string[] = [];
      const recommendedQty = Math.max(targetOnHand - projection.available, 0);

      if (projection.available < minOnHand) {
        reasons.push('Below minimum stock threshold');
      }
      if (projection.available < projection.onHand) {
        reasons.push('Recent movement suggests rotation');
      }
      reasons.push('FEFO review pending for expiring batches');

      if (recommendedQty <= 0) {
        return;
      }

      const suggestion: PurchaseSuggestion = {
        id: uuid(),
        variantId: projection.variantId,
        warehouseId: projection.warehouseId,
        recommendedQty,
        currentOnHand: projection.onHand,
        available: projection.available,
        reasons,
        decision: 'pending',
        OrganizationId: query.OrganizationId,
        companyId: query.companyId,
      };

      this.suggestions.push(suggestion);
    });

    const result = this.suggestions.filter(
      (suggestion) => suggestion.OrganizationId === query.OrganizationId && suggestion.companyId === query.companyId,
    );
    this.persistState();
    return result;
  }

  createPurchaseOrder(dto: CreatePurchaseOrderDto): PurchaseOrder {
    const lines = dto.lines
      .map((line) => this.mapOrderLine(line, dto.OrganizationId, dto.companyId))
      .filter((line) => line.quantity > 0);
    if (lines.length === 0) {
      throw new BadRequestException('At least one line with qty > 0 is required');
    }
    const order: PurchaseOrder = {
      id: uuid(),
      supplierId: dto.supplierId,
      warehouseId: dto.warehouseId ?? '',
      status: PurchaseOrderStatus.DRAFT,
      OrganizationId: dto.OrganizationId,
      companyId: dto.companyId,
      createdAt: new Date().toISOString(),
      lines,
    };

    this.applySuggestionDecisions(order, dto.rejectedSuggestionIds ?? []);
    this.purchaseOrders.push(order);
    this.persistState();
    return order;
  }

  confirmPurchaseOrder(orderId: string, dto: ConfirmPurchaseOrderDto): PurchaseOrder {
    const order = this.findOrder(orderId);
    this.ensureSameTenant(order.OrganizationId, order.companyId, dto.OrganizationId, dto.companyId);

    order.status = PurchaseOrderStatus.CONFIRMED;
    this.persistState();
    return order;
  }

  recordGoodsReceipt(dto: CreateGoodsReceiptDto): { receipt: GoodsReceiptNote; order?: PurchaseOrder } {
    const order = dto.purchaseOrderId ? this.findOrder(dto.purchaseOrderId) : undefined;

    if (order) {
      this.ensureSameTenant(order.OrganizationId, order.companyId, dto.OrganizationId, dto.companyId);
    }

    const receipt: GoodsReceiptNote = {
      id: uuid(),
      purchaseOrderId: order?.id,
      warehouseId: dto.warehouseId,
      OrganizationId: dto.OrganizationId,
      companyId: dto.companyId,
      lines: dto.lines.map((line) => this.mapReceiptLine(line, dto.OrganizationId, dto.companyId)),
    };

    receipt.lines.forEach((line) => {
      const references: JsonObject = { grnId: receipt.id, warehouseId: receipt.warehouseId };
      if (order) {
        references.purchaseOrderId = order.id;
      }

      this.inventoryService.recordMovement({
        direction: InventoryDirection.IN,
        variantId: line.variantId,
        warehouseId: receipt.warehouseId,
        enterpriseId: this.resolveEnterpriseId(dto.companyId),
        locationId: line.locationId,
        batchId: line.batchId,
        quantity: line.quantity,
        operationId: `${receipt.id}:${line.variantId}`,
        references,
        OrganizationId: dto.OrganizationId,
        companyId: dto.companyId,
      });

      this.updateAverageCost(line.variantId, line.quantity, line.unitCost);
      this.costHistory.push({
        id: uuid(),
        supplierId: order?.supplierId ?? 'unknown',
        variantId: line.variantId,
        unitCost: line.unitCost,
        currency: line.currency,
        OrganizationId: dto.OrganizationId,
        companyId: dto.companyId,
      });

      if (order) {
        const matchingLine = order.lines.find((l) => l.variantId === line.variantId);
        if (matchingLine) {
          matchingLine.receivedQuantity += line.quantity;
          matchingLine.status =
            matchingLine.receivedQuantity >= matchingLine.quantity
              ? PurchaseOrderLineStatus.RECEIVED
              : PurchaseOrderLineStatus.ORDERED;
        }
      }
    });

    if (order && order.lines.every((line) => line.status === PurchaseOrderLineStatus.RECEIVED)) {
      order.status = PurchaseOrderStatus.RECEIVED;
    }

    this.receipts.push(receipt);
    this.persistState();
    return { receipt, order };
  }

  listPurchaseOrders(): PurchaseOrder[] {
    return this.purchaseOrders;
  }

  listPurchaseOrdersByQuery(query: {
    OrganizationId: string;
    companyId: string;
    supplierId?: string;
    status?: PurchaseOrderStatus;
  }): PurchaseOrder[] {
    const OrganizationId = query.OrganizationId.trim();
    const companyId = query.companyId.trim();
    if (!OrganizationId || !companyId) {
      return [];
    }
    const supplierId = query.supplierId?.trim();
    const status = query.status;

    return this.purchaseOrders
      .filter((order) => {
        if (order.OrganizationId !== OrganizationId || order.companyId !== companyId) {
          return false;
        }
        if (supplierId && order.supplierId !== supplierId) {
          return false;
        }
        if (status && order.status !== status) {
          return false;
        }
        return true;
      })
      .slice()
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  listReceipts(): GoodsReceiptNote[] {
    return this.receipts;
  }

  listCostHistory(): SupplierCostHistory[] {
    return this.costHistory;
  }

  createSupplierCatalogItem(dto: CreateSupplierCatalogItemDto): SupplierCatalogView {
    this.ensureValidTenant(dto.OrganizationId, dto.companyId);
    this.ensureValidBonus(dto.bonusType, dto.bonusValue);
    const validFrom = this.parseDate(dto.validFrom);
    const validTo = this.parseDate(dto.validTo);
    this.ensureValidDateRange(validFrom, validTo);

    const existing = this.findCatalogByKeys(dto.OrganizationId, dto.companyId, dto.supplierId, dto.variantId);
    if (existing) {
      const updated = this.updateCatalogItemInternal(existing, {
        supplierId: dto.supplierId,
        variantId: dto.variantId,
        unitCost: dto.unitCost,
        currency: dto.currency,
        freightCost: dto.freightCost,
        bonusType: dto.bonusType,
        bonusValue: dto.bonusValue,
        minQty: dto.minQty,
        leadTimeDays: dto.leadTimeDays,
        validFrom,
        validTo,
        status: dto.status,
      });
      this.persistState();
      return this.withLastReceiptCost(updated);
    }

    const record: SupplierCatalogRecord = {
      id: uuid(),
      supplierId: dto.supplierId,
      variantId: dto.variantId,
      unitCost: dto.unitCost,
      currency: dto.currency,
      freightCost: dto.freightCost,
      bonusType: dto.bonusType ?? SupplierCatalogBonusType.NONE,
      bonusValue: dto.bonusValue,
      minQty: dto.minQty,
      leadTimeDays: dto.leadTimeDays,
      validFrom,
      validTo,
      status: dto.status ?? SupplierCatalogStatus.ACTIVE,
      OrganizationId: dto.OrganizationId,
      companyId: dto.companyId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.supplierCatalog.push(record);
    this.persistState();
    return this.withLastReceiptCost(record);
  }

  listSupplierCatalog(query: ListSupplierCatalogQueryDto): SupplierCatalogView[] {
    const OrganizationId = query.OrganizationId?.trim();
    const companyId = query.companyId?.trim();
    if (!OrganizationId || !companyId) {
      return [];
    }
    const status = query.status;
    const supplierId = query.supplierId?.trim();
    const needle = query.q?.trim().toLowerCase();

    const filtered = this.supplierCatalog.filter((item) => {
      if (item.OrganizationId !== OrganizationId || item.companyId !== companyId) return false;
      if (supplierId && item.supplierId !== supplierId) return false;
      if (status && item.status !== status) return false;
      if (needle) {
        const variantMatch = item.variantId.toLowerCase().includes(needle);
        const supplierMatch = item.supplierId.toLowerCase().includes(needle);
        if (!variantMatch && !supplierMatch) return false;
      }
      return true;
    });

    return filtered.map((item) => this.withLastReceiptCost(item));
  }

  getSupplierCatalogItem(id: string, OrganizationId: string, companyId: string): SupplierCatalogView {
    this.ensureValidTenant(OrganizationId, companyId);
    const item = this.supplierCatalog.find(
      (candidate) =>
        candidate.id === id &&
        candidate.OrganizationId === OrganizationId &&
        candidate.companyId === companyId,
    );
    if (!item) {
      throw new NotFoundException('Supplier catalog item not found');
    }
    return this.withLastReceiptCost(item);
  }

  updateSupplierCatalogItem(
    id: string,
    dto: UpdateSupplierCatalogItemDto,
    OrganizationId: string,
    companyId: string,
  ): SupplierCatalogView {
    this.ensureValidTenant(OrganizationId, companyId);
    if (dto.OrganizationId && dto.OrganizationId !== OrganizationId) {
      throw new BadRequestException('OrganizationId cannot be changed');
    }
    if (dto.companyId && dto.companyId !== companyId) {
      throw new BadRequestException('companyId cannot be changed');
    }
    this.ensureValidBonus(dto.bonusType, dto.bonusValue);

    const existing = this.supplierCatalog.find(
      (candidate) =>
        candidate.id === id &&
        candidate.OrganizationId === OrganizationId &&
        candidate.companyId === companyId,
    );
    if (!existing) {
      throw new NotFoundException('Supplier catalog item not found');
    }

    const nextSupplierId = dto.supplierId ?? existing.supplierId;
    const nextVariantId = dto.variantId ?? existing.variantId;
    const duplicate = this.supplierCatalog.find(
      (candidate) =>
        candidate.id !== existing.id &&
        candidate.OrganizationId === OrganizationId &&
        candidate.companyId === companyId &&
        candidate.supplierId === nextSupplierId &&
        candidate.variantId === nextVariantId,
    );
    if (duplicate) {
      throw new BadRequestException('Supplier catalog item already exists for supplier and variant');
    }

    const validFrom = dto.validFrom !== undefined ? this.parseDate(dto.validFrom) : existing.validFrom;
    const validTo = dto.validTo !== undefined ? this.parseDate(dto.validTo) : existing.validTo;
    this.ensureValidDateRange(validFrom, validTo);

    const updated = this.updateCatalogItemInternal(existing, {
      supplierId: dto.supplierId,
      variantId: dto.variantId,
      unitCost: dto.unitCost,
      currency: dto.currency,
      freightCost: dto.freightCost,
      bonusType: dto.bonusType,
      bonusValue: dto.bonusValue,
      minQty: dto.minQty,
      leadTimeDays: dto.leadTimeDays,
      validFrom,
      validTo,
      status: dto.status,
    });
    this.persistState();
    return this.withLastReceiptCost(updated);
  }

  removeSupplierCatalogItem(id: string, OrganizationId: string, companyId: string): void {
    this.ensureValidTenant(OrganizationId, companyId);
    const index = this.supplierCatalog.findIndex(
      (candidate) =>
        candidate.id === id &&
        candidate.OrganizationId === OrganizationId &&
        candidate.companyId === companyId,
    );
    if (index === -1) {
      throw new NotFoundException('Supplier catalog item not found');
    }
    this.supplierCatalog.splice(index, 1);
    this.persistState();
  }

  listSupplierCatalogBySupplier(
    OrganizationId: string,
    companyId: string,
    supplierId: string,
  ): SupplierCatalogView[] {
    this.ensureValidTenant(OrganizationId, companyId);
    const filtered = this.supplierCatalog.filter(
      (item) =>
        item.OrganizationId === OrganizationId &&
        item.companyId === companyId &&
        item.supplierId === supplierId,
    );
    return filtered.map((item) => this.withLastReceiptCost(item));
  }

  listSupplierProducts(
    OrganizationId: string,
    companyId: string,
    supplierId: string,
  ): SupplierProductVariantItem[] {
    this.ensureValidTenant(OrganizationId, companyId);
    const provider = this.providersService.findOne(supplierId);
    if (provider.OrganizationId !== OrganizationId || provider.companyId !== companyId) {
      throw new BadRequestException('Provider does not belong to the provided Organization/company');
    }
    return this.mapProviderVariants(provider.variants ?? [], supplierId, OrganizationId, companyId);
  }

  getSupplierVariantLastCost(
    OrganizationId: string,
    companyId: string,
    supplierId: string,
    variantId: string,
  ): SupplierLastCostResult {
    this.ensureValidTenant(OrganizationId, companyId);
    const provider = this.providersService.findOne(supplierId);
    if (provider.OrganizationId !== OrganizationId || provider.companyId !== companyId) {
      throw new BadRequestException('Provider does not belong to the provided Organization/company');
    }
    const latest = this.findLatestCost(supplierId, variantId, OrganizationId, companyId);
    return {
      lastCost: latest?.unitCost ?? null,
      lastCurrency: latest?.currency ?? null,
      lastRecordedAt: null,
    };
  }

  listSuggestions(OrganizationId: string, companyId: string): PurchaseSuggestion[] {
    return this.suggestions.filter((suggestion) => suggestion.OrganizationId === OrganizationId && suggestion.companyId === companyId);
  }

  private mapOrderLine(line: CreatePurchaseOrderDto['lines'][number], OrganizationId: string, companyId: string): PurchaseOrderLine {
    const qty = this.resolveLineQuantity(line);
    if (qty <= 0) {
      throw new BadRequestException('Line qty must be greater than 0');
    }
    if (line.unitCost < 0) {
      throw new BadRequestException('Unit cost must be >= 0');
    }
    const decision = this.suggestions.find(
      (suggestion) => suggestion.id === line.suggestionId && suggestion.OrganizationId === OrganizationId && suggestion.companyId === companyId,
    );

    if (decision) {
      decision.decision = qty >= decision.recommendedQty ? 'accepted' : 'partially_accepted';
    }

    return {
      id: uuid(),
      variantId: line.variantId,
      quantity: qty,
      receivedQuantity: 0,
      unitCost: line.unitCost,
      currency: line.currency,
      status: PurchaseOrderLineStatus.PENDING,
      suggestionId: line.suggestionId,
      OrganizationId,
      companyId,
    };
  }

  private mapReceiptLine(line: GoodsReceiptLineDto, OrganizationId: string, companyId: string) {
    const suggestion = line.suggestionId
      ? this.suggestions.find(
          (candidate) => candidate.id === line.suggestionId && candidate.OrganizationId === OrganizationId && candidate.companyId === companyId,
        )
      : undefined;

    if (suggestion) {
      suggestion.decision = line.quantity >= suggestion.recommendedQty ? 'accepted' : 'partially_accepted';
    }

    return {
      id: uuid(),
      variantId: line.variantId,
      quantity: line.quantity,
      unitCost: line.unitCost,
      currency: line.currency,
      locationId: line.locationId,
      batchId: line.batchId,
      OrganizationId,
      companyId,
    };
  }

  private updateAverageCost(variantId: string, receivedQty: number, unitCost: number) {
    const current = this.averageCosts.get(variantId) ?? { averageCost: unitCost, quantity: 0 };
    const newQuantity = current.quantity + receivedQty;
    const newAverage = newQuantity === 0 ? unitCost : (current.averageCost * current.quantity + unitCost * receivedQty) / newQuantity;

    this.averageCosts.set(variantId, { averageCost: newAverage, quantity: newQuantity });
  }

  private applySuggestionDecisions(order: PurchaseOrder, rejectedSuggestionIds: string[]) {
    rejectedSuggestionIds.forEach((id) => {
      const suggestion = this.suggestions.find(
        (candidate) => candidate.id === id && candidate.OrganizationId === order.OrganizationId && candidate.companyId === order.companyId,
      );
      if (suggestion) {
        suggestion.decision = 'rejected';
      }
    });
  }

  private ensureSameTenant(entityOrganization: string, entityCompany: string, OrganizationId: string, companyId: string) {
    if (entityOrganization !== OrganizationId || entityCompany !== companyId) {
      throw new BadRequestException('Entity does not belong to the provided Organization/company');
    }
  }

  private resolveEnterpriseId(companyId: string): string {
    const company = this.companiesService.getCompany(companyId);
    const enterpriseId = company.defaultEnterpriseId ?? company.enterprises?.[0]?.id ?? '';
    if (!enterpriseId) {
      throw new BadRequestException('Enterprise not resolved for purchase inventory movements');
    }
    return enterpriseId;
  }

  private findOrder(orderId: string): PurchaseOrder {
    const order = this.purchaseOrders.find((item) => item.id === orderId);
    if (!order) {
      throw new NotFoundException('Purchase order not found');
    }
    return order;
  }

  private persistState() {
    void this.moduleState
      .saveState<PurchasesState>(this.stateKey, {
        suggestions: this.suggestions,
        purchaseOrders: this.purchaseOrders,
        receipts: this.receipts,
        costHistory: this.costHistory,
        supplierCatalog: this.supplierCatalog,
        averageCosts: Array.from(this.averageCosts.entries()).map(([variantId, value]) => ({
          variantId,
          averageCost: value.averageCost,
          quantity: value.quantity,
        })),
      })
      .catch((error) => {
        const message = error instanceof Error ? error.stack ?? error.message : String(error);
        this.logger.error(`Failed to persist purchases state: ${message}`);
      });
  }

  private findCatalogByKeys(
    OrganizationId: string,
    companyId: string,
    supplierId: string,
    variantId: string,
  ): SupplierCatalogRecord | undefined {
    return this.supplierCatalog.find(
      (item) =>
        item.OrganizationId === OrganizationId &&
        item.companyId === companyId &&
        item.supplierId === supplierId &&
        item.variantId === variantId,
    );
  }

  private updateCatalogItemInternal(
    target: SupplierCatalogRecord,
    updates: {
      supplierId?: string;
      variantId?: string;
      unitCost?: number;
      currency?: string;
      freightCost?: number;
      bonusType?: SupplierCatalogBonusType;
      bonusValue?: number;
      minQty?: number;
      leadTimeDays?: number;
      validFrom?: Date;
      validTo?: Date;
      status?: SupplierCatalogStatus;
    },
  ): SupplierCatalogRecord {
    if (updates.supplierId !== undefined) target.supplierId = updates.supplierId;
    if (updates.variantId !== undefined) target.variantId = updates.variantId;
    if (updates.unitCost !== undefined) target.unitCost = updates.unitCost;
    if (updates.currency !== undefined) target.currency = updates.currency;
    if (updates.freightCost !== undefined) target.freightCost = updates.freightCost;
    if (updates.bonusType !== undefined) target.bonusType = updates.bonusType;
    if (updates.bonusValue !== undefined) target.bonusValue = updates.bonusValue;
    if (updates.minQty !== undefined) target.minQty = updates.minQty;
    if (updates.leadTimeDays !== undefined) target.leadTimeDays = updates.leadTimeDays;
    if (updates.validFrom !== undefined) target.validFrom = updates.validFrom;
    if (updates.validTo !== undefined) target.validTo = updates.validTo;
    if (updates.status !== undefined) target.status = updates.status;
    target.updatedAt = new Date();
    return target;
  }

  private withLastReceiptCost(item: SupplierCatalogRecord): SupplierCatalogView {
    const matches = this.costHistory.filter(
      (entry) =>
        entry.OrganizationId === item.OrganizationId &&
        entry.companyId === item.companyId &&
        entry.supplierId === item.supplierId &&
        entry.variantId === item.variantId,
    );
    if (matches.length === 0) {
      return { ...item };
    }
    const latest = matches[matches.length - 1];
    return {
      ...item,
      lastReceiptCost: latest.unitCost,
    };
  }

  private mapProviderVariants(
    variants: ProviderVariant[],
    supplierId: string,
    OrganizationId: string,
    companyId: string,
  ): SupplierProductVariantItem[] {
    return variants.map((variant) => {
      const latest = this.findLatestCost(supplierId, variant.variantId, OrganizationId, companyId);
      return {
        supplierId,
        variantId: variant.variantId,
        active: variant.active,
        lastCost: latest?.unitCost ?? null,
        lastCurrency: latest?.currency ?? null,
        lastRecordedAt: null,
      };
    });
  }

  private findLatestCost(
    supplierId: string,
    variantId: string,
    OrganizationId: string,
    companyId: string,
  ): SupplierCostHistory | undefined {
    const matches = this.costHistory.filter(
      (entry) =>
        entry.OrganizationId === OrganizationId &&
        entry.companyId === companyId &&
        entry.supplierId === supplierId &&
        entry.variantId === variantId,
    );
    return matches.length > 0 ? matches[matches.length - 1] : undefined;
  }

  private ensureValidTenant(OrganizationId?: string, companyId?: string): void {
    if (!OrganizationId || !OrganizationId.trim()) {
      throw new BadRequestException('OrganizationId is required');
    }
    if (!companyId || !companyId.trim()) {
      throw new BadRequestException('companyId is required');
    }
  }

  private ensureValidBonus(bonusType?: SupplierCatalogBonusType, bonusValue?: number): void {
    if (bonusType && bonusType !== SupplierCatalogBonusType.NONE && bonusValue === undefined) {
      throw new BadRequestException('bonusValue is required when bonusType is not none');
    }
  }

  private parseDate(value?: string): Date | undefined {
    if (!value) {
      return undefined;
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException('Invalid date format');
    }
    return parsed;
  }

  private ensureValidDateRange(validFrom?: Date, validTo?: Date): void {
    if (validFrom && validTo && validTo.getTime() < validFrom.getTime()) {
      throw new BadRequestException('validTo must be greater than or equal to validFrom');
    }
  }

  private resolveLineQuantity(line: CreatePurchaseOrderDto['lines'][number]): number {
    if (typeof line.quantity === 'number') {
      return line.quantity;
    }
    if (typeof line.qty === 'number') {
      return line.qty;
    }
    return 0;
  }
}

import { BadRequestException, Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { InventoryDirection } from '../inventory/entities/inventory-movement.entity';
import { InventoryService } from '../inventory/inventory.service';
import { ModuleStateService } from '../../core/database/module-state.service';
import { CompaniesService } from '../companies/companies.service';
import type { JsonObject } from '../../core/events/business-event';
import { CreateGoodsReceiptDto, GoodsReceiptDiscountType, GoodsReceiptLineDto } from './dto/create-goods-receipt.dto';
import { ConfirmPurchaseOrderDto } from './dto/confirm-purchase-order.dto';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { PurchaseSuggestionQueryDto } from './dto/purchase-suggestion-query.dto';
import { CreateSupplierCatalogItemDto } from './dto/create-supplier-catalog-item.dto';
import { UpdateSupplierCatalogItemDto } from './dto/update-supplier-catalog-item.dto';
import { ListSupplierCatalogQueryDto } from './dto/list-supplier-catalog-query.dto';
import { GoodsReceiptNote } from './entities/goods-receipt-note.entity';
import { PurchaseOrder, PurchaseOrderStatus } from './entities/purchase-order.entity';
import {
  PurchaseOrderLine,
  PurchaseOrderLineDiscountType,
  PurchaseOrderLineStatus,
} from './entities/purchase-order-line.entity';
import { SupplierCostHistory } from './entities/supplier-cost-history.entity';
import {
  SupplierCatalogBonusType,
  SupplierCatalogItem,
  SupplierCatalogStatus,
} from './entities/supplier-catalog-item.entity';
import { ProvidersService } from '../providers/providers.service';
import type { ProviderVariant } from '../providers/entities/provider.entity';
import { PackagingNamesService } from '../products/packaging-names/packaging-names.service';
import { VariantsService } from '../products/variants/variants.service';

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

export interface BestPriceItem {
  providerId: string;
  providerName: string;
  currency: string;
  unitCost: number;
  packagingId?: string;
  multiplierSnapshot?: number;
  date: string;
  source: 'purchase_order' | 'price_list';
  orderId?: string;
  bestInCurrency?: boolean;
}

export interface GoodsReceiptValidationIssue {
  path: string;
  message: string;
}

export interface GoodsReceiptValidationResult {
  valid: boolean;
  errors: GoodsReceiptValidationIssue[];
  warnings: GoodsReceiptValidationIssue[];
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
    private readonly packagingNamesService: PackagingNamesService,
    private readonly variantsService: VariantsService,
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

  async createPurchaseOrder(dto: CreatePurchaseOrderDto): Promise<PurchaseOrder> {
    const mapped = await Promise.all(
      dto.lines.map((line) => this.mapOrderLine(line, dto.OrganizationId, dto.companyId)),
    );
    const lines = mapped.filter((line) => line.quantity > 0);
    if (lines.length === 0) {
      throw new BadRequestException('At least one line with qty > 0 is required');
    }
    const orderDate = this.parseDate(dto.orderDate)?.toISOString() ?? new Date().toISOString();
    const expectedDeliveryDate = this.parseDate(dto.expectedDeliveryDate)?.toISOString();
    const receivedAt = this.parseDate(dto.receivedAt)?.toISOString();
    const total = this.computeOrderTotal(lines, dto.globalFreight, dto.globalExtraCosts);
    const order: PurchaseOrder = {
      id: uuid(),
      supplierId: dto.supplierId,
      warehouseId: dto.warehouseId ?? '',
      status: dto.status ?? PurchaseOrderStatus.DRAFT,
      OrganizationId: dto.OrganizationId,
      companyId: dto.companyId,
      createdAt: orderDate,
      expectedDeliveryDate,
      receivedAt,
      currencyId: dto.currencyId,
      globalFreight: dto.globalFreight,
      globalExtraCosts: dto.globalExtraCosts,
      notes: dto.notes,
      total,
      lines,
    };

    this.applySuggestionDecisions(order, dto.rejectedSuggestionIds ?? []);
    this.purchaseOrders.push(order);
    this.persistState();
    return order;
  }

  async updatePurchaseOrder(orderId: string, dto: CreatePurchaseOrderDto): Promise<PurchaseOrder> {
    const order = this.findOrder(orderId);
    this.ensureSameTenant(order.OrganizationId, order.companyId, dto.OrganizationId, dto.companyId);
    if (order.status !== PurchaseOrderStatus.DRAFT) {
      throw new BadRequestException('Only DRAFT orders can be edited');
    }

    const mapped = await Promise.all(
      dto.lines.map((line) => this.mapOrderLine(line, dto.OrganizationId, dto.companyId)),
    );
    const lines = mapped.filter((line) => line.quantity > 0);
    if (lines.length === 0) {
      throw new BadRequestException('At least one line with qty > 0 is required');
    }

    const orderDate = this.parseDate(dto.orderDate)?.toISOString() ?? order.createdAt;
    const expectedDeliveryDate = this.parseDate(dto.expectedDeliveryDate)?.toISOString() ?? order.expectedDeliveryDate;
    const receivedAt = this.parseDate(dto.receivedAt)?.toISOString() ?? order.receivedAt;
    const total = this.computeOrderTotal(lines, dto.globalFreight ?? order.globalFreight, dto.globalExtraCosts ?? order.globalExtraCosts);

    order.supplierId = dto.supplierId ?? order.supplierId;
    order.warehouseId = dto.warehouseId ?? order.warehouseId;
    order.status = dto.status ?? order.status;
    order.createdAt = orderDate;
    order.expectedDeliveryDate = expectedDeliveryDate;
    order.receivedAt = receivedAt;
    order.currencyId = dto.currencyId ?? order.currencyId;
    order.globalFreight = dto.globalFreight ?? order.globalFreight;
    order.globalExtraCosts = dto.globalExtraCosts ?? order.globalExtraCosts;
    order.notes = dto.notes ?? order.notes;
    order.total = total;
    order.lines = lines;

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

    const validation = this.validateGoodsReceiptData(dto);
    if (!validation.valid) {
      throw new BadRequestException({
        message: 'Goods receipt validation failed',
        errors: validation.errors,
      });
    }

    const receipt: GoodsReceiptNote = {
      id: uuid(),
      purchaseOrderId: order?.id,
      warehouseId: dto.warehouseId,
      OrganizationId: dto.OrganizationId,
      companyId: dto.companyId,
      lines: dto.lines.map((line, index) =>
        this.mapReceiptLine(line, dto.OrganizationId, dto.companyId, index),
      ),
    };

    receipt.lines.forEach((line) => {
      const paidQty = line.quantityReceived ?? line.quantity;
      const bonusQty = line.bonusQty ?? 0;
      const totalQty = paidQty + bonusQty;
      const effectiveUnitCost = this.resolveEffectiveReceiptUnitCost(line, paidQty, totalQty);
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
        quantity: totalQty,
        operationId: `${receipt.id}:${line.variantId}`,
        references,
        OrganizationId: dto.OrganizationId,
        companyId: dto.companyId,
      });

      this.updateAverageCost(line.variantId, totalQty, effectiveUnitCost);
      this.costHistory.push({
        id: uuid(),
        supplierId: order?.supplierId ?? 'unknown',
        variantId: line.variantId,
        unitCost: effectiveUnitCost,
        currency: line.currency,
        OrganizationId: dto.OrganizationId,
        companyId: dto.companyId,
      });

      if (line.bonusVariantId && line.bonusVariantQty && line.bonusVariantQty > 0) {
        this.inventoryService.recordMovement({
          direction: InventoryDirection.IN,
          variantId: line.bonusVariantId,
          warehouseId: receipt.warehouseId,
          enterpriseId: this.resolveEnterpriseId(dto.companyId),
          locationId: line.locationId,
          batchId: line.batchId,
          quantity: line.bonusVariantQty,
          operationId: `${receipt.id}:${line.bonusVariantId}:bonus`,
          references: { ...references, bonusFromVariantId: line.variantId },
          OrganizationId: dto.OrganizationId,
          companyId: dto.companyId,
        });
        this.updateAverageCost(line.bonusVariantId, line.bonusVariantQty, 0);
      }

      if (order) {
        const matchingLine = order.lines.find((l) => l.variantId === line.variantId);
        if (matchingLine) {
          matchingLine.receivedQuantity += paidQty;
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

  async listBestPrices(query: {
    OrganizationId: string;
    productId: string;
    variantId?: string;
    packagingId?: string;
    limit?: number;
  }): Promise<{ items: BestPriceItem[]; fxNote?: string }> {
    const OrganizationId = query.OrganizationId?.trim();
    const productId = query.productId?.trim();
    if (!OrganizationId || !productId) {
      return { items: [] };
    }

    const variants = await this.variantsService.findByProduct(productId, OrganizationId);
    const variantIds = new Set(variants.map((variant) => variant.id));
    if (variantIds.size === 0) {
      return { items: [] };
    }

    const requestedVariantId = query.variantId?.trim();
    if (requestedVariantId && !variantIds.has(requestedVariantId)) {
      return { items: [] };
    }

    const packagingId = query.packagingId?.trim();
    const limit = Math.max(query.limit ?? 10, 1);
    const providers = this.providersService
      .findAll()
      .filter((provider) => provider.OrganizationId === OrganizationId);
    const providerMap = new Map(providers.map((provider) => [provider.id, provider.name]));

    const allowedStatuses = new Set([PurchaseOrderStatus.CONFIRMED, PurchaseOrderStatus.RECEIVED]);
    const purchaseItems: BestPriceItem[] = [];
    this.purchaseOrders.forEach((order) => {
      if (order.OrganizationId !== OrganizationId || !allowedStatuses.has(order.status)) {
        return;
      }
      order.lines.forEach((line) => {
        if (requestedVariantId && line.variantId !== requestedVariantId) {
          return;
        }
        if (!requestedVariantId && !variantIds.has(line.variantId)) {
          return;
        }
        if (packagingId && line.packagingId !== packagingId) {
          return;
        }
        purchaseItems.push({
          providerId: order.supplierId,
          providerName: providerMap.get(order.supplierId) ?? order.supplierId,
          currency: line.currency ?? order.currencyId ?? 'N/A',
          unitCost: line.unitCost,
          packagingId: line.packagingId ?? undefined,
          multiplierSnapshot: line.packagingMultiplier ?? undefined,
          date: order.createdAt,
          source: 'purchase_order',
          orderId: order.id,
        });
      });
    });

    const priceListItems: BestPriceItem[] = [];
    if (!packagingId) {
      this.supplierCatalog.forEach((item) => {
        if (item.OrganizationId !== OrganizationId) return;
        if (requestedVariantId && item.variantId !== requestedVariantId) return;
        if (!requestedVariantId && !variantIds.has(item.variantId)) return;
        priceListItems.push({
          providerId: item.supplierId,
          providerName: providerMap.get(item.supplierId) ?? item.supplierId,
          currency: item.currency ?? 'N/A',
          unitCost: item.unitCost,
          packagingId: undefined,
          multiplierSnapshot: undefined,
          date: (item.updatedAt ?? item.createdAt ?? new Date()).toISOString(),
          source: 'price_list',
        });
      });
    }

    const combined = [...purchaseItems, ...priceListItems];
    const bestByCurrency = new Map<string, number>();
    combined.forEach((item) => {
      const current = bestByCurrency.get(item.currency);
      if (current === undefined || item.unitCost < current) {
        bestByCurrency.set(item.currency, item.unitCost);
      }
    });

    combined.forEach((item) => {
      const best = bestByCurrency.get(item.currency);
      item.bestInCurrency = best !== undefined && item.unitCost === best;
    });

    const grouped = new Map<string, BestPriceItem[]>();
    combined.forEach((item) => {
      const list = grouped.get(item.currency) ?? [];
      list.push(item);
      grouped.set(item.currency, list);
    });

    const items: BestPriceItem[] = [];
    grouped.forEach((list) => {
      list.sort((a, b) => a.unitCost - b.unitCost);
      items.push(...list.slice(0, limit));
    });

    return {
      items,
      fxNote: 'Comparación global requiere tipo de cambio.',
    };
  }

  private async mapOrderLine(
    line: CreatePurchaseOrderDto['lines'][number],
    OrganizationId: string,
    companyId: string,
  ): Promise<PurchaseOrderLine> {
    const qty = this.resolveLineQuantity(line);
    if (qty <= 0) {
      throw new BadRequestException('Line qty must be greater than 0');
    }
    if (line.unitCost < 0) {
      throw new BadRequestException('Unit cost must be >= 0');
    }
    const packagingId = line.packagingId ?? line.packagingNameId ?? '';
    if (!packagingId) {
      throw new BadRequestException('packagingId is required');
    }
    const packaging = await this.resolvePackaging(OrganizationId, packagingId);
    if (!packaging) {
      throw new BadRequestException('packagingId is invalid for this organization');
    }
    const packagingMultiplier =
      line.packagingMultiplier ?? line.packagingMultiplierSnapshot ?? packaging.multiplier ?? 1;
    if (packagingMultiplier < 1) {
      throw new BadRequestException('packagingMultiplier must be >= 1');
    }
    if (line.freightCost !== undefined && line.freightCost < 0) {
      throw new BadRequestException('Freight cost must be >= 0');
    }
    if (line.extraCosts !== undefined && line.extraCosts < 0) {
      throw new BadRequestException('Extra costs must be >= 0');
    }
    if (line.bonusQty !== undefined && line.bonusQty < 0) {
      throw new BadRequestException('bonusQty must be >= 0');
    }
    if (line.discountValue !== undefined && line.discountValue < 0) {
      throw new BadRequestException('discountValue must be >= 0');
    }
    if (line.discountType && line.discountValue === undefined) {
      throw new BadRequestException('discountValue is required when discountType is provided');
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
      packagingId,
      packagingMultiplier,
      quantity: qty,
      receivedQuantity: 0,
      unitCost: line.unitCost,
      currency: line.currency,
      freightCost: line.freightCost,
      extraCosts: line.extraCosts,
      notes: line.notes,
      bonusQty: line.bonusQty,
      discountType: line.discountType,
      discountValue: line.discountValue,
      status: PurchaseOrderLineStatus.PENDING,
      suggestionId: line.suggestionId,
      OrganizationId,
      companyId,
    };
  }

  validateGoodsReceiptData(dto: CreateGoodsReceiptDto): GoodsReceiptValidationResult {
    const errors: GoodsReceiptValidationIssue[] = [];
    const warnings: GoodsReceiptValidationIssue[] = [];

    dto.lines.forEach((line, index) => {
      const lineResult = this.validateReceiptLine(line, index);
      errors.push(...lineResult.errors);
      warnings.push(...lineResult.warnings);
    });

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  private mapReceiptLine(line: GoodsReceiptLineDto, OrganizationId: string, companyId: string, index: number) {
    const suggestion = line.suggestionId
      ? this.suggestions.find(
          (candidate) => candidate.id === line.suggestionId && candidate.OrganizationId === OrganizationId && candidate.companyId === companyId,
        )
      : undefined;

    if (suggestion) {
      suggestion.decision = line.quantity >= suggestion.recommendedQty ? 'accepted' : 'partially_accepted';
    }

    const validation = this.validateReceiptLine(line, index);
    if (validation.errors.length > 0) {
      throw new BadRequestException({
        message: 'Goods receipt line validation failed',
        errors: validation.errors,
      });
    }
    const normalizedDiscountType = validation.normalizedDiscountType;

    const paidQty = line.quantityReceived ?? line.quantity;
    const bonusQty = line.bonusQty ?? 0;
    const totalQty = paidQty + bonusQty;
    const effectiveUnitCost = this.resolveEffectiveReceiptUnitCost(
      {
        unitCost: line.unitCost,
        discountType: normalizedDiscountType,
        discountValue: line.discountValue,
        isBonus: line.isBonus,
      },
      paidQty,
      totalQty,
    );

    return {
      id: uuid(),
      variantId: line.variantId,
      productId: line.productId,
      quantity: line.quantity,
      quantityReceived: line.quantityReceived,
      unitCost: line.unitCost,
      effectiveUnitCost,
      currency: line.currency,
      locationId: line.locationId,
      batchId: line.batchId,
      bonusQty: line.bonusQty,
      bonusVariantId: line.bonusVariantId,
      bonusVariantQty: line.bonusVariantQty,
      discountType: normalizedDiscountType,
      discountValue: line.discountValue,
      isBonus: line.isBonus,
      bonusSourceLineId: line.bonusSourceLineId,
      OrganizationId,
      companyId,
    };
  }

  private validateReceiptLine(
    line: GoodsReceiptLineDto,
    index: number,
  ): { errors: GoodsReceiptValidationIssue[]; warnings: GoodsReceiptValidationIssue[]; normalizedDiscountType?: GoodsReceiptDiscountType } {
    const errors: GoodsReceiptValidationIssue[] = [];
    const warnings: GoodsReceiptValidationIssue[] = [];
    const pathPrefix = `lines[${index}]`;

    const normalizedDiscountType = this.normalizeReceiptDiscountType(line.discountType);
    if (normalizedDiscountType === GoodsReceiptDiscountType.PERCENT) {
      if (line.discountValue !== undefined && (line.discountValue < 0 || line.discountValue > 100)) {
        errors.push({ path: `${pathPrefix}.discountValue`, message: 'Percent discount must be between 0 and 100' });
      }
    } else if (normalizedDiscountType === GoodsReceiptDiscountType.AMOUNT) {
      if (line.discountValue !== undefined && line.discountValue < 0) {
        errors.push({ path: `${pathPrefix}.discountValue`, message: 'Amount discount must be >= 0' });
      }
    } else if (line.discountValue !== undefined) {
      errors.push({ path: `${pathPrefix}.discountType`, message: 'discountType is required when discountValue is provided' });
    }

    if (line.isBonus && line.unitCost !== 0) {
      errors.push({ path: `${pathPrefix}.unitCost`, message: 'unitCost must be 0 when isBonus is true' });
    }

    if (line.bonusQty !== undefined && line.bonusQty < 0) {
      errors.push({ path: `${pathPrefix}.bonusQty`, message: 'bonusQty must be >= 0' });
    }
    if ((line.bonusVariantId && line.bonusVariantQty === undefined) || (!line.bonusVariantId && line.bonusVariantQty !== undefined)) {
      errors.push({ path: `${pathPrefix}.bonusVariantId`, message: 'bonusVariantId and bonusVariantQty must be provided together' });
    }
    if (line.bonusVariantQty !== undefined && line.bonusVariantQty < 0) {
      errors.push({ path: `${pathPrefix}.bonusVariantQty`, message: 'bonusVariantQty must be >= 0' });
    }
    if (line.discountType && line.discountValue === undefined) {
      errors.push({ path: `${pathPrefix}.discountValue`, message: 'discountValue is required when discountType is provided' });
    }
    if (line.discountValue !== undefined && line.discountValue < 0) {
      errors.push({ path: `${pathPrefix}.discountValue`, message: 'discountValue must be >= 0' });
    }

    return { errors, warnings, normalizedDiscountType };
  }

  private resolveEffectiveReceiptUnitCost(
    line: { unitCost: number; discountType?: GoodsReceiptDiscountType; discountValue?: number; isBonus?: boolean },
    paidQty: number,
    totalQty: number,
  ): number {
    if (line.isBonus) {
      return 0;
    }
    const gross = line.unitCost * paidQty;
    const discount = this.resolveReceiptDiscount(line.discountType, line.discountValue, gross);
    const net = Math.max(gross - discount, 0);
    if (totalQty <= 0) {
      return 0;
    }
    return net / totalQty;
  }

  private resolveReceiptDiscount(
    discountType: GoodsReceiptDiscountType | undefined,
    discountValue: number | undefined,
    base: number,
  ): number {
    if (!discountType || discountValue === undefined || discountValue <= 0) {
      return 0;
    }
    if (discountType === GoodsReceiptDiscountType.PERCENT) {
      return (base * discountValue) / 100;
    }
    return discountValue;
  }

  private normalizeReceiptDiscountType(
    discountType: GoodsReceiptLineDto['discountType'],
  ): GoodsReceiptDiscountType | undefined {
    if (!discountType) {
      return undefined;
    }
    if (discountType === GoodsReceiptDiscountType.PERCENT_UPPER) {
      return GoodsReceiptDiscountType.PERCENT;
    }
    if (discountType === GoodsReceiptDiscountType.AMOUNT_UPPER) {
      return GoodsReceiptDiscountType.AMOUNT;
    }
    return discountType as GoodsReceiptDiscountType;
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

  private computeOrderTotal(
    lines: PurchaseOrderLine[],
    globalFreight?: number,
    globalExtraCosts?: number,
  ): number {
    const lineTotal = lines.reduce((sum, line) => {
      const qty = line.quantity ?? 0;
      const unitCost = line.unitCost ?? 0;
      const freight = line.freightCost ?? 0;
      const extras = line.extraCosts ?? 0;
      const base = qty * unitCost + freight + extras;
      const discount = this.resolveLineDiscount(line, base);
      return sum + base - discount;
    }, 0);
    return lineTotal + (globalFreight ?? 0) + (globalExtraCosts ?? 0);
  }

  private resolveLineDiscount(line: PurchaseOrderLine, base: number): number {
    if (!line.discountType || line.discountValue === undefined) {
      return 0;
    }
    if (line.discountType === PurchaseOrderLineDiscountType.PERCENT) {
      return (base * line.discountValue) / 100;
    }
    return line.discountValue;
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

  private async resolvePackaging(
    OrganizationId: string,
    packagingId: string,
  ): Promise<{ id: string; multiplier: number } | null> {
    const list = await this.packagingNamesService.list(OrganizationId);
    const match = list.find((item) => item.id === packagingId);
    if (!match) {
      return null;
    }
    return { id: match.id, multiplier: match.multiplier ?? 1 };
  }
}

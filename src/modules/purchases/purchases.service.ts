import { BadRequestException, Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { InventoryDirection } from '../inventory/entities/inventory-movement.entity';
import { InventoryService } from '../inventory/inventory.service';
import { ModuleStateService } from '../../core/database/module-state.service';
import { CreateGoodsReceiptDto, GoodsReceiptLineDto } from './dto/create-goods-receipt.dto';
import { ConfirmPurchaseOrderDto } from './dto/confirm-purchase-order.dto';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { PurchaseSuggestionQueryDto } from './dto/purchase-suggestion-query.dto';
import { GoodsReceiptNote } from './entities/goods-receipt-note.entity';
import { PurchaseOrder, PurchaseOrderStatus } from './entities/purchase-order.entity';
import { PurchaseOrderLine, PurchaseOrderLineStatus } from './entities/purchase-order-line.entity';
import { SupplierCostHistory } from './entities/supplier-cost-history.entity';

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
  workspaceId: string;
  companyId: string;
}

interface PurchasesState {
  suggestions: PurchaseSuggestion[];
  purchaseOrders: PurchaseOrder[];
  receipts: GoodsReceiptNote[];
  costHistory: SupplierCostHistory[];
  averageCosts: { variantId: string; averageCost: number; quantity: number }[];
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

  constructor(
    private readonly inventoryService: InventoryService,
    private readonly moduleState: ModuleStateService,
  ) {}

  async onModuleInit(): Promise<void> {
    const state = await this.moduleState.loadState<PurchasesState>(this.stateKey, {
      suggestions: [],
      purchaseOrders: [],
      receipts: [],
      costHistory: [],
      averageCosts: [],
    });
    this.suggestions = state.suggestions ?? [];
    this.purchaseOrders = state.purchaseOrders ?? [];
    this.receipts = state.receipts ?? [];
    this.costHistory = state.costHistory ?? [];
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
      ...this.suggestions.filter((s) => s.workspaceId !== query.workspaceId || s.companyId !== query.companyId),
    );

    const projections = this.inventoryService.listStock({ warehouseId: query.warehouseId });

    const workspaceProjections = projections.filter(
      (projection) => projection.workspaceId === query.workspaceId && projection.companyId === query.companyId,
    );

    workspaceProjections.forEach((projection) => {
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
        workspaceId: query.workspaceId,
        companyId: query.companyId,
      };

      this.suggestions.push(suggestion);
    });

    const result = this.suggestions.filter(
      (suggestion) => suggestion.workspaceId === query.workspaceId && suggestion.companyId === query.companyId,
    );
    this.persistState();
    return result;
  }

  createPurchaseOrder(dto: CreatePurchaseOrderDto): PurchaseOrder {
    const order: PurchaseOrder = {
      id: uuid(),
      supplierId: dto.supplierId,
      warehouseId: dto.warehouseId,
      status: PurchaseOrderStatus.DRAFT,
      workspaceId: dto.workspaceId,
      companyId: dto.companyId,
      lines: dto.lines.map((line) => this.mapOrderLine(line, dto.workspaceId, dto.companyId)),
    };

    this.applySuggestionDecisions(order, dto.rejectedSuggestionIds ?? []);
    this.purchaseOrders.push(order);
    this.persistState();
    return order;
  }

  confirmPurchaseOrder(orderId: string, dto: ConfirmPurchaseOrderDto): PurchaseOrder {
    const order = this.findOrder(orderId);
    this.ensureSameTenant(order.workspaceId, order.companyId, dto.workspaceId, dto.companyId);

    order.status = PurchaseOrderStatus.CONFIRMED;
    this.persistState();
    return order;
  }

  recordGoodsReceipt(dto: CreateGoodsReceiptDto): { receipt: GoodsReceiptNote; order?: PurchaseOrder } {
    const order = dto.purchaseOrderId ? this.findOrder(dto.purchaseOrderId) : undefined;

    if (order) {
      this.ensureSameTenant(order.workspaceId, order.companyId, dto.workspaceId, dto.companyId);
    }

    const receipt: GoodsReceiptNote = {
      id: uuid(),
      purchaseOrderId: order?.id,
      warehouseId: dto.warehouseId,
      workspaceId: dto.workspaceId,
      companyId: dto.companyId,
      lines: dto.lines.map((line) => this.mapReceiptLine(line, dto.workspaceId, dto.companyId)),
    };

    receipt.lines.forEach((line) => {
      const references: Record<string, any> = { grnId: receipt.id, warehouseId: receipt.warehouseId };
      if (order) {
        references.purchaseOrderId = order.id;
      }

      this.inventoryService.recordMovement({
        direction: InventoryDirection.IN,
        variantId: line.variantId,
        warehouseId: receipt.warehouseId,
        locationId: line.locationId,
        batchId: line.batchId,
        quantity: line.quantity,
        operationId: `${receipt.id}:${line.variantId}`,
        references,
        workspaceId: dto.workspaceId,
        companyId: dto.companyId,
      });

      this.updateAverageCost(line.variantId, line.quantity, line.unitCost);
      this.costHistory.push({
        id: uuid(),
        supplierId: order?.supplierId ?? 'unknown',
        variantId: line.variantId,
        unitCost: line.unitCost,
        currency: line.currency,
        workspaceId: dto.workspaceId,
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

  listReceipts(): GoodsReceiptNote[] {
    return this.receipts;
  }

  listCostHistory(): SupplierCostHistory[] {
    return this.costHistory;
  }

  listSuggestions(workspaceId: string, companyId: string): PurchaseSuggestion[] {
    return this.suggestions.filter((suggestion) => suggestion.workspaceId === workspaceId && suggestion.companyId === companyId);
  }

  private mapOrderLine(line: CreatePurchaseOrderDto['lines'][number], workspaceId: string, companyId: string): PurchaseOrderLine {
    const decision = this.suggestions.find(
      (suggestion) => suggestion.id === line.suggestionId && suggestion.workspaceId === workspaceId && suggestion.companyId === companyId,
    );

    if (decision) {
      decision.decision = line.quantity >= decision.recommendedQty ? 'accepted' : 'partially_accepted';
    }

    return {
      id: uuid(),
      variantId: line.variantId,
      quantity: line.quantity,
      receivedQuantity: 0,
      unitCost: line.unitCost,
      currency: line.currency,
      status: PurchaseOrderLineStatus.PENDING,
      suggestionId: line.suggestionId,
      workspaceId,
      companyId,
    };
  }

  private mapReceiptLine(line: GoodsReceiptLineDto, workspaceId: string, companyId: string) {
    const suggestion = line.suggestionId
      ? this.suggestions.find(
          (candidate) => candidate.id === line.suggestionId && candidate.workspaceId === workspaceId && candidate.companyId === companyId,
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
      workspaceId,
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
        (candidate) => candidate.id === id && candidate.workspaceId === order.workspaceId && candidate.companyId === order.companyId,
      );
      if (suggestion) {
        suggestion.decision = 'rejected';
      }
    });
  }

  private ensureSameTenant(entityWorkspace: string, entityCompany: string, workspaceId: string, companyId: string) {
    if (entityWorkspace !== workspaceId || entityCompany !== companyId) {
      throw new BadRequestException('Entity does not belong to the provided workspace/company');
    }
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
}

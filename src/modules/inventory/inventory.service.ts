import { BadRequestException, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { WarehousesService } from '../warehouses/warehouses.service';
import { RealtimeService } from '../../realtime/realtime.service';
import { ModuleStateService } from '../../core/database/module-state.service';
import { CreateInventoryMovementDto } from './dto/create-inventory-movement.dto';
import { StockQueryDto } from './dto/stock-query.dto';
import {
  InventoryDirection,
  InventoryMovementRecord,
} from './entities/inventory-movement.entity';
import { StockProjectionRecord } from './entities/stock-projection.entity';

interface ReserveStockDto {
  variantId: string;
  warehouseId: string;
  locationId?: string;
  batchId?: string;
  quantity: number;
  OrganizationId: string;
  companyId: string;
}

interface InventoryState {
  movements: InventoryMovementRecord[];
  projections: StockProjectionRecord[];
  reservations: (ReserveStockDto & { reservationId: string })[];
}

@Injectable()
export class InventoryService implements OnModuleInit {
  private readonly logger = new Logger(InventoryService.name);
  private readonly stateKey = 'module:inventory';
  private movements: InventoryMovementRecord[] = [];
  private projections: StockProjectionRecord[] = [];
  private operationIndex = new Map<string, InventoryMovementRecord>();
  private reservations = new Map<string, ReserveStockDto>();

  constructor(
    private readonly warehousesService: WarehousesService,
    private readonly realtimeService: RealtimeService,
    private readonly moduleState: ModuleStateService,
  ) {}

  async onModuleInit(): Promise<void> {
    const state = await this.moduleState.loadState<InventoryState>(this.stateKey, {
      movements: [],
      projections: [],
      reservations: [],
    });
    this.movements = state.movements ?? [];
    this.projections = state.projections ?? [];
    this.operationIndex = new Map(
      this.movements.map((movement) => [movement.operationId, movement]),
    );
    this.reservations = new Map(
      (state.reservations ?? []).map((reservation) => {
        const { reservationId, ...payload } = reservation;
        return [reservationId, payload];
      }),
    );
  }

  listStock(filters: StockQueryDto): StockProjectionRecord[] {
    return this.projections.filter((projection) => {
      if (filters.variantId && projection.variantId !== filters.variantId) return false;
      if (filters.warehouseId && projection.warehouseId !== filters.warehouseId) return false;
      if (filters.locationId && projection.locationId !== filters.locationId) return false;
      return true;
    });
  }

  recordMovement(dto: CreateInventoryMovementDto): { movement: InventoryMovementRecord; projection: StockProjectionRecord } {
    const duplicated = this.operationIndex.get(dto.operationId);
    if (duplicated) {
      const existingProjection = this.findProjection(dto.variantId, dto.warehouseId, dto.locationId, dto.batchId, dto.OrganizationId, dto.companyId);
      return { movement: duplicated, projection: existingProjection };
    }

    const warehouse = this.warehousesService.findOne(dto.warehouseId);
    if (warehouse.OrganizationId !== dto.OrganizationId || warehouse.companyId !== dto.companyId) {
      throw new BadRequestException('Warehouse does not belong to the provided Organization/company');
    }

    const projection = this.findOrCreateProjection(
      dto.variantId,
      dto.warehouseId,
      dto.locationId,
      dto.batchId,
      dto.OrganizationId,
      dto.companyId,
    );

    const nextOnHand = this.calculateOnHand(projection.onHand, dto.direction, dto.quantity);
    if (nextOnHand < 0 && !warehouse.allowNegativeStock) {
      throw new BadRequestException('Negative stock is not allowed for this warehouse');
    }

    projection.onHand = nextOnHand;
    projection.available = projection.onHand - projection.reserved;
    projection.version += 1;

    const movement: InventoryMovementRecord = {
      id: uuid(),
      createdAt: new Date(),
      direction: dto.direction,
      variantId: dto.variantId,
      warehouseId: dto.warehouseId,
      locationId: dto.locationId,
      batchId: dto.batchId,
      quantity: dto.quantity,
      operationId: dto.operationId,
      references: dto.references,
      OrganizationId: dto.OrganizationId,
      companyId: dto.companyId,
    };

    this.movements.push(movement);
    this.operationIndex.set(dto.operationId, movement);
    this.persistState();

    this.realtimeService.emitInventoryStockUpdated(projection);
    this.realtimeService.emitInventoryAlert(projection);
    this.realtimeService.auditMovementEvent(projection, movement);
    return { movement, projection };
  }

  reserveStock(reservationId: string, dto: ReserveStockDto): StockProjectionRecord {
    if (this.reservations.has(reservationId)) {
      return this.findProjection(dto.variantId, dto.warehouseId, dto.locationId, dto.batchId, dto.OrganizationId, dto.companyId);
    }

    const warehouse = this.warehousesService.findOne(dto.warehouseId);
    if (warehouse.OrganizationId !== dto.OrganizationId || warehouse.companyId !== dto.companyId) {
      throw new BadRequestException('Warehouse does not belong to the provided Organization/company');
    }

    const projection = this.findOrCreateProjection(
      dto.variantId,
      dto.warehouseId,
      dto.locationId,
      dto.batchId,
      dto.OrganizationId,
      dto.companyId,
    );

    const nextReserved = projection.reserved + dto.quantity;
    const nextAvailable = projection.onHand - nextReserved;

    if (nextAvailable < 0 && !warehouse.allowNegativeStock) {
      throw new BadRequestException('Insufficient available stock to reserve');
    }

    projection.reserved = nextReserved;
    projection.available = nextAvailable;
    projection.version += 1;
    this.reservations.set(reservationId, dto);
    this.persistState();
    this.realtimeService.emitInventoryStockUpdated(projection);
    this.realtimeService.emitInventoryAlert(projection);
    return projection;
  }

  releaseReservation(reservationId: string): StockProjectionRecord {
    const reservation = this.reservations.get(reservationId);
    if (!reservation) {
      throw new BadRequestException('Reservation not found');
    }

    const projection = this.findProjection(
      reservation.variantId,
      reservation.warehouseId,
      reservation.locationId,
      reservation.batchId,
      reservation.OrganizationId,
      reservation.companyId,
    );

    if (projection.reserved < reservation.quantity) {
      throw new BadRequestException('Cannot release more than reserved');
    }

    projection.reserved -= reservation.quantity;
    projection.available = projection.onHand - projection.reserved;
    projection.version += 1;
    this.reservations.delete(reservationId);
    this.persistState();
    this.realtimeService.emitInventoryStockUpdated(projection);
    this.realtimeService.emitInventoryAlert(projection);
    return projection;
  }

  private calculateOnHand(current: number, direction: InventoryDirection, quantity: number): number {
    switch (direction) {
      case InventoryDirection.IN:
      case InventoryDirection.TRANSFER_IN:
        return current + quantity;
      case InventoryDirection.OUT:
      case InventoryDirection.TRANSFER_OUT:
        return current - quantity;
      case InventoryDirection.ADJUST:
        return quantity;
      default:
        return current;
    }
  }

  private findProjection(
    variantId: string,
    warehouseId: string,
    locationId: string | undefined,
    batchId: string | undefined,
    OrganizationId: string,
    companyId: string,
  ): StockProjectionRecord {
    const keyMatcher = (projection: StockProjectionRecord) =>
      projection.variantId === variantId &&
      projection.warehouseId === warehouseId &&
      projection.locationId === locationId &&
      projection.batchId === batchId &&
      projection.OrganizationId === OrganizationId &&
      projection.companyId === companyId;

    const found = this.projections.find(keyMatcher);
    if (!found) {
      throw new BadRequestException('Stock projection not found for the provided scope');
    }
    return found;
  }

  private findOrCreateProjection(
    variantId: string,
    warehouseId: string,
    locationId: string | undefined,
    batchId: string | undefined,
    OrganizationId: string,
    companyId: string,
  ): StockProjectionRecord {
    const existing = this.projections.find(
      (projection) =>
        projection.variantId === variantId &&
        projection.warehouseId === warehouseId &&
        projection.locationId === locationId &&
        projection.batchId === batchId &&
        projection.OrganizationId === OrganizationId &&
        projection.companyId === companyId,
    );

    if (existing) {
      return existing;
    }

    const projection: StockProjectionRecord = {
      id: uuid(),
      variantId,
      warehouseId,
      locationId,
      batchId,
      onHand: 0,
      reserved: 0,
      available: 0,
      version: 0,
      OrganizationId,
      companyId,
    };

    this.projections.push(projection);
    return projection;
  }

  private persistState() {
    void this.moduleState
      .saveState<InventoryState>(this.stateKey, {
        movements: this.movements,
        projections: this.projections,
        reservations: Array.from(this.reservations.entries()).map(([reservationId, payload]) => ({
          reservationId,
          ...payload,
        })),
      })
      .catch((error) => {
        const message = error instanceof Error ? error.stack ?? error.message : String(error);
        this.logger.error(`Failed to persist inventory state: ${message}`);
      });
  }
}

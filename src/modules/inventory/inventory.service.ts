import { BadRequestException, Injectable } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { WarehousesService } from '../warehouses/warehouses.service';
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
  workspaceId: string;
  companyId: string;
}

@Injectable()
export class InventoryService {
  private readonly movements: InventoryMovementRecord[] = [];
  private readonly projections: StockProjectionRecord[] = [];
  private readonly operationIndex = new Map<string, InventoryMovementRecord>();
  private readonly reservations = new Map<string, ReserveStockDto>();

  constructor(private readonly warehousesService: WarehousesService) {}

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
      const existingProjection = this.findProjection(dto.variantId, dto.warehouseId, dto.locationId, dto.batchId, dto.workspaceId, dto.companyId);
      return { movement: duplicated, projection: existingProjection };
    }

    const warehouse = this.warehousesService.findOne(dto.warehouseId);
    if (warehouse.workspaceId !== dto.workspaceId || warehouse.companyId !== dto.companyId) {
      throw new BadRequestException('Warehouse does not belong to the provided workspace/company');
    }

    const projection = this.findOrCreateProjection(
      dto.variantId,
      dto.warehouseId,
      dto.locationId,
      dto.batchId,
      dto.workspaceId,
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
      workspaceId: dto.workspaceId,
      companyId: dto.companyId,
    };

    this.movements.push(movement);
    this.operationIndex.set(dto.operationId, movement);

    return { movement, projection };
  }

  reserveStock(reservationId: string, dto: ReserveStockDto): StockProjectionRecord {
    if (this.reservations.has(reservationId)) {
      return this.findProjection(dto.variantId, dto.warehouseId, dto.locationId, dto.batchId, dto.workspaceId, dto.companyId);
    }

    const warehouse = this.warehousesService.findOne(dto.warehouseId);
    if (warehouse.workspaceId !== dto.workspaceId || warehouse.companyId !== dto.companyId) {
      throw new BadRequestException('Warehouse does not belong to the provided workspace/company');
    }

    const projection = this.findOrCreateProjection(
      dto.variantId,
      dto.warehouseId,
      dto.locationId,
      dto.batchId,
      dto.workspaceId,
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
      reservation.workspaceId,
      reservation.companyId,
    );

    if (projection.reserved < reservation.quantity) {
      throw new BadRequestException('Cannot release more than reserved');
    }

    projection.reserved -= reservation.quantity;
    projection.available = projection.onHand - projection.reserved;
    projection.version += 1;
    this.reservations.delete(reservationId);
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
    workspaceId: string,
    companyId: string,
  ): StockProjectionRecord {
    const keyMatcher = (projection: StockProjectionRecord) =>
      projection.variantId === variantId &&
      projection.warehouseId === warehouseId &&
      projection.locationId === locationId &&
      projection.batchId === batchId &&
      projection.workspaceId === workspaceId &&
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
    workspaceId: string,
    companyId: string,
  ): StockProjectionRecord {
    const existing = this.projections.find(
      (projection) =>
        projection.variantId === variantId &&
        projection.warehouseId === warehouseId &&
        projection.locationId === locationId &&
        projection.batchId === batchId &&
        projection.workspaceId === workspaceId &&
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
      workspaceId,
      companyId,
    };

    this.projections.push(projection);
    return projection;
  }
}

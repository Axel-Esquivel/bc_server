import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Schema as MongooseSchema } from 'mongoose';
import { createBusinessEvent } from '../../core/events/business-event';
import { CoreEventsService } from '../../core/events/core-events.service';
import { OrganizationsService } from '../organizations/organizations.service';
import { OrganizationModuleStatus } from '../organizations/types/module-state.types';
import { LocationsService } from '../locations/locations.service';
import { OutboxService } from '../outbox/outbox.service';
import { Stock, StockDocument } from '../stock/entities/stock.entity';
import type { JsonObject } from '../../core/events/business-event';
import { PostStockMovementDto } from './dto/post-stock-movement.dto';
import { StockMovementQueryDto } from './dto/stock-movement-query.dto';
import {
  StockMovement,
  StockMovementDocument,
  StockMovementStatus,
  StockMovementType,
} from './entities/stock-movement.entity';

export interface StockMovementRecord {
  id: string;
  organizationId: string;
  enterpriseId: string;
  type: StockMovementType;
  productId: string;
  qty: number;
  fromLocationId: string | null;
  toLocationId: string | null;
  unitCost: number;
  reference: {
    module: string;
    entity: string;
    entityId: string;
    lineId: string;
  };
  status: StockMovementStatus;
  createdAt?: Date;
}

interface StockMovedEventPayload extends JsonObject {
  movementId: string;
  enterpriseId: string;
  productId: string;
  qty: number;
  fromLocationId: string | null;
  toLocationId: string | null;
}

@Injectable()
export class StockMovementsService {
  private readonly logger = new Logger(StockMovementsService.name);

  constructor(
    @InjectModel(StockMovement.name)
    private readonly movementModel: Model<StockMovementDocument>,
    @InjectModel(Stock.name)
    private readonly stockModel: Model<StockDocument>,
    private readonly locationsService: LocationsService,
    private readonly outboxService: OutboxService,
    private readonly organizationsService: OrganizationsService,
    private readonly coreEvents: CoreEventsService,
  ) {}

  async postMovement(dto: PostStockMovementDto): Promise<StockMovementRecord> {
    this.assertOrgEnterprise(dto.organizationId, dto.enterpriseId);
    if (!dto.productId?.trim()) {
      throw new BadRequestException('ProductId is required');
    }
    if (!dto.qty || dto.qty <= 0) {
      throw new BadRequestException('Qty must be greater than zero');
    }

    const fromLocationId = dto.fromLocationId ?? null;
    const toLocationId = dto.toLocationId ?? null;

    this.validateMovementLocations(dto.type, fromLocationId, toLocationId);

    const existing = await this.findByReference(dto);
    if (existing) {
      return existing;
    }

    const fromLocation = fromLocationId ? await this.locationsService.findOne(fromLocationId) : null;
    const toLocation = toLocationId ? await this.locationsService.findOne(toLocationId) : null;

    if (fromLocation && !this.sameScope(dto, fromLocation.organizationId, fromLocation.enterpriseId)) {
      throw new BadRequestException('From location belongs to another organization or enterprise');
    }
    if (toLocation && !this.sameScope(dto, toLocation.organizationId, toLocation.enterpriseId)) {
      throw new BadRequestException('To location belongs to another organization or enterprise');
    }

    const allowNegative = dto.allowNegative ?? false;
    const qty = dto.qty;
    const productId = dto.productId.trim();
    const organizationId = dto.organizationId.trim();
    const enterpriseId = dto.enterpriseId.trim();

    try {
      switch (dto.type) {
        case StockMovementType.IN:
        case StockMovementType.RETURN:
          await this.incrementStock(organizationId, enterpriseId, productId, toLocation, qty, dto.unitCost);
          break;
        case StockMovementType.OUT:
        case StockMovementType.SCRAP:
          await this.decrementStock(organizationId, enterpriseId, productId, fromLocation, qty, allowNegative);
          break;
        case StockMovementType.INTERNAL:
          await this.decrementStock(organizationId, enterpriseId, productId, fromLocation, qty, allowNegative);
          try {
            await this.incrementStock(organizationId, enterpriseId, productId, toLocation, qty, dto.unitCost);
          } catch (error) {
            await this.incrementStock(organizationId, enterpriseId, productId, fromLocation, qty, dto.unitCost);
            throw error;
          }
          break;
        case StockMovementType.ADJUST:
          if (toLocation) {
            await this.incrementStock(organizationId, enterpriseId, productId, toLocation, qty, dto.unitCost);
          } else if (fromLocation) {
            await this.decrementStock(organizationId, enterpriseId, productId, fromLocation, qty, allowNegative);
          }
          break;
        default:
          throw new BadRequestException('Unsupported stock movement type');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to update stock: ${message}`);
      throw error;
    }

    const created = await this.movementModel.create({
      organizationId,
      enterpriseId,
      type: dto.type,
      productId,
      qty,
      fromLocationId: fromLocation ? new MongooseSchema.Types.ObjectId(fromLocation.id) : null,
      toLocationId: toLocation ? new MongooseSchema.Types.ObjectId(toLocation.id) : null,
      unitCost: dto.unitCost ?? 0,
      reference: dto.reference,
      status: StockMovementStatus.POSTED,
    });

    const record = this.toRecord(created);
    await this.emitMovementEvents(record);
    return record;
  }

  async list(query: StockMovementQueryDto): Promise<StockMovementRecord[]> {
    this.assertOrgEnterprise(query.organizationId, query.enterpriseId);
    const filters: Record<string, unknown> = {
      organizationId: query.organizationId.trim(),
      enterpriseId: query.enterpriseId.trim(),
    };

    if (query.productId) {
      filters.productId = query.productId.trim();
    }

    if (query.fromDate || query.toDate) {
      const range: Record<string, Date> = {};
      if (query.fromDate) {
        range.$gte = new Date(query.fromDate);
      }
      if (query.toDate) {
        range.$lte = new Date(query.toDate);
      }
      filters.createdAt = range;
    }

    if (query.warehouseId) {
      const locations = await this.locationsService.listByWarehouse({
        organizationId: query.organizationId,
        enterpriseId: query.enterpriseId,
        warehouseId: query.warehouseId,
      });
      if (!locations.length) {
        return [];
      }
      const locationIds = locations.map((location) => new MongooseSchema.Types.ObjectId(location.id));
      filters.$or = [
        { fromLocationId: { $in: locationIds } },
        { toLocationId: { $in: locationIds } },
      ];
    }

    const movements = await this.movementModel.find(filters).sort({ createdAt: -1 }).lean<StockMovementDocument[]>().exec();
    return movements.map((movement) => this.toRecord(movement));
  }

  private async emitMovementEvents(movement: StockMovementRecord): Promise<void> {
    const payload: StockMovedEventPayload = {
      movementId: movement.id,
      enterpriseId: movement.enterpriseId,
      productId: movement.productId,
      qty: movement.qty,
      fromLocationId: movement.fromLocationId,
      toLocationId: movement.toLocationId,
    };

    try {
      await this.outboxService.add({
        organizationId: movement.organizationId,
        enterpriseId: movement.enterpriseId,
        moduleKey: 'stock',
        eventType: movement.type === StockMovementType.ADJUST ? 'StockAdjusted' : 'StockMoved',
        payload,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to emit stock movement event: ${message}`);
    }

    await this.emitAccountingEvent(movement, payload);
  }

  private async incrementStock(
    organizationId: string,
    enterpriseId: string,
    productId: string,
    location: { id: string; warehouseId: string } | null,
    qty: number,
    unitCost?: number,
  ): Promise<void> {
    if (!location) {
      throw new BadRequestException('To location is required');
    }
    const now = new Date();
    await this.stockModel
      .updateOne(
        {
          organizationId,
          enterpriseId,
          productId,
          locationId: new MongooseSchema.Types.ObjectId(location.id),
        },
        {
          $inc: { onHand: qty },
          $set: { updatedAt: now },
          $setOnInsert: {
            warehouseId: new MongooseSchema.Types.ObjectId(location.warehouseId),
            avgCost: unitCost ?? 0,
            reserved: 0,
          },
        },
        { upsert: true },
      )
      .exec();
  }

  private async decrementStock(
    organizationId: string,
    enterpriseId: string,
    productId: string,
    location: { id: string; warehouseId: string } | null,
    qty: number,
    allowNegative: boolean,
  ): Promise<void> {
    if (!location) {
      throw new BadRequestException('From location is required');
    }
    const now = new Date();
    const filter: Record<string, unknown> = {
      organizationId,
      enterpriseId,
      productId,
      locationId: new MongooseSchema.Types.ObjectId(location.id),
    };
    if (!allowNegative) {
      filter.onHand = { $gte: qty };
    }
    const result = await this.stockModel
      .updateOne(
        filter,
        {
          $inc: { onHand: -qty },
          $set: { updatedAt: now },
        },
      )
      .exec();
    if (!result.matchedCount) {
      throw new BadRequestException('Insufficient stock for movement');
    }
  }

  private validateMovementLocations(
    type: StockMovementType,
    fromLocationId: string | null,
    toLocationId: string | null,
  ): void {
    switch (type) {
      case StockMovementType.IN:
      case StockMovementType.RETURN:
        if (!toLocationId) {
          throw new BadRequestException('ToLocationId is required');
        }
        break;
      case StockMovementType.OUT:
      case StockMovementType.SCRAP:
        if (!fromLocationId) {
          throw new BadRequestException('FromLocationId is required');
        }
        break;
      case StockMovementType.INTERNAL:
        if (!fromLocationId || !toLocationId) {
          throw new BadRequestException('FromLocationId and ToLocationId are required');
        }
        if (fromLocationId === toLocationId) {
          throw new BadRequestException('FromLocationId and ToLocationId must be different');
        }
        break;
      case StockMovementType.ADJUST:
        if (fromLocationId && toLocationId) {
          throw new BadRequestException('Adjust movements cannot specify both locations');
        }
        if (!fromLocationId && !toLocationId) {
          throw new BadRequestException('Adjust movements require one location');
        }
        break;
      default:
        break;
    }
  }

  private toRecord(movement: StockMovementDocument): StockMovementRecord {
    return {
      id: movement._id.toString(),
      organizationId: movement.organizationId,
      enterpriseId: movement.enterpriseId,
      type: movement.type,
      productId: movement.productId,
      qty: movement.qty,
      fromLocationId: movement.fromLocationId ? movement.fromLocationId.toString() : null,
      toLocationId: movement.toLocationId ? movement.toLocationId.toString() : null,
      unitCost: movement.unitCost,
      reference: {
        module: movement.reference.module,
        entity: movement.reference.entity,
        entityId: movement.reference.entityId,
        lineId: movement.reference.lineId,
      },
      status: movement.status,
      createdAt: movement.createdAt,
    };
  }

  private assertOrgEnterprise(organizationId: string, enterpriseId: string): void {
    if (!organizationId?.trim()) {
      throw new BadRequestException('OrganizationId is required');
    }
    if (!enterpriseId?.trim()) {
      throw new BadRequestException('EnterpriseId is required');
    }
  }

  private sameScope(
    dto: { organizationId: string; enterpriseId: string },
    organizationId: string,
    enterpriseId: string,
  ): boolean {
    return dto.organizationId.trim() === organizationId && dto.enterpriseId.trim() === enterpriseId;
  }

  private async findByReference(dto: PostStockMovementDto): Promise<StockMovementRecord | null> {
    const reference = dto.reference;
    const existing = await this.movementModel
      .findOne({
        organizationId: dto.organizationId.trim(),
        enterpriseId: dto.enterpriseId.trim(),
        'reference.module': reference.module,
        'reference.entity': reference.entity,
        'reference.entityId': reference.entityId,
        'reference.lineId': reference.lineId,
      })
      .lean<StockMovementDocument>()
      .exec();
    return existing ? this.toRecord(existing) : null;
  }

  private async emitAccountingEvent(
    movement: StockMovementRecord,
    payload: StockMovedEventPayload,
  ): Promise<void> {
    try {
      const state = await this.organizationsService.getModuleState(movement.organizationId, 'accounting');
      if (state.status === OrganizationModuleStatus.Disabled) {
        return;
      }
      const eventType = movement.type === StockMovementType.ADJUST ? 'StockAdjusted' : 'StockMoved';
      const event = createBusinessEvent({
        type: eventType,
        organizationId: movement.organizationId,
        context: { enterpriseId: movement.enterpriseId },
        ref: { entity: 'stock-movement', id: movement.id },
        payload,
      });
      await this.coreEvents.enqueue(event);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to enqueue accounting event: ${message}`);
    }
  }
}

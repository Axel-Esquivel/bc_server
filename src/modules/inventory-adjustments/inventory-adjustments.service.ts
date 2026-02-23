import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Schema as MongooseSchema } from 'mongoose';
import { v4 as uuid } from 'uuid';
import { Stock, StockDocument } from '../stock/entities/stock.entity';
import { PostStockMovementDto } from '../stock-movements/dto/post-stock-movement.dto';
import { StockMovementType } from '../stock-movements/entities/stock-movement.entity';
import { StockMovementsService } from '../stock-movements/stock-movements.service';
import { CreateAdjustmentDto } from './dto/create-adjustment.dto';
import { AdjustmentQueryDto } from './dto/adjustment-query.dto';
import {
  InventoryAdjustment,
  InventoryAdjustmentDocument,
  InventoryAdjustmentLine,
  InventoryAdjustmentState,
} from './entities/inventory-adjustment.entity';

export interface InventoryAdjustmentRecord {
  id: string;
  organizationId: string;
  enterpriseId: string;
  warehouseId: string;
  locationId: string;
  state: InventoryAdjustmentState;
  lines: Array<{ lineId: string; productId: string; countedQty: number }>;
  postedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

@Injectable()
export class InventoryAdjustmentsService {
  constructor(
    @InjectModel(InventoryAdjustment.name)
    private readonly adjustmentModel: Model<InventoryAdjustmentDocument>,
    @InjectModel(Stock.name)
    private readonly stockModel: Model<StockDocument>,
    private readonly stockMovementsService: StockMovementsService,
  ) {}

  async createAdjustment(dto: CreateAdjustmentDto): Promise<InventoryAdjustmentRecord> {
    this.assertOrgEnterprise(dto.organizationId, dto.enterpriseId);
    if (!dto.lines?.length) {
      throw new BadRequestException('Adjustment requires lines');
    }
    const lines: InventoryAdjustmentLine[] = dto.lines.map((line) => ({
      lineId: uuid(),
      productId: line.productId.trim(),
      countedQty: line.countedQty,
    }));
    const created = await this.adjustmentModel.create({
      organizationId: dto.organizationId,
      enterpriseId: dto.enterpriseId,
      warehouseId: new MongooseSchema.Types.ObjectId(dto.warehouseId),
      locationId: new MongooseSchema.Types.ObjectId(dto.locationId),
      state: 'draft',
      lines,
    });
    return this.toRecord(created);
  }

  async startCount(id: string): Promise<InventoryAdjustmentRecord> {
    const adjustment = await this.getAdjustment(id);
    if (adjustment.state === 'counting') {
      return adjustment;
    }
    if (adjustment.state !== 'draft') {
      throw new BadRequestException('Adjustment must be in draft to start count');
    }
    await this.adjustmentModel.updateOne(
      { _id: new MongooseSchema.Types.ObjectId(adjustment.id) },
      { $set: { state: 'counting' } },
    ).exec();
    return { ...adjustment, state: 'counting' };
  }

  async postAdjustment(id: string): Promise<InventoryAdjustmentRecord> {
    const adjustment = await this.getAdjustment(id);
    if (adjustment.state === 'posted') {
      return adjustment;
    }
    if (adjustment.state !== 'counting') {
      throw new BadRequestException('Adjustment must be in counting to post');
    }

    for (const line of adjustment.lines) {
      const onHand = await this.getOnHand(
        adjustment.organizationId,
        adjustment.enterpriseId,
        line.productId,
        adjustment.locationId,
      );
      const delta = line.countedQty - onHand;
      if (delta === 0) {
        continue;
      }
      const movement: PostStockMovementDto = {
        organizationId: adjustment.organizationId,
        enterpriseId: adjustment.enterpriseId,
        type: StockMovementType.ADJUST,
        productId: line.productId,
        qty: Math.abs(delta),
        fromLocationId: delta < 0 ? adjustment.locationId : undefined,
        toLocationId: delta > 0 ? adjustment.locationId : undefined,
        unitCost: 0,
        allowNegative: false,
        reference: {
          module: 'inventory-adjustments',
          entity: 'adjustment',
          entityId: adjustment.id,
          lineId: line.lineId,
        },
      };
      await this.stockMovementsService.postMovement(movement);
    }

    const postedAt = new Date();
    await this.adjustmentModel.updateOne(
      { _id: new MongooseSchema.Types.ObjectId(adjustment.id) },
      { $set: { state: 'posted', postedAt } },
    ).exec();

    return { ...adjustment, state: 'posted', postedAt };
  }

  async list(query: AdjustmentQueryDto): Promise<InventoryAdjustmentRecord[]> {
    this.assertOrgEnterprise(query.organizationId, query.enterpriseId);
    const filters: Record<string, unknown> = {
      organizationId: query.organizationId,
      enterpriseId: query.enterpriseId,
    };
    if (query.warehouseId) {
      filters.warehouseId = new MongooseSchema.Types.ObjectId(query.warehouseId);
    }
    if (query.locationId) {
      filters.locationId = new MongooseSchema.Types.ObjectId(query.locationId);
    }
    if (query.state) {
      filters.state = query.state;
    }
    const adjustments = await this.adjustmentModel
      .find(filters)
      .sort({ createdAt: -1 })
      .lean<InventoryAdjustmentDocument[]>()
      .exec();
    return adjustments.map((adjustment) => this.toRecord(adjustment));
  }

  private async getOnHand(
    organizationId: string,
    enterpriseId: string,
    productId: string,
    locationId: string,
  ): Promise<number> {
    const record = await this.stockModel
      .findOne({
        organizationId,
        enterpriseId,
        productId,
        locationId: new MongooseSchema.Types.ObjectId(locationId),
      })
      .lean<StockDocument>()
      .exec();
    return record?.onHand ?? 0;
  }

  private async getAdjustment(id: string): Promise<InventoryAdjustmentRecord> {
    const adjustment = await this.adjustmentModel
      .findById(id)
      .lean<InventoryAdjustmentDocument>()
      .exec();
    if (!adjustment) {
      throw new BadRequestException('Adjustment not found');
    }
    return this.toRecord(adjustment);
  }

  private toRecord(adjustment: InventoryAdjustmentDocument): InventoryAdjustmentRecord {
    return {
      id: adjustment._id.toString(),
      organizationId: adjustment.organizationId,
      enterpriseId: adjustment.enterpriseId,
      warehouseId: adjustment.warehouseId.toString(),
      locationId: adjustment.locationId.toString(),
      state: adjustment.state,
      lines: adjustment.lines.map((line) => ({
        lineId: line.lineId,
        productId: line.productId,
        countedQty: line.countedQty,
      })),
      postedAt: adjustment.postedAt,
      createdAt: adjustment.createdAt,
      updatedAt: adjustment.updatedAt,
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
}

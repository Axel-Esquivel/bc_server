import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model, Schema as MongooseSchema } from 'mongoose';
import { StockQueryDto } from './dto/stock-query.dto';
import { Stock, StockDocument } from './entities/stock.entity';

export interface StockRecord {
  id: string;
  organizationId: string;
  enterpriseId: string;
  productId: string;
  warehouseId: string;
  locationId: string;
  onHand: number;
  reserved: number;
  avgCost: number;
  createdAt?: Date;
  updatedAt?: Date;
}

@Injectable()
export class StockService {
  constructor(@InjectModel(Stock.name) private readonly stockModel: Model<StockDocument>) {}

  async list(query: StockQueryDto): Promise<StockRecord[]> {
    this.assertOrgEnterprise(query.organizationId, query.enterpriseId);
    const filters: Record<string, unknown> = {
      organizationId: query.organizationId.trim(),
      enterpriseId: query.enterpriseId.trim(),
    };
    if (query.warehouseId) {
      filters.warehouseId = this.ensureObjectId(query.warehouseId, 'WarehouseId is invalid');
    }
    if (query.locationId) {
      filters.locationId = this.ensureObjectId(query.locationId, 'LocationId is invalid');
    }
    if (query.productId) {
      filters.productId = query.productId.trim();
    }
    const records = await this.stockModel.find(filters).lean<StockDocument[]>().exec();
    return records.map((record) => this.toRecord(record));
  }

  async getByLocation(organizationId: string, enterpriseId: string, locationId: string): Promise<StockRecord[]> {
    this.assertOrgEnterprise(organizationId, enterpriseId);
    const records = await this.stockModel
      .find({
        organizationId: organizationId.trim(),
        enterpriseId: enterpriseId.trim(),
        locationId: this.ensureObjectId(locationId, 'LocationId is invalid'),
      })
      .lean<StockDocument[]>()
      .exec();
    return records.map((record) => this.toRecord(record));
  }

  async getByWarehouse(organizationId: string, enterpriseId: string, warehouseId: string): Promise<StockRecord[]> {
    this.assertOrgEnterprise(organizationId, enterpriseId);
    const records = await this.stockModel
      .find({
        organizationId: organizationId.trim(),
        enterpriseId: enterpriseId.trim(),
        warehouseId: this.ensureObjectId(warehouseId, 'WarehouseId is invalid'),
      })
      .lean<StockDocument[]>()
      .exec();
    return records.map((record) => this.toRecord(record));
  }

  async getByProduct(organizationId: string, enterpriseId: string, productId: string): Promise<StockRecord[]> {
    this.assertOrgEnterprise(organizationId, enterpriseId);
    if (!productId?.trim()) {
      throw new BadRequestException('ProductId is required');
    }
    const records = await this.stockModel
      .find({
        organizationId: organizationId.trim(),
        enterpriseId: enterpriseId.trim(),
        productId: productId.trim(),
      })
      .lean<StockDocument[]>()
      .exec();
    return records.map((record) => this.toRecord(record));
  }

  private toRecord(record: StockDocument): StockRecord {
    return {
      id: record._id.toString(),
      organizationId: record.organizationId,
      enterpriseId: record.enterpriseId,
      productId: record.productId ?? '',
      warehouseId: record.warehouseId ? record.warehouseId.toString() : '',
      locationId: record.locationId ? record.locationId.toString() : '',
      onHand: record.onHand,
      reserved: record.reserved,
      avgCost: record.avgCost,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }

  private ensureObjectId(value: string, message: string): MongooseSchema.Types.ObjectId {
    if (!isValidObjectId(value)) {
      throw new BadRequestException(message);
    }
    return new MongooseSchema.Types.ObjectId(value);
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

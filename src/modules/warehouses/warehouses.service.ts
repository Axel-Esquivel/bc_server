import { BadRequestException, Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { LocationsService } from '../locations/locations.service';
import { CreateWarehouseDto } from './dto/create-warehouse.dto';
import { UpdateWarehouseDto } from './dto/update-warehouse.dto';
import { WarehouseListQueryDto } from './dto/warehouse-list-query.dto';
import { Warehouse, WarehouseDocument, WarehouseType } from './entities/warehouse.entity';

export interface WarehouseRecord {
  id: string;
  organizationId: string;
  enterpriseId: string;
  code: string;
  name: string;
  active: boolean;
  type: WarehouseType;
  allowNegativeStock: boolean;
  allowCountingLock: boolean;
  companyId: string;
  branchId: string;
  createdAt?: Date;
  updatedAt?: Date;
  OrganizationId: string;
}

@Injectable()
export class WarehousesService implements OnModuleInit {
  private readonly logger = new Logger(WarehousesService.name);
  private cache: WarehouseRecord[] = [];

  constructor(
    @InjectModel(Warehouse.name) private readonly warehouseModel: Model<WarehouseDocument>,
    private readonly locationsService: LocationsService,
  ) {}

  async onModuleInit(): Promise<void> {
    const warehouses = await this.warehouseModel.find().lean<WarehouseDocument[]>().exec();
    this.cache = warehouses.map((warehouse) => this.toRecord(warehouse));
  }

  async create(dto: CreateWarehouseDto): Promise<WarehouseRecord> {
    const organizationId = this.resolveOrganizationId(dto);
    const enterpriseId = this.resolveEnterpriseId(dto.enterpriseId);
    const name = this.normalizeName(dto.name, 'Warehouse name is required');
    const code = this.normalizeCode(dto.code, 'Warehouse code is required');

    const existing = await this.warehouseModel
      .findOne({ organizationId, enterpriseId, code })
      .lean<WarehouseDocument>()
      .exec();
    if (existing) {
      throw new BadRequestException('Warehouse code already exists');
    }

    const created = await this.warehouseModel.create({
      organizationId,
      enterpriseId,
      name,
      code,
      active: dto.active ?? true,
      type: dto.type ?? WarehouseType.WAREHOUSE,
      allowNegativeStock: dto.allowNegativeStock ?? false,
      allowCountingLock: dto.allowCountingLock ?? true,
      companyId: dto.companyId?.trim() ?? '',
      branchId: dto.branchId?.trim() ?? '',
    });

    try {
      await this.locationsService.createRootLocationsForWarehouse(created._id.toString(), {
        organizationId,
        enterpriseId,
        warehouseCode: created.code,
      });
    } catch (error) {
      await this.warehouseModel.deleteOne({ _id: created._id }).exec();
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to seed warehouse locations: ${message}`);
      throw error;
    }

    const record = this.toRecord(created);
    this.cache.push(record);
    return record;
  }

  async findAll(filters?: WarehouseListQueryDto): Promise<WarehouseRecord[]> {
    const organizationId = filters?.organizationId ?? filters?.OrganizationId;
    const enterpriseId = filters?.enterpriseId;
    const active = filters?.active;
    const filtered = this.cache.filter((warehouse) => {
      if (organizationId && warehouse.organizationId !== organizationId.trim()) return false;
      if (enterpriseId && warehouse.enterpriseId !== enterpriseId.trim()) return false;
      if (active !== undefined && warehouse.active !== active) return false;
      return true;
    });
    if (enterpriseId && filtered.length === 0 && organizationId) {
      return this.cache.filter((warehouse) => {
        if (warehouse.organizationId !== organizationId.trim()) return false;
        if (active !== undefined && warehouse.active !== active) return false;
        return true;
      });
    }
    return filtered;
  }

  findOne(id: string): WarehouseRecord {
    const warehouse = this.cache.find((item) => item.id === id);
    if (!warehouse) {
      throw new NotFoundException('Warehouse not found');
    }
    return warehouse;
  }

  async update(id: string, dto: UpdateWarehouseDto): Promise<WarehouseRecord> {
    const warehouse = this.findOne(id);

    if (dto.organizationId || dto.OrganizationId) {
      const nextOrg = this.resolveOrganizationId(dto);
      if (nextOrg !== warehouse.organizationId) {
        throw new BadRequestException('Warehouse organization cannot be changed');
      }
    }
    if (dto.enterpriseId) {
      const nextEnterpriseId = dto.enterpriseId.trim();
      if (nextEnterpriseId !== warehouse.enterpriseId) {
        throw new BadRequestException('Warehouse enterprise cannot be changed');
      }
    }

    const nextName = dto.name ? this.normalizeName(dto.name, 'Warehouse name is required') : warehouse.name;
    const nextCode = dto.code ? this.normalizeCode(dto.code, 'Warehouse code is required') : warehouse.code;
    if (nextCode !== warehouse.code) {
      const duplicated = await this.warehouseModel
        .findOne({
          _id: { $ne: id },
          organizationId: warehouse.organizationId,
          enterpriseId: warehouse.enterpriseId,
          code: nextCode,
        })
        .lean<WarehouseDocument>()
        .exec();
      if (duplicated) {
        throw new BadRequestException('Warehouse code already exists');
      }
    }

    const next = {
      name: nextName,
      code: nextCode,
      active: dto.active ?? warehouse.active,
      type: dto.type ?? warehouse.type,
      allowNegativeStock: dto.allowNegativeStock ?? warehouse.allowNegativeStock,
      allowCountingLock: dto.allowCountingLock ?? warehouse.allowCountingLock,
      companyId: dto.companyId?.trim() ?? warehouse.companyId,
      branchId: dto.branchId?.trim() ?? warehouse.branchId,
    };

    await this.warehouseModel.updateOne({ _id: id }, { $set: next }).exec();
    const updated = { ...warehouse, ...next };
    const index = this.cache.findIndex((item) => item.id === id);
    if (index !== -1) {
      this.cache[index] = updated;
    }
    return updated;
  }

  async remove(id: string): Promise<void> {
    const warehouse = this.findOne(id);
    if (!warehouse.active) {
      return;
    }
    await this.warehouseModel.updateOne({ _id: id }, { $set: { active: false } }).exec();
    const index = this.cache.findIndex((item) => item.id === id);
    if (index !== -1) {
      this.cache[index] = { ...warehouse, active: false };
    }
  }

  private toRecord(warehouse: WarehouseDocument): WarehouseRecord {
    return {
      id: warehouse._id.toString(),
      organizationId: warehouse.organizationId,
      enterpriseId: warehouse.enterpriseId,
      code: warehouse.code,
      name: warehouse.name,
      active: warehouse.active,
      type: warehouse.type,
      allowNegativeStock: warehouse.allowNegativeStock,
      allowCountingLock: warehouse.allowCountingLock,
      companyId: warehouse.companyId ?? '',
      branchId: warehouse.branchId ?? '',
      createdAt: warehouse.createdAt,
      updatedAt: warehouse.updatedAt,
      OrganizationId: warehouse.organizationId,
    };
  }

  private resolveOrganizationId(dto: { organizationId?: string; OrganizationId?: string }): string {
    const organizationId = dto.organizationId ?? dto.OrganizationId;
    if (!organizationId?.trim()) {
      throw new BadRequestException('OrganizationId is required');
    }
    return organizationId.trim();
  }

  private resolveEnterpriseId(enterpriseId?: string): string {
    if (!enterpriseId?.trim()) {
      throw new BadRequestException('EnterpriseId is required');
    }
    return enterpriseId.trim();
  }

  private normalizeCode(value: string | undefined, message: string): string {
    const code = value?.trim().toUpperCase();
    if (!code) {
      throw new BadRequestException(message);
    }
    return code;
  }

  private normalizeName(value: string | undefined, message: string): string {
    const name = value?.trim();
    if (!name) {
      throw new BadRequestException(message);
    }
    return name;
  }

}

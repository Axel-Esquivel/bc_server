import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model, Schema as MongooseSchema } from 'mongoose';
import { CreateLocationDto } from './dto/create-location.dto';
import { LocationListQueryDto } from './dto/location-list-query.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { Location, LocationDocument, LocationType, LocationUsage } from './entities/location.entity';

export interface LocationRecord {
  id: string;
  organizationId: string;
  enterpriseId: string;
  warehouseId: string;
  parentLocationId: string | null;
  name: string;
  code: string;
  level: number;
  path: string;
  type: LocationType;
  usage: LocationUsage;
  active: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface LocationTreeNode extends LocationRecord {
  children: LocationTreeNode[];
}

export const LOCATION_CODES = {
  STOCK: 'STOCK',
  RECEIVING: 'RECEIVING',
  SHIPPING: 'SHIPPING',
  TRANSIT: 'TRANSIT',
  SCRAP: 'SCRAP',
} as const;

export const DEFAULT_ROOT_LOCATIONS: Array<{
  code: string;
  name: string;
  type: LocationType;
  usage: LocationUsage;
}> = [
  { code: LOCATION_CODES.STOCK, name: 'STOCK', type: LocationType.INTERNAL, usage: LocationUsage.STORAGE },
  { code: LOCATION_CODES.RECEIVING, name: 'RECEIVING', type: LocationType.INTERNAL, usage: LocationUsage.RECEIVING },
  { code: LOCATION_CODES.SHIPPING, name: 'SHIPPING', type: LocationType.INTERNAL, usage: LocationUsage.SHIPPING },
  { code: LOCATION_CODES.TRANSIT, name: 'TRANSIT', type: LocationType.TRANSIT, usage: LocationUsage.TRANSIT },
  { code: LOCATION_CODES.SCRAP, name: 'SCRAP', type: LocationType.INVENTORY_LOSS, usage: LocationUsage.SCRAP },
];

@Injectable()
export class LocationsService {
  private readonly logger = new Logger(LocationsService.name);

  constructor(@InjectModel(Location.name) private readonly locationModel: Model<LocationDocument>) {}

  async createRootLocationsForWarehouse(
    warehouseId: string,
    payload: { organizationId: string; enterpriseId: string; warehouseCode: string },
  ): Promise<LocationRecord[]> {
    const organizationId = this.normalizeId(payload.organizationId, 'OrganizationId is required');
    const enterpriseId = this.normalizeId(payload.enterpriseId, 'EnterpriseId is required');
    const warehouseObjectId = this.ensureObjectId(warehouseId, 'WarehouseId is required');
    const warehouseCode = this.normalizeCode(payload.warehouseCode, 'Warehouse code is required');

    const existing = await this.locationModel
      .find({
        organizationId,
        enterpriseId,
        warehouseId: warehouseObjectId,
        code: { $in: DEFAULT_ROOT_LOCATIONS.map((item) => item.code) },
      })
      .lean<LocationDocument[]>()
      .exec();
    const existingCodes = new Set(existing.map((item) => item.code));

    const toCreate = DEFAULT_ROOT_LOCATIONS.filter((item) => !existingCodes.has(item.code)).map((item) => ({
      organizationId,
      enterpriseId,
      warehouseId: warehouseObjectId,
      parentLocationId: null,
      name: item.name,
      code: this.normalizeCode(item.code, 'Location code is required'),
      level: 1,
      path: this.buildPath(warehouseCode, item.code),
      type: item.type,
      usage: item.usage,
      active: true,
    }));

    if (!toCreate.length) {
      return existing.map((location) => this.toRecord(location));
    }

    const created = await this.locationModel.insertMany(toCreate);
    return created.map((location) => this.toRecord(location));
  }

  async create(dto: CreateLocationDto): Promise<LocationRecord> {
    const organizationId = this.normalizeId(dto.organizationId, 'OrganizationId is required');
    const enterpriseId = this.normalizeId(dto.enterpriseId, 'EnterpriseId is required');
    const name = this.normalizeName(dto.name, 'Location name is required');
    const code = this.normalizeCode(dto.code, 'Location code is required');
    const type = dto.type;
    const usage = dto.usage;

    if (!type) {
      throw new BadRequestException('Location type is required');
    }
    if (!usage) {
      throw new BadRequestException('Location usage is required');
    }

    if (dto.parentLocationId) {
      return this.createChildLocation(dto.parentLocationId, {
        organizationId,
        enterpriseId,
        name,
        code,
        type,
        usage,
        active: dto.active ?? true,
      });
    }

    const warehouseId = this.ensureObjectId(dto.warehouseId, 'WarehouseId is required');
    const warehouseCode = this.normalizeCode(dto.warehouseCode, 'Warehouse code is required for root location');
    const created = await this.locationModel.create({
      organizationId,
      enterpriseId,
      warehouseId,
      parentLocationId: null,
      name,
      code,
      level: 1,
      path: this.buildPath(warehouseCode, code),
      type,
      usage,
      active: dto.active ?? true,
    });
    return this.toRecord(created);
  }

  async createChildLocation(
    parentId: string,
    dto: {
      organizationId: string;
      enterpriseId: string;
      name: string;
      code: string;
      type: LocationType;
      usage: LocationUsage;
      active: boolean;
    },
  ): Promise<LocationRecord> {
    const parent = await this.findDocument(parentId);
    if (parent.organizationId !== dto.organizationId || parent.enterpriseId !== dto.enterpriseId) {
      throw new BadRequestException('Parent location belongs to another organization or enterprise');
    }

    const duplicate = await this.locationModel
      .findOne({
        organizationId: dto.organizationId,
        enterpriseId: dto.enterpriseId,
        warehouseId: parent.warehouseId,
        code: dto.code,
      })
      .lean<LocationDocument>()
      .exec();
    if (duplicate) {
      throw new BadRequestException('Location code already exists');
    }

    const created = await this.locationModel.create({
      organizationId: dto.organizationId,
      enterpriseId: dto.enterpriseId,
      warehouseId: parent.warehouseId,
      parentLocationId: parent._id,
      name: dto.name,
      code: dto.code,
      level: parent.level + 1,
      path: this.buildPath(parent.path, dto.code),
      type: dto.type,
      usage: dto.usage,
      active: dto.active,
    });
    return this.toRecord(created);
  }

  async listByWarehouse(filters: LocationListQueryDto): Promise<LocationRecord[]> {
    const warehouseObjectId = this.ensureObjectId(filters.warehouseId, 'WarehouseId is required');
    const query: Record<string, unknown> = { warehouseId: warehouseObjectId };
    if (filters.organizationId) {
      query.organizationId = filters.organizationId.trim();
    }
    if (filters.enterpriseId) {
      query.enterpriseId = filters.enterpriseId.trim();
    }
    if (filters.active !== undefined) {
      query.active = filters.active;
    }
    const locations = await this.locationModel.find(query).lean<LocationDocument[]>().exec();
    return locations.map((location) => this.toRecord(location));
  }

  async findOne(id: string): Promise<LocationRecord> {
    const location = await this.locationModel.findById(id).lean<LocationDocument>().exec();
    if (!location) {
      throw new NotFoundException('Location not found');
    }
    return this.toRecord(location);
  }

  async update(id: string, dto: UpdateLocationDto): Promise<LocationRecord> {
    const location = await this.locationModel.findById(id).lean<LocationDocument>().exec();
    if (!location) {
      throw new NotFoundException('Location not found');
    }

    const nextName = dto.name ? this.normalizeName(dto.name, 'Location name is required') : location.name;
    const nextCode = dto.code ? this.normalizeCode(dto.code, 'Location code is required') : location.code;
    const nextType = dto.type ?? location.type;
    const nextUsage = dto.usage ?? location.usage;
    const nextActive = dto.active ?? location.active;

    if (nextCode !== location.code) {
      const duplicate = await this.locationModel
        .findOne({
          _id: { $ne: location._id },
          organizationId: location.organizationId,
          enterpriseId: location.enterpriseId,
          warehouseId: location.warehouseId,
          code: nextCode,
        })
        .lean<LocationDocument>()
        .exec();
      if (duplicate) {
        throw new BadRequestException('Location code already exists');
      }
    }

    const nextPath = nextCode !== location.code ? this.rebuildPath(location.path, nextCode) : location.path;
    const next = {
      name: nextName,
      code: nextCode,
      path: nextPath,
      type: nextType,
      usage: nextUsage,
      active: nextActive,
    };

    await this.locationModel.updateOne({ _id: location._id }, { $set: next }).exec();

    if (nextPath !== location.path) {
      await this.updateDescendantPaths(location, nextPath);
    }

    return this.toRecord({ ...location, ...next } as LocationDocument);
  }

  async remove(id: string): Promise<void> {
    const location = await this.locationModel.findById(id).lean<LocationDocument>().exec();
    if (!location) {
      throw new NotFoundException('Location not found');
    }
    if (!location.active) {
      return;
    }
    await this.locationModel.updateOne({ _id: location._id }, { $set: { active: false } }).exec();
  }

  async getTree(warehouseId: string): Promise<LocationTreeNode[]> {
    const warehouseObjectId = this.ensureObjectId(warehouseId, 'WarehouseId is required');
    const locations = await this.locationModel
      .find({ warehouseId: warehouseObjectId, active: true })
      .lean<LocationDocument[]>()
      .exec();

    const nodeMap = new Map<string, LocationTreeNode>();
    locations.forEach((location) => {
      const record = this.toRecord(location);
      nodeMap.set(record.id, { ...record, children: [] });
    });

    const roots: LocationTreeNode[] = [];
    nodeMap.forEach((node) => {
      if (node.parentLocationId && nodeMap.has(node.parentLocationId)) {
        nodeMap.get(node.parentLocationId)?.children.push(node);
      } else {
        roots.push(node);
      }
    });

    return roots;
  }

  private async updateDescendantPaths(
    location: LocationDocument,
    nextPath: string,
  ): Promise<void> {
    const prefix = this.escapeRegExp(location.path);
    const descendants = await this.locationModel
      .find({
        warehouseId: location.warehouseId,
        path: { $regex: `^${prefix}/` },
      })
      .lean<LocationDocument[]>()
      .exec();

    if (!descendants.length) {
      return;
    }

    const updates = descendants.map((descendant) => {
      const replacement = descendant.path.replace(`${location.path}/`, `${nextPath}/`);
      return {
        updateOne: {
          filter: { _id: descendant._id },
          update: { $set: { path: replacement } },
        },
      };
    });

    try {
      await this.locationModel.bulkWrite(updates);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to update location paths: ${message}`);
      throw error;
    }
  }

  private async findDocument(id: string): Promise<LocationDocument> {
    const location = await this.locationModel.findById(id).exec();
    if (!location) {
      throw new NotFoundException('Location not found');
    }
    return location;
  }

  private toRecord(location: LocationDocument): LocationRecord {
    return {
      id: location._id.toString(),
      organizationId: location.organizationId,
      enterpriseId: location.enterpriseId,
      warehouseId: location.warehouseId.toString(),
      parentLocationId: location.parentLocationId ? location.parentLocationId.toString() : null,
      name: location.name,
      code: location.code,
      level: location.level,
      path: location.path,
      type: location.type,
      usage: location.usage,
      active: location.active,
      createdAt: location.createdAt,
      updatedAt: location.updatedAt,
    };
  }

  private ensureObjectId(value: string | undefined, message: string): MongooseSchema.Types.ObjectId {
    if (!value || !isValidObjectId(value)) {
      throw new BadRequestException(message);
    }
    return new MongooseSchema.Types.ObjectId(value);
  }

  private normalizeId(value: string | undefined, message: string): string {
    if (!value?.trim()) {
      throw new BadRequestException(message);
    }
    return value.trim();
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

  private buildPath(prefix: string, code: string): string {
    const normalizedPrefix = prefix.trim().toUpperCase();
    const normalizedCode = code.trim().toUpperCase();
    return `${normalizedPrefix}/${normalizedCode}`;
  }

  private rebuildPath(currentPath: string, nextCode: string): string {
    const normalizedCode = nextCode.trim().toUpperCase();
    const lastSlash = currentPath.lastIndexOf('/');
    if (lastSlash === -1) {
      return normalizedCode;
    }
    const prefix = currentPath.slice(0, lastSlash);
    return `${prefix}/${normalizedCode}`;
  }

  private escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}

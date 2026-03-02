import { BadRequestException, Injectable } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { PackagingName } from './entities/packaging-name.entity';
import { CreatePackagingNameDto } from './dto/create-packaging-name.dto';
import { UpdatePackagingNameDto } from './dto/update-packaging-name.dto';
import { ProductsModelsProvider } from '../models/products-models.provider';

export interface PackagingNameRecord extends PackagingName {
  id: string;
}

@Injectable()
export class PackagingNamesService {
  constructor(private readonly models: ProductsModelsProvider) {}

  async list(organizationId: string): Promise<PackagingNameRecord[]> {
    if (!organizationId) {
      return [];
    }
    const model = this.models.packagingNameModel(organizationId);
    const current = await model
      .find({ organizationId })
      .sort({ sortOrder: 1, name: 1 })
      .lean<PackagingNameRecord[]>()
      .exec();
    if (current.length === 0) {
      return this.seedDefaults(organizationId);
    }
    return current.map((item) => ({
      ...item,
      multiplier: item.multiplier ?? 1,
      variableMultiplier: item.variableMultiplier ?? false,
    }));
  }

  async create(dto: CreatePackagingNameDto): Promise<PackagingNameRecord> {
    const name = dto.name.trim();
    if (!name) {
      throw new BadRequestException('Packaging name is required');
    }
    if (!dto.multiplier || dto.multiplier <= 0) {
      throw new BadRequestException('Multiplier must be greater than 0');
    }
    const model = this.models.packagingNameModel(dto.organizationId);
    const normalized = this.normalizeName(name);
    const existing = await model
      .findOne({ organizationId: dto.organizationId, nameNormalized: normalized })
      .lean<PackagingNameRecord>()
      .exec();
    if (existing) {
      return {
        ...existing,
        multiplier: existing.multiplier ?? 1,
        variableMultiplier: existing.variableMultiplier ?? false,
      } as PackagingNameRecord;
    }
    const record: PackagingNameRecord = {
      id: uuid(),
      organizationId: dto.organizationId,
      name,
      nameNormalized: normalized,
      multiplier: dto.multiplier,
      isActive: dto.isActive ?? true,
      isSystem: dto.isSystem ?? false,
      variableMultiplier: dto.variableMultiplier ?? false,
      sortOrder: dto.sortOrder ?? undefined,
    };
    await model.create(record);
    return record;
  }

  async update(
    id: string,
    dto: UpdatePackagingNameDto,
    organizationId: string,
  ): Promise<PackagingNameRecord> {
    if (!organizationId) {
      throw new BadRequestException('OrganizationId is required');
    }
    const model = this.models.packagingNameModel(organizationId);
    const record = await model
      .findOne({ id, organizationId })
      .lean<PackagingNameRecord>()
      .exec();
    if (!record) {
      throw new BadRequestException('Packaging name not found');
    }
    const nextName = dto.name?.trim() || record.name;
    const normalized = this.normalizeName(nextName);
    if (dto.name) {
      const conflict = await model
        .findOne({ organizationId, nameNormalized: normalized, id: { $ne: id } })
        .lean<PackagingNameRecord>()
        .exec();
      if (conflict) {
        throw new BadRequestException('Packaging name already exists');
      }
    }
    const next = {
      name: nextName,
      nameNormalized: normalized,
      multiplier: dto.multiplier ?? record.multiplier ?? 1,
      isActive: dto.isActive ?? record.isActive ?? true,
      isSystem: dto.isSystem ?? record.isSystem ?? false,
      variableMultiplier: dto.variableMultiplier ?? record.variableMultiplier ?? false,
      sortOrder: dto.sortOrder ?? record.sortOrder,
    };
    await model.updateOne({ id }, { $set: next }).exec();
    return { ...record, ...next };
  }

  private async seedDefaults(organizationId: string): Promise<PackagingNameRecord[]> {
    const model = this.models.packagingNameModel(organizationId);
    const defaults: Array<{ name: string; multiplier: number; variableMultiplier?: boolean }> = [
      { name: 'Unidad', multiplier: 1 },
      { name: 'Paquete', multiplier: 6 },
      { name: 'Docena', multiplier: 12 },
      { name: 'Caja', multiplier: 24 },
      { name: 'Fardo', multiplier: 1, variableMultiplier: true },
      { name: 'Saco', multiplier: 1, variableMultiplier: true },
      { name: 'Bolsa', multiplier: 1, variableMultiplier: true },
    ];
    const created: PackagingNameRecord[] = [];
    for (const [index, entry] of defaults.entries()) {
      const normalized = this.normalizeName(entry.name);
      const exists = await model
        .findOne({ organizationId, nameNormalized: normalized })
        .lean<PackagingNameRecord>()
        .exec();
      if (exists) {
        continue;
      }
      const record: PackagingNameRecord = {
        id: uuid(),
        organizationId,
        name: entry.name,
        nameNormalized: normalized,
        isActive: true,
        isSystem: true,
        multiplier: entry.multiplier,
        variableMultiplier: entry.variableMultiplier ?? false,
        sortOrder: index + 1,
      };
      await model.create(record);
      created.push(record);
    }
    if (created.length === 0) {
      const current = await model
        .find({ organizationId })
        .sort({ sortOrder: 1, name: 1 })
        .lean<PackagingNameRecord[]>()
        .exec();
      return current.map((item) => ({
        ...item,
        multiplier: item.multiplier ?? 1,
        variableMultiplier: item.variableMultiplier ?? false,
      }));
    }
    return this.list(organizationId);
  }

  private normalizeName(value: string): string {
    return value.trim().replace(/\s+/g, ' ').toLowerCase();
  }
}

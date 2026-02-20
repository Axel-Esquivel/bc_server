import { BadRequestException, Injectable } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { PackagingName } from './entities/packaging-name.entity';
import { CreatePackagingNameDto } from './dto/create-packaging-name.dto';
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
    return current;
  }

  async create(dto: CreatePackagingNameDto): Promise<PackagingNameRecord> {
    const name = dto.name.trim();
    if (!name) {
      throw new BadRequestException('Packaging name is required');
    }
    const model = this.models.packagingNameModel(dto.organizationId);
    const normalized = this.normalizeName(name);
    const existing = await model
      .findOne({ organizationId: dto.organizationId, nameNormalized: normalized })
      .lean<PackagingNameRecord>()
      .exec();
    if (existing) {
      return existing as PackagingNameRecord;
    }
    const record: PackagingNameRecord = {
      id: uuid(),
      organizationId: dto.organizationId,
      name,
      nameNormalized: normalized,
      isActive: true,
      sortOrder: dto.sortOrder ? Number(dto.sortOrder) : undefined,
    };
    await model.create(record);
    return record;
  }

  private async seedDefaults(organizationId: string): Promise<PackagingNameRecord[]> {
    const model = this.models.packagingNameModel(organizationId);
    const defaults = ['Unidad', 'Paquete', 'Docena', 'Caja', 'Fardo', 'Saco', 'Bolsa', 'Rollo'];
    const created: PackagingNameRecord[] = [];
    for (const [index, name] of defaults.entries()) {
      const normalized = this.normalizeName(name);
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
        name,
        nameNormalized: normalized,
        isActive: true,
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
      return current;
    }
    return this.list(organizationId);
  }

  private normalizeName(value: string): string {
    return value.trim().replace(/\s+/g, ' ').toLowerCase();
  }
}

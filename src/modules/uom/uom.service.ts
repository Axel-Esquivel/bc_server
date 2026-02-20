import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { CreateUomCategoryDto } from './dto/create-uom-category.dto';
import { CreateUomDto } from './dto/create-uom.dto';
import { UpdateUomCategoryDto } from './dto/update-uom-category.dto';
import { UpdateUomDto } from './dto/update-uom.dto';
import { UomCategory } from './entities/uom-category.entity';
import { Uom } from './entities/uom.entity';
import { UomModelsProvider } from './models/uom-models.provider';
import { UomCategoryDocument } from './schemas/uom-category.schema';
import { UomDocument } from './schemas/uom.schema';

export interface UomCategoryRecord extends UomCategory {
  id: string;
  nameNormalized: string;
}

export interface UomRecord extends Uom {
  id: string;
  nameNormalized: string;
}

interface UomListFilters {
  organizationId?: string;
  categoryId?: string;
}

@Injectable()
export class UomService {
  private readonly logger = new Logger(UomService.name);

  constructor(private readonly models: UomModelsProvider) {}

  async createCategory(dto: CreateUomCategoryDto): Promise<UomCategoryRecord> {
    const name = dto.name.trim();
    if (!name) {
      throw new BadRequestException('Category name is required');
    }
    const model = this.models.categoryModel(dto.organizationId);
    const nameNormalized = this.normalizeName(name);
    const existing = await model
      .findOne({ organizationId: dto.organizationId, nameNormalized })
      .lean<UomCategoryDocument>()
      .exec();
    if (existing) {
      return existing as UomCategoryRecord;
    }
    const category: UomCategoryRecord = {
      id: uuid(),
      name,
      nameNormalized,
      organizationId: dto.organizationId,
      isActive: dto.isActive ?? true,
    };
    await model.create(category);
    return category;
  }

  async findAllCategories(organizationId?: string): Promise<UomCategoryRecord[]> {
    if (!organizationId) {
      return [];
    }
    const model = this.models.categoryModel(organizationId);
    return model.find({ organizationId }).lean<UomCategoryRecord[]>().exec();
  }

  async updateCategory(id: string, dto: UpdateUomCategoryDto, organizationId: string): Promise<UomCategoryRecord> {
    if (!organizationId) {
      throw new BadRequestException('OrganizationId is required');
    }
    const model = this.models.categoryModel(organizationId);
    const category = await this.findCategory(id, organizationId);
    const name = dto.name?.trim();
    if (name) {
      const nameNormalized = this.normalizeName(name);
      const duplicate = await model
        .findOne({ id: { $ne: id }, organizationId, nameNormalized })
        .lean<UomCategoryDocument>()
        .exec();
      if (duplicate) {
        throw new BadRequestException('Category already exists');
      }
    }
    const next = {
      name: name ?? category.name,
      nameNormalized: name ? this.normalizeName(name) : category.nameNormalized,
      isActive: dto.isActive ?? category.isActive,
    };
    await model.updateOne({ id }, { $set: next }).exec();
    return { ...category, ...next };
  }

  async findCategory(id: string, organizationId: string): Promise<UomCategoryRecord> {
    const model = this.models.categoryModel(organizationId);
    const category = await model.findOne({ id }).lean<UomCategoryDocument>().exec();
    if (!category) {
      throw new NotFoundException('UoM category not found');
    }
    return category as UomCategoryRecord;
  }

  async create(dto: CreateUomDto): Promise<UomRecord> {
    const model = this.models.uomModel(dto.organizationId);
    const category = await this.findCategory(dto.categoryId, dto.organizationId);
    if (category.organizationId !== dto.organizationId) {
      throw new BadRequestException('Category does not belong to organization');
    }
    const nameNormalized = this.normalizeName(dto.name);
    const symbolNormalized = this.normalizeName(dto.symbol);
    const existing = await model
      .findOne({
        organizationId: dto.organizationId,
        categoryId: dto.categoryId,
        $or: [{ nameNormalized }, { symbol: dto.symbol.trim() }],
      })
      .lean<UomDocument>()
      .exec();
    if (existing) {
      return existing as UomRecord;
    }
    const record: UomRecord = {
      id: uuid(),
      name: dto.name.trim(),
      nameNormalized,
      symbol: dto.symbol.trim(),
      categoryId: dto.categoryId,
      factor: dto.factor,
      isBase: dto.isBase ?? false,
      organizationId: dto.organizationId,
      isActive: dto.isActive ?? true,
    };
    await model.create(record);
    return record;
  }

  async findAll(filters?: UomListFilters): Promise<UomRecord[]> {
    if (!filters?.organizationId) {
      return [];
    }
    const model = this.models.uomModel(filters.organizationId);
    const query: Record<string, string> = { organizationId: filters.organizationId };
    if (filters.categoryId) {
      query.categoryId = filters.categoryId;
    }
    return model.find(query).lean<UomRecord[]>().exec();
  }

  async findOne(id: string, organizationId: string): Promise<UomRecord> {
    const model = this.models.uomModel(organizationId);
    const uom = await model.findOne({ id }).lean<UomDocument>().exec();
    if (!uom) {
      throw new NotFoundException('UoM not found');
    }
    return uom as UomRecord;
  }

  async update(id: string, dto: UpdateUomDto, organizationId: string): Promise<UomRecord> {
    if (!organizationId) {
      throw new BadRequestException('OrganizationId is required');
    }
    const model = this.models.uomModel(organizationId);
    const uom = await this.findOne(id, organizationId);
    const nextCategoryId = dto.categoryId ?? uom.categoryId;
    const category = await this.findCategory(nextCategoryId, organizationId);
    if (dto.symbol && dto.symbol !== uom.symbol) {
      const duplicate = await model
        .findOne({
          id: { $ne: id },
          organizationId,
          categoryId: nextCategoryId,
          symbol: dto.symbol.trim(),
        })
        .lean<UomDocument>()
        .exec();
      if (duplicate) {
        throw new BadRequestException('UoM symbol already exists');
      }
    }
    const nextName = dto.name?.trim();
    if (nextName) {
      const nameNormalized = this.normalizeName(nextName);
      const duplicate = await model
        .findOne({
          id: { $ne: id },
          organizationId,
          categoryId: nextCategoryId,
          nameNormalized,
        })
        .lean<UomDocument>()
        .exec();
      if (duplicate) {
        throw new BadRequestException('UoM already exists');
      }
    }
    const next = {
      name: nextName ?? uom.name,
      nameNormalized: nextName ? this.normalizeName(nextName) : uom.nameNormalized,
      symbol: dto.symbol?.trim() ?? uom.symbol,
      categoryId: nextCategoryId,
      factor: dto.factor ?? uom.factor,
      isBase: dto.isBase ?? uom.isBase,
      isActive: dto.isActive ?? uom.isActive,
    };
    await model.updateOne({ id }, { $set: next }).exec();
    return { ...uom, ...next };
  }

  async remove(id: string, organizationId: string): Promise<void> {
    const model = this.models.uomModel(organizationId);
    const exists = await model.exists({ id });
    if (!exists) {
      throw new NotFoundException('UoM not found');
    }
    await model.deleteOne({ id }).exec();
  }

  async seedDefaultsForOrganization(organizationId: string): Promise<void> {
    if (!organizationId) {
      return;
    }
    const categoryModel = this.models.categoryModel(organizationId);
    const uomModel = this.models.uomModel(organizationId);

    const ensureCategory = async (name: string): Promise<UomCategoryRecord> => {
      const normalized = this.normalizeName(name);
      const existing = await categoryModel
        .findOne({ organizationId, nameNormalized: normalized })
        .lean<UomCategoryDocument>()
        .exec();
      if (existing) {
        return existing as UomCategoryRecord;
      }
      const created: UomCategoryRecord = {
        id: uuid(),
        name,
        nameNormalized: normalized,
        organizationId,
        isActive: true,
      };
      await categoryModel.create(created);
      return created;
    };

    const lengthCategory = await ensureCategory('Longitud');
    const massCategory = await ensureCategory('Masa');
    const volumeCategory = await ensureCategory('Volumen');
    const unitsCategory = await ensureCategory('Unidades');

    const seedUom = async (input: {
      name: string;
      symbol: string;
      categoryId: string;
      factor: number;
      isBase: boolean;
    }) => {
      const existing = await uomModel
        .findOne({
          organizationId,
          categoryId: input.categoryId,
          symbol: input.symbol,
        })
        .lean<UomDocument>()
        .exec();
      if (existing) {
        return;
      }
      const record: UomRecord = {
        id: uuid(),
        name: input.name,
        nameNormalized: this.normalizeName(input.name),
        symbol: input.symbol,
        categoryId: input.categoryId,
        factor: input.factor,
        isBase: input.isBase,
        organizationId,
        isActive: true,
      };
      await uomModel.create(record);
    };

    await seedUom({ name: 'Metro', symbol: 'm', categoryId: lengthCategory.id, factor: 1, isBase: true });
    await seedUom({ name: 'Centímetro', symbol: 'cm', categoryId: lengthCategory.id, factor: 0.01, isBase: false });
    await seedUom({ name: 'Kilómetro', symbol: 'km', categoryId: lengthCategory.id, factor: 1000, isBase: false });

    await seedUom({ name: 'Kilogramo', symbol: 'kg', categoryId: massCategory.id, factor: 1, isBase: true });
    await seedUom({ name: 'Gramo', symbol: 'g', categoryId: massCategory.id, factor: 0.001, isBase: false });

    await seedUom({ name: 'Litro', symbol: 'l', categoryId: volumeCategory.id, factor: 1, isBase: true });
    await seedUom({ name: 'Mililitro', symbol: 'ml', categoryId: volumeCategory.id, factor: 0.001, isBase: false });

    await seedUom({ name: 'Unidad', symbol: 'unidad', categoryId: unitsCategory.id, factor: 1, isBase: true });
    await seedUom({ name: 'Docena', symbol: 'docena', categoryId: unitsCategory.id, factor: 12, isBase: false });
    await seedUom({ name: 'Caja x12', symbol: 'caja x12', categoryId: unitsCategory.id, factor: 12, isBase: false });
  }

  private normalizeName(value: string): string {
    return value.trim().replace(/\s+/g, ' ').toLowerCase();
  }
}

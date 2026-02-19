import { BadRequestException, Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { ModuleStateService } from '../../core/database/module-state.service';
import { CreateUomCategoryDto } from './dto/create-uom-category.dto';
import { CreateUomDto } from './dto/create-uom.dto';
import { UpdateUomCategoryDto } from './dto/update-uom-category.dto';
import { UpdateUomDto } from './dto/update-uom.dto';
import { UomCategory } from './entities/uom-category.entity';
import { Uom } from './entities/uom.entity';

export interface UomCategoryRecord extends UomCategory {
  id: string;
}

export interface UomRecord extends Uom {
  id: string;
}

interface UomState {
  categories: UomCategoryRecord[];
  uoms: UomRecord[];
}

interface UomListFilters {
  organizationId?: string;
  categoryId?: string;
}

@Injectable()
export class UomService implements OnModuleInit {
  private readonly logger = new Logger(UomService.name);
  private readonly stateKey = 'module:uom';
  private categories: UomCategoryRecord[] = [];
  private uoms: UomRecord[] = [];

  constructor(private readonly moduleState: ModuleStateService) {}

  async onModuleInit(): Promise<void> {
    const state = await this.moduleState.loadState<UomState>(this.stateKey, { categories: [], uoms: [] });
    const normalized = this.normalizeState(state);
    this.categories = normalized.categories;
    this.uoms = normalized.uoms;
  }

  createCategory(dto: CreateUomCategoryDto): UomCategoryRecord {
    const name = dto.name.trim();
    if (!name) {
      throw new BadRequestException('Category name is required');
    }
    const exists = this.categories.some(
      (category) =>
        category.organizationId === dto.organizationId &&
        category.name.trim().toLowerCase() === name.toLowerCase(),
    );
    if (exists) {
      throw new BadRequestException('Category already exists');
    }
    const category: UomCategoryRecord = {
      id: uuid(),
      name,
      organizationId: dto.organizationId,
      isActive: dto.isActive ?? true,
    };
    this.categories.push(category);
    this.persistState();
    return category;
  }

  findAllCategories(organizationId?: string): UomCategoryRecord[] {
    if (!organizationId) {
      return [...this.categories];
    }
    return this.categories.filter((category) => category.organizationId === organizationId);
  }

  updateCategory(id: string, dto: UpdateUomCategoryDto): UomCategoryRecord {
    const category = this.findCategory(id);
    Object.assign(category, {
      name: dto.name?.trim() ?? category.name,
      isActive: dto.isActive ?? category.isActive,
    });
    this.persistState();
    return category;
  }

  findCategory(id: string): UomCategoryRecord {
    const category = this.categories.find((item) => item.id === id);
    if (!category) {
      throw new NotFoundException('UoM category not found');
    }
    return category;
  }

  create(dto: CreateUomDto): UomRecord {
    const category = this.categories.find((item) => item.id === dto.categoryId);
    if (!category) {
      throw new BadRequestException('Category not found');
    }
    if (category.organizationId !== dto.organizationId) {
      throw new BadRequestException('Category does not belong to organization');
    }
    this.assertUniqueSymbol(dto.symbol, dto.organizationId, dto.categoryId);
    const uom: UomRecord = {
      id: uuid(),
      name: dto.name.trim(),
      symbol: dto.symbol.trim(),
      categoryId: dto.categoryId,
      factor: dto.factor,
      isBase: dto.isBase ?? false,
      organizationId: dto.organizationId,
      isActive: dto.isActive ?? true,
    };
    this.uoms.push(uom);
    this.persistState();
    return uom;
  }

  findAll(filters?: UomListFilters): UomRecord[] {
    if (!filters) {
      return [...this.uoms];
    }
    return this.uoms.filter((uom) => {
      if (filters.organizationId && uom.organizationId !== filters.organizationId) return false;
      if (filters.categoryId && uom.categoryId !== filters.categoryId) return false;
      return true;
    });
  }

  findOne(id: string): UomRecord {
    const uom = this.uoms.find((item) => item.id === id);
    if (!uom) {
      throw new NotFoundException('UoM not found');
    }
    return uom;
  }

  update(id: string, dto: UpdateUomDto): UomRecord {
    const uom = this.findOne(id);
    const nextCategoryId = dto.categoryId ?? uom.categoryId;
    const category = this.categories.find((item) => item.id === nextCategoryId);
    if (!category) {
      throw new BadRequestException('Category not found');
    }
    if (dto.organizationId && dto.organizationId !== uom.organizationId) {
      throw new BadRequestException('Cannot change organization');
    }
    if (dto.symbol && dto.symbol !== uom.symbol) {
      this.assertUniqueSymbol(dto.symbol, uom.organizationId, nextCategoryId, uom.id);
    }
    Object.assign(uom, {
      name: dto.name?.trim() ?? uom.name,
      symbol: dto.symbol?.trim() ?? uom.symbol,
      categoryId: nextCategoryId,
      factor: dto.factor ?? uom.factor,
      isBase: dto.isBase ?? uom.isBase,
      isActive: dto.isActive ?? uom.isActive,
    });
    this.persistState();
    return uom;
  }

  remove(id: string): void {
    const index = this.uoms.findIndex((item) => item.id === id);
    if (index === -1) {
      throw new NotFoundException('UoM not found');
    }
    this.uoms.splice(index, 1);
    this.persistState();
  }

  async seedDefaultsForOrganization(organizationId: string): Promise<void> {
    if (!organizationId) {
      return;
    }
    const categoryMap = new Map<string, UomCategoryRecord>();
    const ensureCategory = (name: string): UomCategoryRecord => {
      const existing = this.categories.find(
        (category) =>
          category.organizationId === organizationId && category.name.trim().toLowerCase() === name.toLowerCase(),
      );
      if (existing) {
        categoryMap.set(name, existing);
        return existing;
      }
      const created: UomCategoryRecord = {
        id: uuid(),
        name,
        organizationId,
        isActive: true,
      };
      this.categories.push(created);
      categoryMap.set(name, created);
      return created;
    };

    const lengthCategory = ensureCategory('Longitud');
    const massCategory = ensureCategory('Masa');
    const volumeCategory = ensureCategory('Volumen');
    const unitsCategory = ensureCategory('Unidades');

    const seedUom = (input: {
      name: string;
      symbol: string;
      categoryId: string;
      factor: number;
      isBase: boolean;
    }) => {
      const exists = this.uoms.some(
        (uom) =>
          uom.organizationId === organizationId &&
          uom.categoryId === input.categoryId &&
          uom.symbol.trim().toLowerCase() === input.symbol.trim().toLowerCase(),
      );
      if (exists) {
        return;
      }
      this.uoms.push({
        id: uuid(),
        name: input.name,
        symbol: input.symbol,
        categoryId: input.categoryId,
        factor: input.factor,
        isBase: input.isBase,
        organizationId,
        isActive: true,
      });
    };

    seedUom({ name: 'Metro', symbol: 'm', categoryId: lengthCategory.id, factor: 1, isBase: true });
    seedUom({ name: 'Centímetro', symbol: 'cm', categoryId: lengthCategory.id, factor: 0.01, isBase: false });
    seedUom({ name: 'Kilómetro', symbol: 'km', categoryId: lengthCategory.id, factor: 1000, isBase: false });

    seedUom({ name: 'Kilogramo', symbol: 'kg', categoryId: massCategory.id, factor: 1, isBase: true });
    seedUom({ name: 'Gramo', symbol: 'g', categoryId: massCategory.id, factor: 0.001, isBase: false });

    seedUom({ name: 'Litro', symbol: 'l', categoryId: volumeCategory.id, factor: 1, isBase: true });
    seedUom({ name: 'Mililitro', symbol: 'ml', categoryId: volumeCategory.id, factor: 0.001, isBase: false });

    seedUom({ name: 'Unidad', symbol: 'unidad', categoryId: unitsCategory.id, factor: 1, isBase: true });
    seedUom({ name: 'Docena', symbol: 'docena', categoryId: unitsCategory.id, factor: 12, isBase: false });
    seedUom({ name: 'Caja x12', symbol: 'caja x12', categoryId: unitsCategory.id, factor: 12, isBase: false });

    this.persistState();
  }

  private assertUniqueSymbol(symbol: string, organizationId: string, categoryId: string, excludeId?: string): void {
    const normalized = symbol.trim().toLowerCase();
    if (!normalized) {
      throw new BadRequestException('Symbol is required');
    }
    const exists = this.uoms.some(
      (uom) =>
        uom.organizationId === organizationId &&
        uom.categoryId === categoryId &&
        uom.symbol.trim().toLowerCase() === normalized &&
        uom.id !== excludeId,
    );
    if (exists) {
      throw new BadRequestException('UoM symbol already exists');
    }
  }

  private normalizeState(state: UomState): UomState {
    const categories = Array.isArray(state.categories) ? state.categories : [];
    const uomsRaw = Array.isArray(state.uoms) ? state.uoms : [];

    const migratedCategories = [...categories];
    const categoryByOrg = new Map<string, UomCategoryRecord>();
    const ensureUnitsCategory = (organizationId: string): UomCategoryRecord => {
      const key = organizationId.trim();
      const cached = categoryByOrg.get(key);
      if (cached) {
        return cached;
      }
      const existing = migratedCategories.find(
        (category) => category.organizationId === organizationId && category.name.toLowerCase() === 'unidades',
      );
      if (existing) {
        categoryByOrg.set(key, existing);
        return existing;
      }
      const created: UomCategoryRecord = {
        id: uuid(),
        name: 'Unidades',
        organizationId,
        isActive: true,
      };
      migratedCategories.push(created);
      categoryByOrg.set(key, created);
      return created;
    };

    const migratedUoms: UomRecord[] = uomsRaw.map((raw) => {
      const anyRaw = raw as UomRecord & { OrganizationId?: string; companyId?: string; code?: string };
      const organizationId = anyRaw.organizationId ?? anyRaw.OrganizationId ?? '';
      const categoryId = anyRaw.categoryId ?? (organizationId ? ensureUnitsCategory(organizationId).id : uuid());
      return {
        id: anyRaw.id ?? uuid(),
        name: anyRaw.name ?? '',
        symbol: anyRaw.symbol ?? anyRaw.code ?? '',
        categoryId,
        factor: anyRaw.factor ?? 1,
        isBase: anyRaw.isBase ?? false,
        organizationId,
        isActive: anyRaw.isActive ?? true,
      };
    });

    return { categories: migratedCategories, uoms: migratedUoms };
  }

  private persistState() {
    void this.moduleState
      .saveState<UomState>(this.stateKey, { categories: this.categories, uoms: this.uoms })
      .catch((error) => {
        const message = error instanceof Error ? error.stack ?? error.message : String(error);
        this.logger.error(`Failed to persist units of measure: ${message}`);
      });
  }
}

import { BadRequestException, Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { ModuleStateService } from '../../core/database/module-state.service';
import { CreateProductCategoryDto } from './dto/create-product-category.dto';
import { UpdateProductCategoryDto } from './dto/update-product-category.dto';
import { ProductCategory } from './entities/product-category.entity';

export interface ProductCategoryRecord extends ProductCategory {
  id: string;
}

export interface ProductCategoryTreeNode {
  id: string;
  name: string;
  parentId?: string;
  isActive: boolean;
  children: ProductCategoryTreeNode[];
}

interface ProductCategoryState {
  categories: ProductCategoryRecord[];
}

@Injectable()
export class ProductCategoriesService implements OnModuleInit {
  private readonly logger = new Logger(ProductCategoriesService.name);
  private readonly stateKey = 'module:product-categories';
  private categories: ProductCategoryRecord[] = [];

  constructor(private readonly moduleState: ModuleStateService) {}

  async onModuleInit(): Promise<void> {
    const state = await this.moduleState.loadState<ProductCategoryState>(this.stateKey, { categories: [] });
    const categories = Array.isArray(state.categories) ? state.categories : [];
    this.categories = categories.map((item) => ({
      ...item,
      nameNormalized: this.normalizeName(item.name),
    }));
  }

  create(dto: CreateProductCategoryDto): ProductCategoryRecord {
    const name = dto.name.trim();
    if (!name) {
      throw new BadRequestException('Category name is required');
    }
    if (dto.parentId) {
      const parent = this.categories.find((item) => item.id === dto.parentId);
      if (!parent) {
        throw new BadRequestException('Parent category not found');
      }
      if (parent.organizationId !== dto.organizationId) {
        throw new BadRequestException('Parent category belongs to another organization');
      }
    }
    const nameNormalized = this.normalizeName(name);
    const parentId = dto.parentId ?? undefined;
    const existing = this.categories.find(
      (item) =>
        item.organizationId === dto.organizationId &&
        item.parentId === parentId &&
        item.nameNormalized === nameNormalized,
    );
    if (existing) {
      return existing;
    }
    const category: ProductCategoryRecord = {
      id: uuid(),
      name,
      nameNormalized,
      parentId,
      organizationId: dto.organizationId,
      isActive: dto.isActive ?? true,
    };
    this.categories.push(category);
    this.persistState();
    return category;
  }

  findAll(organizationId?: string): ProductCategoryRecord[] {
    if (!organizationId) {
      return [...this.categories];
    }
    return this.categories.filter((item) => item.organizationId === organizationId);
  }

  findOne(id: string): ProductCategoryRecord {
    const category = this.categories.find((item) => item.id === id);
    if (!category) {
      throw new NotFoundException('Product category not found');
    }
    return category;
  }

  update(id: string, dto: UpdateProductCategoryDto): ProductCategoryRecord {
    const category = this.findOne(id);
    const name = dto.name?.trim();
    if (dto.parentId && dto.parentId === id) {
      throw new BadRequestException('Category cannot be its own parent');
    }
    if (dto.parentId) {
      const parent = this.categories.find((item) => item.id === dto.parentId);
      if (!parent) {
        throw new BadRequestException('Parent category not found');
      }
      if (parent.organizationId !== category.organizationId) {
        throw new BadRequestException('Parent category belongs to another organization');
      }
    }
    if (name) {
      const nameNormalized = this.normalizeName(name);
      const parentId = dto.parentId ?? category.parentId;
      const duplicate = this.categories.some(
        (item) =>
          item.id !== id &&
          item.organizationId === category.organizationId &&
          item.parentId === parentId &&
          item.nameNormalized === nameNormalized,
      );
      if (duplicate) {
        throw new BadRequestException('Category already exists');
      }
    }
    Object.assign(category, {
      name: name ?? category.name,
      nameNormalized: name ? this.normalizeName(name) : category.nameNormalized,
      parentId: dto.parentId ?? category.parentId,
      isActive: dto.isActive ?? category.isActive,
    });
    this.persistState();
    return category;
  }

  remove(id: string): void {
    const index = this.categories.findIndex((item) => item.id === id);
    if (index === -1) {
      throw new NotFoundException('Product category not found');
    }
    const hasChildren = this.categories.some((item) => item.parentId === id);
    if (hasChildren) {
      throw new BadRequestException('Category has child categories');
    }
    this.categories.splice(index, 1);
    this.persistState();
  }

  buildTree(organizationId: string): ProductCategoryTreeNode[] {
    const categories = this.findAll(organizationId);
    const nodeMap = new Map<string, ProductCategoryTreeNode>();
    categories.forEach((category) => {
      nodeMap.set(category.id, {
        id: category.id,
        name: category.name,
        parentId: category.parentId,
        isActive: category.isActive,
        children: [],
      });
    });

    const roots: ProductCategoryTreeNode[] = [];
    nodeMap.forEach((node) => {
      if (node.parentId && nodeMap.has(node.parentId)) {
        nodeMap.get(node.parentId)?.children.push(node);
      } else {
        roots.push(node);
      }
    });

    return roots;
  }

  private persistState() {
    void this.moduleState
      .saveState<ProductCategoryState>(this.stateKey, { categories: this.categories })
      .catch((error) => {
        const message = error instanceof Error ? error.stack ?? error.message : String(error);
        this.logger.error(`Failed to persist product categories: ${message}`);
      });
  }

  private normalizeName(value: string): string {
    return value.trim().replace(/\s+/g, ' ').toLowerCase();
  }
}

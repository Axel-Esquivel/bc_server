import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { CreateProductCategoryDto } from './dto/create-product-category.dto';
import { UpdateProductCategoryDto } from './dto/update-product-category.dto';
import { ProductCategory } from './entities/product-category.entity';
import { ProductCategoriesModelsProvider } from './models/product-categories-models.provider';

export interface ProductCategoryRecord extends ProductCategory {
  id: string;
  nameNormalized?: string;
}

export interface ProductCategoryTreeNode {
  id: string;
  name: string;
  parentId?: string;
  isActive: boolean;
  children: ProductCategoryTreeNode[];
}

@Injectable()
export class ProductCategoriesService {
  private readonly logger = new Logger(ProductCategoriesService.name);

  constructor(private readonly models: ProductCategoriesModelsProvider) {}

  async create(dto: CreateProductCategoryDto): Promise<ProductCategoryRecord> {
    const name = dto.name.trim();
    if (!name) {
      throw new BadRequestException('Category name is required');
    }
    const model = this.models.categoryModel(dto.organizationId);
    if (dto.parentId) {
      const parent = await model.findOne({ id: dto.parentId }).lean<ProductCategoryRecord>().exec();
      if (!parent) {
        throw new BadRequestException('Parent category not found');
      }
      if (parent.organizationId !== dto.organizationId) {
        throw new BadRequestException('Parent category belongs to another organization');
      }
    }
    const nameNormalized = this.normalizeName(name);
    const parentId = dto.parentId ?? undefined;
    const existing = await model
      .findOne({ organizationId: dto.organizationId, parentId, nameNormalized })
      .lean<ProductCategoryRecord>()
      .exec();
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
    await model.create(category);
    return category;
  }

  async findAll(organizationId?: string): Promise<ProductCategoryRecord[]> {
    if (!organizationId) {
      return [];
    }
    const model = this.models.categoryModel(organizationId);
    return model.find({ organizationId }).lean<ProductCategoryRecord[]>().exec();
  }

  async findOne(id: string, organizationId: string): Promise<ProductCategoryRecord> {
    const model = this.models.categoryModel(organizationId);
    const category = await model.findOne({ id }).lean<ProductCategoryRecord>().exec();
    if (!category) {
      throw new NotFoundException('Product category not found');
    }
    return category;
  }

  async update(id: string, dto: UpdateProductCategoryDto, organizationId: string): Promise<ProductCategoryRecord> {
    if (!organizationId) {
      throw new BadRequestException('OrganizationId is required');
    }
    const model = this.models.categoryModel(organizationId);
    const category = await this.findOne(id, organizationId);
    const name = dto.name?.trim();
    if (dto.parentId && dto.parentId === id) {
      throw new BadRequestException('Category cannot be its own parent');
    }
    if (dto.parentId) {
      const parent = await model.findOne({ id: dto.parentId }).lean<ProductCategoryRecord>().exec();
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
      const duplicate = await model
        .findOne({
          id: { $ne: id },
          organizationId: category.organizationId,
          parentId,
          nameNormalized,
        })
        .lean<ProductCategoryRecord>()
        .exec();
      if (duplicate) {
        throw new BadRequestException('Category already exists');
      }
    }
    const next = {
      name: name ?? category.name,
      nameNormalized: name ? this.normalizeName(name) : category.nameNormalized,
      parentId: dto.parentId ?? category.parentId,
      isActive: dto.isActive ?? category.isActive,
    };
    await model.updateOne({ id }, { $set: next }).exec();
    return { ...category, ...next };
  }

  async remove(id: string, organizationId: string): Promise<void> {
    const model = this.models.categoryModel(organizationId);
    const category = await model.findOne({ id }).lean<ProductCategoryRecord>().exec();
    if (!category) {
      throw new NotFoundException('Product category not found');
    }
    const hasChildren = await model.exists({ parentId: id });
    if (hasChildren) {
      throw new BadRequestException('Category has child categories');
    }
    await model.deleteOne({ id }).exec();
  }

  async buildTree(organizationId: string): Promise<ProductCategoryTreeNode[]> {
    const categories = await this.findAll(organizationId);
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

  private normalizeName(value: string): string {
    return value
      .trim()
      .replace(/\s+/g, ' ')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }
}

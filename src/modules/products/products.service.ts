import { Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { ModuleStateService } from '../../core/database/module-state.service';
import { CreateProductDto } from './dto/create-product.dto';
import { ProductByCodeQueryDto } from './dto/product-by-code-query.dto';
import { ProductListQueryDto } from './dto/product-list-query.dto';
import { ProductSearchQueryDto } from './dto/product-search-query.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product } from './entities/product.entity';

export interface ProductRecord extends Product {
  id: string;
  createdAt: Date;
}

interface ProductsState {
  products: ProductRecord[];
}

export interface PosProductLookup {
  _id: string;
  name: string;
  sku: string;
  barcode?: string;
  price: number;
  isActive: boolean;
  taxRate?: number;
}

@Injectable()
export class ProductsService implements OnModuleInit {
  private readonly logger = new Logger(ProductsService.name);
  private readonly stateKey = 'module:products';
  private products: ProductRecord[] = [];

  constructor(private readonly moduleState: ModuleStateService) {}

  async onModuleInit(): Promise<void> {
    const state = await this.moduleState.loadState<ProductsState>(this.stateKey, { products: [] });
    this.products = state.products ?? [];
  }

  create(dto: CreateProductDto): ProductRecord {
    const product: ProductRecord = {
      id: uuid(),
      name: dto.name,
      sku: dto.sku,
      barcode: dto.barcode,
      price: dto.price ?? 0,
      isActive: dto.isActive ?? true,
      category: dto.category,
      purchasable: dto.purchasable ?? false,
      sellable: dto.sellable ?? true,
      trackInventory: dto.trackInventory ?? false,
      OrganizationId: dto.OrganizationId,
      companyId: dto.companyId,
      enterpriseId: dto.enterpriseId,
      createdAt: new Date(),
    };

    this.products.push(product);
    this.persistState();
    return product;
  }

  findAll(filters?: ProductListQueryDto): ProductRecord[] {
    if (!filters) {
      return [...this.products];
    }
    return this.products.filter((product) => {
      if (product.enterpriseId !== filters.enterpriseId) return false;
      if (filters.OrganizationId && product.OrganizationId !== filters.OrganizationId) return false;
      if (filters.companyId && product.companyId !== filters.companyId) return false;
      return true;
    });
  }

  searchForPos(query: ProductSearchQueryDto): PosProductLookup[] {
    const needle = query.q.trim().toLowerCase();
    if (!needle) {
      return [];
    }

    return this.products
      .filter((product) => {
        if (product.enterpriseId !== query.enterpriseId) return false;
        if (query.OrganizationId && product.OrganizationId !== query.OrganizationId) return false;
        if (query.companyId && product.companyId !== query.companyId) return false;
        const nameMatch = product.name.toLowerCase().includes(needle);
        const skuMatch = product.sku?.toLowerCase().includes(needle) ?? false;
        const barcodeMatch = product.barcode?.toLowerCase().includes(needle) ?? false;
        return nameMatch || skuMatch || barcodeMatch;
      })
      .map((product) => this.mapProductForPos(product));
  }

  findByCodeForPos(query: ProductByCodeQueryDto): PosProductLookup | null {
    const code = query.code.trim();
    if (!code) {
      return null;
    }
    const codeLower = code.toLowerCase();
    const match = this.products.find((product) => {
      if (product.enterpriseId !== query.enterpriseId) return false;
      if (query.OrganizationId && product.OrganizationId !== query.OrganizationId) return false;
      if (query.companyId && product.companyId !== query.companyId) return false;
      if (product.sku?.toLowerCase() === codeLower) return true;
      if (product.barcode?.toLowerCase() === codeLower) return true;
      return false;
    });

    if (!match) return null;
    return this.mapProductForPos(match);
  }

  findOne(id: string): ProductRecord {
    const product = this.products.find((item) => item.id === id);
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    this.persistState();
    return product;
  }

  update(id: string, dto: UpdateProductDto): ProductRecord {
    const product = this.findOne(id);
    Object.assign(product, {
      name: dto.name ?? product.name,
      sku: dto.sku ?? product.sku,
      barcode: dto.barcode ?? product.barcode,
      price: dto.price ?? product.price,
      isActive: dto.isActive ?? product.isActive,
      category: dto.category ?? product.category,
      purchasable: dto.purchasable ?? product.purchasable,
      sellable: dto.sellable ?? product.sellable,
      trackInventory: dto.trackInventory ?? product.trackInventory,
      OrganizationId: dto.OrganizationId ?? product.OrganizationId,
      companyId: dto.companyId ?? product.companyId,
      enterpriseId: dto.enterpriseId ?? product.enterpriseId,
    });
    return product;
  }

  remove(id: string): void {
    const index = this.products.findIndex((item) => item.id === id);
    if (index === -1) {
      throw new NotFoundException('Product not found');
    }
    this.products.splice(index, 1);
    this.persistState();
  }

  private persistState() {
    void this.moduleState
      .saveState<ProductsState>(this.stateKey, { products: this.products })
      .catch((error) => {
        const message = error instanceof Error ? error.stack ?? error.message : String(error);
        this.logger.error(`Failed to persist products: ${message}`);
      });
  }

  private mapProductForPos(product: ProductRecord): PosProductLookup {
    return {
      _id: product.id,
      name: product.name,
      sku: product.sku ?? '',
      barcode: product.barcode,
      price: product.price,
      isActive: product.isActive,
      taxRate: undefined,
    };
  }
}

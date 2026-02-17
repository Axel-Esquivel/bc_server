import { Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { ModuleStateService } from '../../core/database/module-state.service';
import { PriceListsService } from '../price-lists/price-lists.service';
import { VariantsService } from '../variants/variants.service';
import { CreateProductDto } from './dto/create-product.dto';
import { ProductByCodeQueryDto } from './dto/product-by-code-query.dto';
import { ProductSearchQueryDto } from './dto/product-search-query.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product } from './entities/product.entity';

export interface ProductRecord extends Product {
  id: string;
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

  constructor(
    private readonly moduleState: ModuleStateService,
    private readonly variantsService: VariantsService,
    private readonly priceListsService: PriceListsService,
  ) {}

  async onModuleInit(): Promise<void> {
    const state = await this.moduleState.loadState<ProductsState>(this.stateKey, { products: [] });
    this.products = state.products ?? [];
  }

  create(dto: CreateProductDto): ProductRecord {
    const product: ProductRecord = {
      id: uuid(),
      name: dto.name,
      category: dto.category,
      purchasable: dto.purchasable ?? false,
      sellable: dto.sellable ?? true,
      trackInventory: dto.trackInventory ?? false,
      OrganizationId: dto.OrganizationId,
      companyId: dto.companyId,
    };

    this.products.push(product);
    this.persistState();
    return product;
  }

  findAll(): ProductRecord[] {
    return [...this.products];
  }

  searchForPos(query: ProductSearchQueryDto): PosProductLookup[] {
    const needle = query.q.trim().toLowerCase();
    if (!needle) {
      return [];
    }

    const variants = this.variantsService.findAll().filter((variant) => {
      if (query.OrganizationId && variant.OrganizationId !== query.OrganizationId) return false;
      if (query.companyId && variant.companyId !== query.companyId) return false;
      return true;
    });

    const products = this.buildProductIndex();
    return variants
      .filter((variant) => {
        const product = products.get(variant.productId);
        const nameMatch = variant.name.toLowerCase().includes(needle);
        const skuMatch = variant.sku.toLowerCase().includes(needle);
        const productNameMatch = product?.name?.toLowerCase().includes(needle) ?? false;
        return nameMatch || skuMatch || productNameMatch;
      })
      .map((variant) => this.mapVariantForPos(variant, products))
      .filter((item): item is PosProductLookup => item !== null);
  }

  findByCodeForPos(query: ProductByCodeQueryDto): PosProductLookup | null {
    const code = query.code.trim();
    if (!code) {
      return null;
    }
    const codeLower = code.toLowerCase();
    const variants = this.variantsService.findAll().filter((variant) => {
      if (query.OrganizationId && variant.OrganizationId !== query.OrganizationId) return false;
      if (query.companyId && variant.companyId !== query.companyId) return false;
      return true;
    });

    const match = variants.find((variant) => {
      if (variant.sku.toLowerCase() === codeLower) return true;
      return variant.barcodes.some((barcode) => barcode.toLowerCase() === codeLower);
    });

    if (!match) return null;
    const products = this.buildProductIndex();
    return this.mapVariantForPos(match, products);
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
      category: dto.category ?? product.category,
      purchasable: dto.purchasable ?? product.purchasable,
      sellable: dto.sellable ?? product.sellable,
      trackInventory: dto.trackInventory ?? product.trackInventory,
      OrganizationId: dto.OrganizationId ?? product.OrganizationId,
      companyId: dto.companyId ?? product.companyId,
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

  private buildProductIndex(): Map<string, ProductRecord> {
    return new Map(this.products.map((product) => [product.id, product]));
  }

  private mapVariantForPos(
    variant: ReturnType<VariantsService['findAll']>[number],
    products: Map<string, ProductRecord>,
  ): PosProductLookup | null {
    const product = products.get(variant.productId);
    if (!product) return null;

    const price = this.resolveVariantPrice(variant.id, product.OrganizationId, product.companyId);
    const barcode = variant.barcodes.length > 0 ? variant.barcodes[0] : undefined;

    return {
      _id: variant.id,
      name: variant.name,
      sku: variant.sku,
      barcode,
      price,
      isActive: product.sellable && variant.sellable,
      taxRate: undefined,
    };
  }

  private resolveVariantPrice(variantId: string, OrganizationId: string, companyId: string): number {
    const priceLists = this.priceListsService.findAll().filter((list) => {
      if (list.OrganizationId !== OrganizationId) return false;
      if (list.companyId !== companyId) return false;
      return true;
    });

    const items = priceLists.flatMap((list) => list.items);
    const match = items.find((item) => item.variantId === variantId);
    return match?.price ?? 0;
  }
}

import { BadRequestException, Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { ModuleStateService } from '../../core/database/module-state.service';
import { OrganizationsService } from '../organizations/organizations.service';
import { VariantsService } from './variants/variants.service';
import { ProductPackagingService } from './packaging/product-packaging.service';
import { CreateProductDto } from './dto/create-product.dto';
import { ProductByCodeQueryDto } from './dto/product-by-code-query.dto';
import { ProductListQueryDto } from './dto/product-list-query.dto';
import { ProductSearchQueryDto } from './dto/product-search-query.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product } from './entities/product.entity';
import { CreateProductVariantDto } from './variants/dto/create-product-variant.dto';
import { VariantRecord } from './variants/variants.service';

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

  constructor(
    private readonly moduleState: ModuleStateService,
    private readonly variantsService: VariantsService,
    private readonly organizationsService: OrganizationsService,
    private readonly packagingService: ProductPackagingService,
  ) {}

  async onModuleInit(): Promise<void> {
    const state = await this.moduleState.loadState<ProductsState>(this.stateKey, { products: [] });
    this.products = state.products ?? [];
  }

  async create(dto: CreateProductDto): Promise<ProductRecord> {
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
    const defaultVariant = await this.variantsService.ensureDefaultVariant({
      productId: product.id,
      name: product.name,
      sku: product.sku,
      barcode: product.barcode,
      quantity: 1,
      sellable: product.sellable,
      OrganizationId: product.OrganizationId,
      companyId: product.companyId,
      enterpriseId: product.enterpriseId,
    });
    if (!product.sku) {
      product.sku = defaultVariant.sku;
    }
    if (!product.barcode && defaultVariant.barcodes.length > 0) {
      product.barcode = defaultVariant.barcodes[0];
    }
    this.persistState();
    return product;
  }

  findAll(filters?: ProductListQueryDto): ProductRecord[] {
    if (!filters) {
      return [...this.products];
    }
    const includeInactive = filters.includeInactive === 'true';
    return this.products.filter((product) => {
      if (product.enterpriseId !== filters.enterpriseId) return false;
      if (filters.OrganizationId && product.OrganizationId !== filters.OrganizationId) return false;
      if (filters.companyId && product.companyId !== filters.companyId) return false;
      if (!includeInactive && product.isActive === false) return false;
      return true;
    });
  }

  searchForPos(query: ProductSearchQueryDto): PosProductLookup[] {
    const needle = query.q.trim().toLowerCase();
    if (!needle) {
      return [];
    }
    const productMap = new Map(this.products.map((product) => [product.id, product]));
    return this.variantsService
      .findAll()
      .filter((variant) => {
        if (variant.enterpriseId !== query.enterpriseId) return false;
        if (query.OrganizationId && variant.OrganizationId !== query.OrganizationId) return false;
        if (query.companyId && variant.companyId !== query.companyId) return false;
        const product = productMap.get(variant.productId);
        if (!product) return false;
        const nameMatch = product.name.toLowerCase().includes(needle);
        const skuMatch = variant.sku?.toLowerCase().includes(needle) ?? false;
        const barcodeMatch = variant.barcodes.some((barcode) => barcode.toLowerCase().includes(needle));
        return nameMatch || skuMatch || barcodeMatch;
      })
      .map((variant) => {
        const product = productMap.get(variant.productId);
        if (!product) {
          return null;
        }
        return this.mapVariantForPos(product, variant);
      })
      .filter((item): item is PosProductLookup => Boolean(item));
  }

  findByCodeForPos(query: ProductByCodeQueryDto): PosProductLookup | null {
    const variant = this.variantsService.findByCode({
      enterpriseId: query.enterpriseId,
      code: query.code,
      OrganizationId: query.OrganizationId,
      companyId: query.companyId,
    });
    if (!variant) {
      return null;
    }
    const product = this.products.find((item) => item.id === variant.productId);
    if (!product) {
      return null;
    }
    return this.mapVariantForPos(product, variant);
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
    this.persistState();
    return product;
  }

  setStatus(id: string, isActive: boolean, organizationId?: string): ProductRecord {
    const product = this.findOne(id);
    if (organizationId && product.OrganizationId !== organizationId) {
      throw new BadRequestException('Product does not belong to organization');
    }
    product.isActive = isActive;
    this.persistState();
    return product;
  }

  async createVariant(productId: string, dto: CreateProductVariantDto): Promise<VariantRecord> {
    const product = this.findOne(productId);
    const enableVariants = await this.isVariantsEnabled(product.OrganizationId);
    const existing = this.variantsService.countByProduct(productId);
    if (!enableVariants && existing > 0) {
      throw new BadRequestException('Variants are disabled for this organization');
    }
    return this.variantsService.create({
      productId,
      name: dto.name,
      sku: dto.sku,
      barcodes: dto.barcodes ?? [],
      internalBarcode: dto.internalBarcode,
      generateInternalBarcode: dto.generateInternalBarcode,
      quantity: dto.quantity,
      uomId: dto.uomId,
      uomCategoryId: dto.uomCategoryId,
      sellable: dto.sellable ?? true,
      OrganizationId: product.OrganizationId,
      companyId: product.companyId,
      enterpriseId: product.enterpriseId,
    });
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

  private mapVariantForPos(product: ProductRecord, variant: VariantRecord): PosProductLookup {
    const defaultPackaging = this.packagingService.findDefaultByVariant(variant.id);
    return {
      _id: variant.id,
      name: product.name,
      sku: variant.sku ?? '',
      barcode: variant.barcodes[0],
      price: defaultPackaging?.price ?? 0,
      isActive: product.isActive,
      taxRate: undefined,
    };
  }

  private async isVariantsEnabled(organizationId: string): Promise<boolean> {
    if (!organizationId) {
      return false;
    }
    const organization = await this.organizationsService.getOrganization(organizationId);
    const settings = (organization.moduleSettings?.products ?? {}) as { enableVariants?: boolean };
    return settings.enableVariants === true;
  }
}

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
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
import { ProductsModelsProvider } from './models/products-models.provider';
import { ProductDocument } from './schemas/product.schema';
import { ProductVariantDocument } from './schemas/product-variant.schema';

export interface ProductRecord extends Product {
  id: string;
  createdAt?: Date;
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
export class ProductsService {
  constructor(
    private readonly models: ProductsModelsProvider,
    private readonly variantsService: VariantsService,
    private readonly organizationsService: OrganizationsService,
    private readonly packagingService: ProductPackagingService,
  ) {}

  async create(dto: CreateProductDto): Promise<ProductRecord> {
    const model = this.models.productModel(dto.OrganizationId);
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

    const created = await model.create(product);
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
    const nextSku = product.sku || defaultVariant.sku;
    const nextBarcode = product.barcode || (defaultVariant.barcodes.length > 0 ? defaultVariant.barcodes[0] : undefined);
    if (nextSku !== created.sku || nextBarcode !== created.barcode) {
      await model
        .updateOne(
          { id: product.id },
          {
            $set: {
              sku: nextSku,
              barcode: nextBarcode,
            },
          },
        )
        .exec();
    }
    return {
      ...(created.toObject() as ProductRecord),
      sku: nextSku,
      barcode: nextBarcode,
    };
  }

  async findAll(filters?: ProductListQueryDto, organizationId?: string): Promise<ProductRecord[]> {
    const orgId = organizationId ?? filters?.OrganizationId;
    if (!filters || !orgId) {
      return [];
    }
    const model = this.models.productModel(orgId);
    const includeInactive = filters.includeInactive === 'true';
    const query: Record<string, string | boolean> = {
      enterpriseId: filters.enterpriseId,
    };
    if (filters.companyId) {
      query.companyId = filters.companyId;
    }
    if (!includeInactive) {
      query.isActive = true;
    }
    return await model.find(query).lean<ProductRecord[]>().exec();
  }

  async searchForPos(query: ProductSearchQueryDto, organizationId?: string): Promise<PosProductLookup[]> {
    const needle = query.q.trim().toLowerCase();
    const orgId = organizationId ?? query.OrganizationId;
    if (!needle || !orgId) {
      return [];
    }
    const variantModel = this.models.variantModel(orgId);
    const productModel = this.models.productModel(orgId);
    const variantQuery: Record<string, string> = {
      enterpriseId: query.enterpriseId,
    };
    if (query.companyId) {
      variantQuery.companyId = query.companyId;
    }
    const variants = await variantModel.find(variantQuery).lean<ProductVariantDocument[]>().exec();
    if (variants.length === 0) {
      return [];
    }
    const productIds = Array.from(new Set(variants.map((variant) => variant.productId)));
    const products = await productModel
      .find({ id: { $in: productIds } })
      .lean<ProductDocument[]>()
      .exec();
    const productMap = new Map(products.map((product) => [product.id, product]));
    const matches = variants.filter((variant) => {
      const product = productMap.get(variant.productId);
      if (!product) return false;
      const nameMatch = product.name.toLowerCase().includes(needle);
      const skuMatch = variant.sku?.toLowerCase().includes(needle) ?? false;
      const barcodeMatch = variant.barcodes.some((barcode) => barcode.toLowerCase().includes(needle));
      return nameMatch || skuMatch || barcodeMatch;
    });
    const mapped = await Promise.all(
      matches.map(async (variant) => {
        const product = productMap.get(variant.productId);
        if (!product) {
          return null;
        }
        return this.mapVariantForPos(product, variant);
      }),
    );
    return mapped.filter((item): item is PosProductLookup => Boolean(item));
  }

  async findByCodeForPos(query: ProductByCodeQueryDto, organizationId?: string): Promise<PosProductLookup | null> {
    const orgId = organizationId ?? query.OrganizationId;
    if (!orgId) {
      return null;
    }
    const variant = await this.variantsService.findByCode({
      enterpriseId: query.enterpriseId,
      code: query.code,
      OrganizationId: orgId,
      companyId: query.companyId,
    });
    if (!variant) {
      return null;
    }
    const model = this.models.productModel(orgId);
    const product = await model.findOne({ id: variant.productId }).lean<ProductDocument>().exec();
    if (!product) {
      return null;
    }
    return this.mapVariantForPos(product, variant);
  }

  async findOne(id: string, organizationId: string): Promise<ProductRecord> {
    const model = this.models.productModel(organizationId);
    const product = await model.findOne({ id }).lean<ProductDocument>().exec();
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    return product as ProductRecord;
  }

  async update(id: string, dto: UpdateProductDto, organizationId: string): Promise<ProductRecord> {
    const model = this.models.productModel(organizationId);
    const product = await this.findOne(id, organizationId);
    const next = {
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
    };
    await model.updateOne({ id }, { $set: next }).exec();
    return { ...product, ...next };
  }

  async setStatus(id: string, isActive: boolean, organizationId: string): Promise<ProductRecord> {
    if (!organizationId) {
      throw new BadRequestException('OrganizationId is required');
    }
    const model = this.models.productModel(organizationId);
    const product = await this.findOne(id, organizationId);
    await model.updateOne({ id }, { $set: { isActive } }).exec();
    return { ...product, isActive };
  }

  async createVariant(
    productId: string,
    dto: CreateProductVariantDto,
    organizationId: string,
  ): Promise<VariantRecord> {
    const product = await this.findOne(productId, organizationId);
    const enableVariants = await this.isVariantsEnabled(product.OrganizationId);
    const existing = await this.variantsService.countByProduct(productId, product.OrganizationId);
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

  async remove(id: string, organizationId: string): Promise<void> {
    const model = this.models.productModel(organizationId);
    const exists = await model.exists({ id });
    if (!exists) {
      throw new NotFoundException('Product not found');
    }
    await model.deleteOne({ id }).exec();
  }

  private async mapVariantForPos(product: ProductDocument, variant: VariantRecord): Promise<PosProductLookup> {
    const defaultPackaging = await this.packagingService.findDefaultByVariant(variant.id, product.OrganizationId);
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

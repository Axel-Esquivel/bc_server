import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { CreateVariantDto } from './dto/create-variant.dto';
import { UpdateVariantDto } from './dto/update-variant.dto';
import { ProductVariant } from './entities/product-variant.entity';
import { VariantByCodeQueryDto } from './dto/variant-by-code-query.dto';
import { ProductPackagingService } from '../packaging/product-packaging.service';
import { CounterService } from '../../../core/database/counter.service';
import { Ean13Service } from '../../../core/utils/ean13.service';
import { OrganizationsService } from '../../organizations/organizations.service';
import { ProductsModelsProvider } from '../models/products-models.provider';

export interface VariantRecord extends ProductVariant {
  id: string;
}

export interface DefaultVariantInput {
  productId: string;
  name: string;
  sku?: string;
  barcode?: string;
  uomId?: string;
  uomCategoryId?: string;
  quantity?: number;
  minStock?: number;
  sellable?: boolean;
  OrganizationId: string;
  companyId: string;
  enterpriseId: string;
}

@Injectable()
export class VariantsService {
  constructor(
    private readonly models: ProductsModelsProvider,
    private readonly packagingService: ProductPackagingService,
    private readonly counterService: CounterService,
    private readonly ean13Service: Ean13Service,
    private readonly organizationsService: OrganizationsService,
  ) {}

  async create(dto: CreateVariantDto): Promise<VariantRecord> {
    const model = this.models.variantModel(dto.OrganizationId);
    const sku = await this.ensureSku(dto.sku, dto.OrganizationId, dto.enterpriseId);
    await this.assertUniqueSku(sku, dto.OrganizationId, dto.enterpriseId);
    const internalBarcode = await this.resolveInternalBarcode(dto);
    const variant: VariantRecord = {
      id: uuid(),
      productId: dto.productId,
      name: dto.name,
      sku,
      barcodes: dto.barcodes?.length ? dto.barcodes : [],
      internalBarcode: internalBarcode ?? undefined,
      minStock: dto.minStock ?? 0,
      uomId: dto.uomId,
      uomCategoryId: dto.uomCategoryId,
      quantity: dto.quantity ?? 1,
      sellable: dto.sellable ?? true,
      OrganizationId: dto.OrganizationId,
      companyId: dto.companyId,
      enterpriseId: dto.enterpriseId,
    };

    await model.create(variant);
    return variant;
  }

  async findAll(organizationId?: string): Promise<VariantRecord[]> {
    if (!organizationId) {
      return [];
    }
    const model = this.models.variantModel(organizationId);
    return await model.find({ OrganizationId: organizationId }).lean<VariantRecord[]>().exec();
  }

  async findByProduct(productId: string, organizationId: string): Promise<VariantRecord[]> {
    const model = this.models.variantModel(organizationId);
    return await model.find({ productId }).lean<VariantRecord[]>().exec();
  }

  async findOne(id: string, organizationId: string): Promise<VariantRecord> {
    const model = this.models.variantModel(organizationId);
    const variant = await model.findOne({ id }).lean<VariantRecord>().exec();
    if (!variant) {
      throw new NotFoundException('Variant not found');
    }
    return variant as VariantRecord;
  }

  async update(id: string, dto: UpdateVariantDto, organizationId: string): Promise<VariantRecord> {
    const model = this.models.variantModel(organizationId);
    const variant = await this.findOne(id, organizationId);
    const nextSku = dto.sku?.trim() || variant.sku;
    if (nextSku !== variant.sku) {
      await this.assertUniqueSku(nextSku, variant.OrganizationId, variant.enterpriseId, variant.id);
    }
    const internalBarcode = await this.resolveInternalBarcode(dto, variant);
    const next = {
      productId: dto.productId ?? variant.productId,
      name: dto.name ?? variant.name,
      sku: nextSku,
      barcodes: dto.barcodes ?? variant.barcodes,
      internalBarcode: internalBarcode ?? variant.internalBarcode,
      minStock: dto.minStock ?? variant.minStock,
      uomId: dto.uomId ?? variant.uomId,
      uomCategoryId: dto.uomCategoryId ?? variant.uomCategoryId,
      quantity: dto.quantity ?? variant.quantity,
      sellable: dto.sellable ?? variant.sellable,
      OrganizationId: dto.OrganizationId ?? variant.OrganizationId,
      companyId: dto.companyId ?? variant.companyId,
      enterpriseId: dto.enterpriseId ?? variant.enterpriseId,
    };
    await model.updateOne({ id }, { $set: next }).exec();
    return { ...variant, ...next };
  }

  async findByCode(query: VariantByCodeQueryDto): Promise<VariantRecord | null> {
    const code = query.code.trim().toLowerCase();
    if (!code || !query.OrganizationId) {
      return null;
    }
    const model = this.models.variantModel(query.OrganizationId);
    const record = await model
      .findOne({
        enterpriseId: query.enterpriseId,
        ...(query.companyId ? { companyId: query.companyId } : {}),
        $or: [
          { sku: code },
          { barcodes: code },
        ],
      })
      .lean<VariantRecord>()
      .exec();
    if (!record) {
      return null;
    }
    return record as VariantRecord;
  }

  async ensureDefaultVariant(input: DefaultVariantInput): Promise<VariantRecord> {
    const model = this.models.variantModel(input.OrganizationId);
    const existing = await model.findOne({ productId: input.productId }).lean<VariantRecord>().exec();
    if (existing) {
      return existing as VariantRecord;
    }
    return this.create({
      productId: input.productId,
      name: input.name,
      sku: input.sku,
      barcodes: input.barcode ? [input.barcode] : [],
      minStock: input.minStock ?? 0,
      uomId: input.uomId ?? 'unit',
      uomCategoryId: input.uomCategoryId,
      quantity: input.quantity ?? 1,
      sellable: input.sellable ?? true,
      OrganizationId: input.OrganizationId,
      companyId: input.companyId,
      enterpriseId: input.enterpriseId,
    });
  }

  async countByProduct(productId: string, organizationId: string): Promise<number> {
    const model = this.models.variantModel(organizationId);
    return model.countDocuments({ productId }).exec();
  }

  async remove(id: string, organizationId: string): Promise<void> {
    const model = this.models.variantModel(organizationId);
    const exists = await model.exists({ id });
    if (!exists) {
      throw new NotFoundException('Variant not found');
    }
    await model.deleteOne({ id }).exec();
  }

  private async ensureSku(
    sku: string | undefined,
    organizationId: string,
    enterpriseId: string,
  ): Promise<string> {
    const normalized = sku?.trim();
    if (normalized) {
      return normalized;
    }
    return this.generateSku(organizationId, enterpriseId);
  }

  private async generateSku(organizationId: string, enterpriseId: string): Promise<string> {
    const model = this.models.variantModel(organizationId);
    const prefix = 'PRD-';
    const existing = await model
      .find({ OrganizationId: organizationId, enterpriseId, sku: new RegExp(`^${prefix}`) }, { sku: 1 })
      .lean<{ sku: string }[]>()
      .exec();
    let max = 0;
    for (const record of existing) {
      const value = Number(record.sku.slice(prefix.length));
      if (!Number.isNaN(value) && value > max) {
        max = value;
      }
    }
    let next = max + 1;
    let candidate = `${prefix}${String(next).padStart(6, '0')}`;
    while (!(await this.isSkuAvailable(candidate, organizationId, enterpriseId))) {
      next += 1;
      candidate = `${prefix}${String(next).padStart(6, '0')}`;
    }
    return candidate;
  }

  private async isSkuAvailable(
    sku: string,
    organizationId: string,
    enterpriseId: string,
    excludeId?: string,
  ): Promise<boolean> {
    const model = this.models.variantModel(organizationId);
    const existing = await model
      .findOne({
        sku,
        enterpriseId,
        ...(excludeId ? { id: { $ne: excludeId } } : {}),
      })
      .lean<{ sku: string }>()
      .exec();
    return !existing;
  }

  private async assertUniqueSku(
    sku: string,
    organizationId: string,
    enterpriseId: string,
    excludeId?: string,
  ): Promise<void> {
    if (!(await this.isSkuAvailable(sku, organizationId, enterpriseId, excludeId))) {
      throw new BadRequestException('SKU already exists');
    }
  }

  private async resolveInternalBarcode(
    dto: CreateVariantDto | UpdateVariantDto,
    current?: VariantRecord,
  ): Promise<string | null> {
    const requested = dto.internalBarcode?.trim();
    if (requested) {
      await this.assertUniqueInternalBarcode(requested, dto.OrganizationId ?? current?.OrganizationId, current?.id);
      return requested;
    }
    if (dto.generateInternalBarcode) {
      const organizationId = dto.OrganizationId ?? current?.OrganizationId;
      if (!organizationId) {
        throw new BadRequestException('OrganizationId is required to generate internal barcode');
      }
      return this.generateInternalBarcode(organizationId, '01');
    }
    return current?.internalBarcode ?? null;
  }

  private async assertUniqueInternalBarcode(value: string, organizationId?: string, excludeId?: string): Promise<void> {
    if (!organizationId) {
      throw new BadRequestException('OrganizationId is required');
    }
    const normalized = value.trim();
    const model = this.models.variantModel(organizationId);
    const existsInVariants = await model
      .findOne({
        internalBarcode: normalized,
        ...(excludeId ? { id: { $ne: excludeId } } : {}),
      })
      .lean<{ id: string }>()
      .exec();
    if (existsInVariants) {
      throw new BadRequestException('Internal barcode already exists');
    }
    const existsInPackaging = await this.packagingService.existsInternalBarcode(organizationId, normalized);
    if (existsInPackaging) {
      throw new BadRequestException('Internal barcode already exists');
    }
  }

  private async generateInternalBarcode(organizationId: string, type: '01' | '02'): Promise<string> {
    const organization = await this.organizationsService.getOrganization(organizationId);
    const seq = await this.counterService.next(organizationId, 'variant_internal_barcode');
    return this.ean13Service.buildInternalBarcode(organization.eanPrefix, type, seq);
  }
}

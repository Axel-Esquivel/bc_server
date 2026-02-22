import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { CreatePackagingDto } from './dto/create-packaging.dto';
import { UpdatePackagingDto } from './dto/update-packaging.dto';
import { ProductPackaging } from './entities/product-packaging.entity';
import type { VariantRecord } from '../variants/variants.service';
import { CounterService } from '../../../core/database/counter.service';
import { Ean13Service } from '../../../core/utils/ean13.service';
import { OrganizationsService } from '../../organizations/organizations.service';
import { ProductsModelsProvider } from '../models/products-models.provider';
import { ProductVariantDocument } from '../schemas/product-variant.schema';

export interface PackagingRecord extends ProductPackaging {
  id: string;
}

@Injectable()
export class ProductPackagingService {
  constructor(
    private readonly models: ProductsModelsProvider,
    private readonly counterService: CounterService,
    private readonly ean13Service: Ean13Service,
    private readonly organizationsService: OrganizationsService,
  ) {}

  async create(dto: CreatePackagingDto): Promise<PackagingRecord> {
    if (!dto.variantId) {
      throw new BadRequestException('variantId is required');
    }
    const model = this.models.packagingModel(dto.OrganizationId);
    const internalBarcode = await this.resolveInternalBarcode(dto);
    const record: PackagingRecord = {
      id: uuid(),
      variantId: dto.variantId,
      name: dto.name.trim(),
      unitsPerPack: dto.unitsPerPack,
      barcode: dto.barcode?.trim() || undefined,
      internalBarcode: internalBarcode ?? undefined,
      price: dto.price,
      isActive: dto.isActive ?? true,
      OrganizationId: dto.OrganizationId,
      companyId: dto.companyId,
      enterpriseId: dto.enterpriseId,
    };
    await model.create(record);
    return record;
  }

  async listByVariant(variantId: string, organizationId: string): Promise<PackagingRecord[]> {
    const model = this.models.packagingModel(organizationId);
    return await model
      .find({ variantId })
      .lean<PackagingRecord[]>()
      .exec();
  }

  async update(id: string, dto: UpdatePackagingDto, organizationId: string): Promise<PackagingRecord> {
    const model = this.models.packagingModel(organizationId);
    const record = await this.findOne(id, organizationId);
    if (dto.internalBarcode) {
      await this.assertUniqueInternalBarcode(dto.internalBarcode, record.OrganizationId, record.id);
    }
    const next = {
      name: dto.name?.trim() ?? record.name,
      unitsPerPack: dto.unitsPerPack ?? record.unitsPerPack,
      barcode: dto.barcode?.trim() ?? record.barcode,
      internalBarcode: dto.internalBarcode?.trim() ?? record.internalBarcode,
      price: dto.price ?? record.price,
      isActive: dto.isActive ?? record.isActive,
    };
    await model.updateOne({ id }, { $set: next }).exec();
    return { ...record, ...next };
  }

  async softDelete(id: string, organizationId: string): Promise<PackagingRecord> {
    const model = this.models.packagingModel(organizationId);
    const record = await this.findOne(id, organizationId);
    await model.updateOne({ id }, { $set: { isActive: false } }).exec();
    return { ...record, isActive: false };
  }

  async findDefaultByVariant(variantId: string, organizationId: string): Promise<PackagingRecord | null> {
    const items = await this.listByVariant(variantId, organizationId);
    const candidates = items.filter((item) => item.isActive);
    if (candidates.length === 0) {
      return null;
    }
    const unit = candidates.find((item) => item.unitsPerPack === 1) ?? candidates[0];
    return unit ?? null;
  }

  async ensureDefaultPackaging(variant: VariantRecord): Promise<PackagingRecord> {
    const model = this.models.packagingModel(variant.OrganizationId);
    const existing = await model
      .findOne({ variantId: variant.id, unitsPerPack: 1, isActive: true })
      .lean<PackagingRecord>()
      .exec();
    if (existing) {
      return existing as PackagingRecord;
    }
    const internalBarcode = await this.generateInternalBarcode(variant.OrganizationId, '02');
    const created: PackagingRecord = {
      id: uuid(),
      variantId: variant.id,
      name: 'Unidad',
      unitsPerPack: 1,
      internalBarcode,
      price: 0,
      isActive: true,
      OrganizationId: variant.OrganizationId,
      companyId: variant.companyId,
      enterpriseId: variant.enterpriseId,
    };
    await model.create(created);
    return created;
  }

  async existsInternalBarcode(organizationId: string, code: string, excludeId?: string): Promise<boolean> {
    const normalized = code.trim();
    const model = this.models.packagingModel(organizationId);
    const exists = await model
      .findOne({
        internalBarcode: normalized,
        ...(excludeId ? { id: { $ne: excludeId } } : {}),
      })
      .lean<{ id: string }>()
      .exec();
    return Boolean(exists);
  }

  async generateInternalBarcode(organizationId: string, type: '01' | '02'): Promise<string> {
    const organization = await this.organizationsService.getOrganization(organizationId);
    const seq = await this.counterService.next(organizationId, 'package_internal_barcode');
    return this.ean13Service.buildInternalBarcode(organization.eanPrefix, type, seq);
  }

  async generateInternalBarcodeForPackaging(
    organizationId: string,
    packagingId?: string,
  ): Promise<string> {
    if (!packagingId) {
      return this.generateInternalBarcode(organizationId, '02');
    }
    const model = this.models.packagingModel(organizationId);
    const record = await model.findOne({ id: packagingId }).lean<PackagingRecord>().exec();
    if (!record) {
      throw new NotFoundException('Packaging not found');
    }
    if (record.internalBarcode) {
      return record.internalBarcode;
    }
    const internalBarcode = await this.generateInternalBarcode(organizationId, '02');
    return internalBarcode;
  }

  private async findOne(id: string, organizationId: string): Promise<PackagingRecord> {
    const model = this.models.packagingModel(organizationId);
    const record = await model.findOne({ id }).lean<PackagingRecord>().exec();
    if (!record) {
      throw new NotFoundException('Packaging not found');
    }
    return record as PackagingRecord;
  }

  private async resolveInternalBarcode(dto: CreatePackagingDto): Promise<string | null> {
    const provided = dto.internalBarcode?.trim();
    if (provided) {
      await this.assertUniqueInternalBarcode(provided, dto.OrganizationId);
      return provided;
    }
    return null;
  }

  private async assertUniqueInternalBarcode(
    code: string,
    organizationId: string,
    excludeId?: string,
  ): Promise<void> {
    if (!organizationId) {
      throw new BadRequestException('OrganizationId is required');
    }
    const exists = await this.existsInternalBarcode(organizationId, code, excludeId);
    if (exists) {
      throw new BadRequestException('Internal barcode already exists');
    }
    const variantModel = this.models.variantModel(organizationId);
    const existsInVariants = await variantModel
      .findOne({ internalBarcode: code.trim() })
      .lean<ProductVariantDocument>()
      .exec();
    if (existsInVariants) {
      throw new BadRequestException('Internal barcode already exists');
    }
  }
}

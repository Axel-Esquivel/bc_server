import { BadRequestException, Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { ModuleStateService } from '../../../core/database/module-state.service';
import { CreateVariantDto } from './dto/create-variant.dto';
import { UpdateVariantDto } from './dto/update-variant.dto';
import { ProductVariant } from './entities/product-variant.entity';
import { VariantByCodeQueryDto } from './dto/variant-by-code-query.dto';
import { ProductPackagingService } from '../packaging/product-packaging.service';
import { CounterService } from '../../../core/database/counter.service';
import { Ean13Service } from '../../../core/utils/ean13.service';
import { OrganizationsService } from '../../organizations/organizations.service';

export interface VariantRecord extends ProductVariant {
  id: string;
}

interface VariantsState {
  variants: VariantRecord[];
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
export class VariantsService implements OnModuleInit {
  private readonly logger = new Logger(VariantsService.name);
  private readonly stateKey = 'module:products:variants';
  private variants: VariantRecord[] = [];

  constructor(
    private readonly moduleState: ModuleStateService,
    private readonly packagingService: ProductPackagingService,
    private readonly counterService: CounterService,
    private readonly ean13Service: Ean13Service,
    private readonly organizationsService: OrganizationsService,
  ) {}

  async onModuleInit(): Promise<void> {
    const state = await this.moduleState.loadState<VariantsState>(this.stateKey, { variants: [] });
    this.variants = state.variants ?? [];
  }

  async create(dto: CreateVariantDto): Promise<VariantRecord> {
    const sku = this.ensureSku(dto.sku, dto.OrganizationId, dto.enterpriseId);
    this.assertUniqueSku(sku, dto.OrganizationId, dto.enterpriseId);
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

    this.variants.push(variant);
    await this.packagingService.ensureDefaultPackaging(variant);
    this.persistState();
    return variant;
  }

  findAll(): VariantRecord[] {
    return [...this.variants];
  }

  findByProduct(productId: string): VariantRecord[] {
    return this.variants.filter((variant) => variant.productId === productId);
  }

  findOne(id: string): VariantRecord {
    const variant = this.variants.find((item) => item.id === id);
    if (!variant) {
      throw new NotFoundException('Variant not found');
    }
    this.persistState();
    return variant;
  }

  async update(id: string, dto: UpdateVariantDto): Promise<VariantRecord> {
    const variant = this.findOne(id);
    const nextSku = dto.sku?.trim() || variant.sku;
    if (nextSku !== variant.sku) {
      this.assertUniqueSku(nextSku, variant.OrganizationId, variant.enterpriseId, variant.id);
    }
    const internalBarcode = await this.resolveInternalBarcode(dto, variant);
    Object.assign(variant, {
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
    });
    return variant;
  }

  findByCode(query: VariantByCodeQueryDto): VariantRecord | null {
    const code = query.code.trim().toLowerCase();
    if (!code) {
      return null;
    }
    return (
      this.variants.find((variant) => {
        if (variant.enterpriseId !== query.enterpriseId) return false;
        if (query.OrganizationId && variant.OrganizationId !== query.OrganizationId) return false;
        if (query.companyId && variant.companyId !== query.companyId) return false;
        if (variant.sku?.toLowerCase() === code) return true;
        return variant.barcodes.some((barcode) => barcode.toLowerCase() === code);
      }) ?? null
    );
  }

  async ensureDefaultVariant(input: DefaultVariantInput): Promise<VariantRecord> {
    const existing = this.variants.find((variant) => variant.productId === input.productId);
    if (existing) {
      return existing;
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

  countByProduct(productId: string): number {
    return this.variants.filter((variant) => variant.productId === productId).length;
  }

  remove(id: string): void {
    const index = this.variants.findIndex((item) => item.id === id);
    if (index === -1) {
      throw new NotFoundException('Variant not found');
    }
    this.variants.splice(index, 1);
    this.persistState();
  }

  private persistState() {
    void this.moduleState
      .saveState<VariantsState>(this.stateKey, { variants: this.variants })
      .catch((error) => {
        const message = error instanceof Error ? error.stack ?? error.message : String(error);
        this.logger.error(`Failed to persist variants: ${message}`);
      });
  }

  private ensureSku(sku: string | undefined, organizationId: string, enterpriseId: string): string {
    const normalized = sku?.trim();
    if (normalized) {
      return normalized;
    }
    return this.generateSku(organizationId, enterpriseId);
  }

  private generateSku(organizationId: string, enterpriseId: string): string {
    const prefix = 'PRD-';
    const candidates = this.variants
      .filter((variant) => variant.OrganizationId === organizationId && variant.enterpriseId === enterpriseId)
      .map((variant) => variant.sku);
    let max = 0;
    for (const sku of candidates) {
      if (!sku.startsWith(prefix)) {
        continue;
      }
      const value = Number(sku.slice(prefix.length));
      if (!Number.isNaN(value) && value > max) {
        max = value;
      }
    }
    let next = max + 1;
    let candidate = `${prefix}${String(next).padStart(6, '0')}`;
    while (!this.isSkuAvailable(candidate, organizationId, enterpriseId)) {
      next += 1;
      candidate = `${prefix}${String(next).padStart(6, '0')}`;
    }
    return candidate;
  }

  private isSkuAvailable(sku: string, organizationId: string, enterpriseId: string, excludeId?: string): boolean {
    return !this.variants.some(
      (variant) =>
        variant.sku === sku &&
        variant.OrganizationId === organizationId &&
        variant.enterpriseId === enterpriseId &&
        variant.id !== excludeId,
    );
  }

  private assertUniqueSku(sku: string, organizationId: string, enterpriseId: string, excludeId?: string): void {
    if (!this.isSkuAvailable(sku, organizationId, enterpriseId, excludeId)) {
      throw new BadRequestException('SKU already exists');
    }
  }

  private async resolveInternalBarcode(
    dto: CreateVariantDto | UpdateVariantDto,
    current?: VariantRecord,
  ): Promise<string | null> {
    const requested = dto.internalBarcode?.trim();
    if (requested) {
      this.assertUniqueInternalBarcode(requested, dto.OrganizationId ?? current?.OrganizationId);
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

  private assertUniqueInternalBarcode(value: string, organizationId?: string): void {
    if (!organizationId) {
      throw new BadRequestException('OrganizationId is required');
    }
    const normalized = value.trim();
    const existsInVariants = this.variants.some(
      (variant) => variant.OrganizationId === organizationId && variant.internalBarcode === normalized,
    );
    if (existsInVariants) {
      throw new BadRequestException('Internal barcode already exists');
    }
    if (this.packagingService.existsInternalBarcode(organizationId, normalized)) {
      throw new BadRequestException('Internal barcode already exists');
    }
  }

  private async generateInternalBarcode(organizationId: string, type: '01' | '02'): Promise<string> {
    const organization = await this.organizationsService.getOrganization(organizationId);
    const seq = await this.counterService.next(organizationId, 'variant_internal_barcode');
    return this.ean13Service.buildInternalBarcode(organization.eanPrefix, type, seq);
  }
}

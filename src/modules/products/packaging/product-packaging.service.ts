import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { ModuleStateService } from '../../../core/database/module-state.service';
import { CreatePackagingDto } from './dto/create-packaging.dto';
import { UpdatePackagingDto } from './dto/update-packaging.dto';
import { ProductPackaging } from './entities/product-packaging.entity';
import type { VariantRecord } from '../variants/variants.service';
import { CounterService } from '../../../core/database/counter.service';
import { Ean13Service } from '../../../core/utils/ean13.service';
import { OrganizationsService } from '../../organizations/organizations.service';

export interface PackagingRecord extends ProductPackaging {
  id: string;
}

interface PackagingState {
  packaging: PackagingRecord[];
}

@Injectable()
export class ProductPackagingService {
  private readonly logger = new Logger(ProductPackagingService.name);
  private readonly stateKey = 'module:products:packaging';
  private packaging: PackagingRecord[] = [];

  constructor(
    private readonly moduleState: ModuleStateService,
    private readonly counterService: CounterService,
    private readonly ean13Service: Ean13Service,
    private readonly organizationsService: OrganizationsService,
  ) {}

  async onModuleInit(): Promise<void> {
    const state = await this.moduleState.loadState<PackagingState>(this.stateKey, { packaging: [] });
    this.packaging = Array.isArray(state.packaging) ? state.packaging : [];
  }

  async create(dto: CreatePackagingDto): Promise<PackagingRecord> {
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
    this.packaging.push(record);
    this.persistState();
    return record;
  }

  listByVariant(variantId: string): PackagingRecord[] {
    return this.packaging.filter((item) => item.variantId === variantId);
  }

  async update(id: string, dto: UpdatePackagingDto): Promise<PackagingRecord> {
    const record = this.findOne(id);
    if (dto.internalBarcode) {
      this.assertUniqueInternalBarcode(dto.internalBarcode, record.OrganizationId, record.id);
    }
    Object.assign(record, {
      name: dto.name?.trim() ?? record.name,
      unitsPerPack: dto.unitsPerPack ?? record.unitsPerPack,
      barcode: dto.barcode?.trim() ?? record.barcode,
      internalBarcode: dto.internalBarcode?.trim() ?? record.internalBarcode,
      price: dto.price ?? record.price,
      isActive: dto.isActive ?? record.isActive,
    });
    this.persistState();
    return record;
  }

  softDelete(id: string): PackagingRecord {
    const record = this.findOne(id);
    record.isActive = false;
    this.persistState();
    return record;
  }

  findDefaultByVariant(variantId: string): PackagingRecord | null {
    const candidates = this.listByVariant(variantId).filter((item) => item.isActive);
    if (candidates.length === 0) {
      return null;
    }
    const unit = candidates.find((item) => item.unitsPerPack === 1) ?? candidates[0];
    return unit ?? null;
  }

  async ensureDefaultPackaging(variant: VariantRecord): Promise<PackagingRecord> {
    const existing = this.listByVariant(variant.id).find(
      (item) => item.unitsPerPack === 1 && item.isActive,
    );
    if (existing) {
      return existing;
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
    this.packaging.push(created);
    this.persistState();
    return created;
  }

  existsInternalBarcode(organizationId: string, code: string, excludeId?: string): boolean {
    const normalized = code.trim();
    return this.packaging.some(
      (item) =>
        item.OrganizationId === organizationId &&
        item.internalBarcode === normalized &&
        item.id !== excludeId,
    );
  }

  async generateInternalBarcode(organizationId: string, type: '01' | '02'): Promise<string> {
    const organization = await this.organizationsService.getOrganization(organizationId);
    const seq = await this.counterService.next(organizationId, 'package_internal_barcode');
    return this.ean13Service.buildInternalBarcode(organization.eanPrefix, type, seq);
  }

  private findOne(id: string): PackagingRecord {
    const record = this.packaging.find((item) => item.id === id);
    if (!record) {
      throw new NotFoundException('Packaging not found');
    }
    return record;
  }

  private async resolveInternalBarcode(dto: CreatePackagingDto): Promise<string | null> {
    const provided = dto.internalBarcode?.trim();
    if (provided) {
      this.assertUniqueInternalBarcode(provided, dto.OrganizationId);
      return provided;
    }
    return this.generateInternalBarcode(dto.OrganizationId, '02');
  }

  private assertUniqueInternalBarcode(code: string, organizationId: string, excludeId?: string): void {
    if (!organizationId) {
      throw new BadRequestException('OrganizationId is required');
    }
    if (this.existsInternalBarcode(organizationId, code, excludeId)) {
      throw new BadRequestException('Internal barcode already exists');
    }
  }

  private persistState() {
    void this.moduleState
      .saveState<PackagingState>(this.stateKey, { packaging: this.packaging })
      .catch((error) => {
        const message = error instanceof Error ? error.stack ?? error.message : String(error);
        this.logger.error(`Failed to persist packaging: ${message}`);
      });
  }
}

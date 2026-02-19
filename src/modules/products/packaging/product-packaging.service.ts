import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { ModuleStateService } from '../../../core/database/module-state.service';
import { CreatePackagingDto } from './dto/create-packaging.dto';
import { UpdatePackagingDto } from './dto/update-packaging.dto';
import { ProductPackaging } from './entities/product-packaging.entity';
import type { VariantRecord } from '../variants/variants.service';

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

  constructor(private readonly moduleState: ModuleStateService) {}

  async onModuleInit(): Promise<void> {
    const state = await this.moduleState.loadState<PackagingState>(this.stateKey, { packaging: [] });
    this.packaging = Array.isArray(state.packaging) ? state.packaging : [];
  }

  create(dto: CreatePackagingDto): PackagingRecord {
    const record: PackagingRecord = {
      id: uuid(),
      variantId: dto.variantId,
      name: dto.name.trim(),
      unitsPerPack: dto.unitsPerPack,
      barcode: dto.barcode?.trim() || undefined,
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

  update(id: string, dto: UpdatePackagingDto): PackagingRecord {
    const record = this.findOne(id);
    Object.assign(record, {
      name: dto.name?.trim() ?? record.name,
      unitsPerPack: dto.unitsPerPack ?? record.unitsPerPack,
      barcode: dto.barcode?.trim() ?? record.barcode,
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

  ensureDefaultPackaging(variant: VariantRecord): PackagingRecord {
    const existing = this.listByVariant(variant.id).find(
      (item) => item.unitsPerPack === 1 && item.isActive,
    );
    if (existing) {
      return existing;
    }
    const created: PackagingRecord = {
      id: uuid(),
      variantId: variant.id,
      name: 'Unidad',
      unitsPerPack: 1,
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

  private findOne(id: string): PackagingRecord {
    const record = this.packaging.find((item) => item.id === id);
    if (!record) {
      throw new NotFoundException('Packaging not found');
    }
    return record;
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

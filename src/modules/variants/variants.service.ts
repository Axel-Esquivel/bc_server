import { Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { ModuleStateService } from '../../core/database/module-state.service';
import { CreateVariantDto } from './dto/create-variant.dto';
import { UpdateVariantDto } from './dto/update-variant.dto';
import { ProductVariant } from './entities/product-variant.entity';

export interface VariantRecord extends ProductVariant {
  id: string;
}

interface VariantsState {
  variants: VariantRecord[];
}

@Injectable()
export class VariantsService implements OnModuleInit {
  private readonly logger = new Logger(VariantsService.name);
  private readonly stateKey = 'module:variants';
  private variants: VariantRecord[] = [];

  constructor(private readonly moduleState: ModuleStateService) {}

  async onModuleInit(): Promise<void> {
    const state = await this.moduleState.loadState<VariantsState>(this.stateKey, { variants: [] });
    this.variants = state.variants ?? [];
  }

  create(dto: CreateVariantDto): VariantRecord {
    const variant: VariantRecord = {
      id: uuid(),
      productId: dto.productId,
      name: dto.name,
      sku: dto.sku ?? `SKU-${uuid().split('-')[0].toUpperCase()}`,
      barcodes: dto.barcodes?.length ? dto.barcodes : [],
      baseUomId: dto.baseUomId,
      sellable: dto.sellable ?? true,
      OrganizationId: dto.OrganizationId,
      companyId: dto.companyId,
    };

    this.variants.push(variant);
    this.persistState();
    return variant;
  }

  findAll(): VariantRecord[] {
    return [...this.variants];
  }

  findOne(id: string): VariantRecord {
    const variant = this.variants.find((item) => item.id === id);
    if (!variant) {
      throw new NotFoundException('Variant not found');
    }
    this.persistState();
    return variant;
  }

  update(id: string, dto: UpdateVariantDto): VariantRecord {
    const variant = this.findOne(id);
    Object.assign(variant, {
      productId: dto.productId ?? variant.productId,
      name: dto.name ?? variant.name,
      sku: dto.sku ?? variant.sku,
      barcodes: dto.barcodes ?? variant.barcodes,
      baseUomId: dto.baseUomId ?? variant.baseUomId,
      sellable: dto.sellable ?? variant.sellable,
      OrganizationId: dto.OrganizationId ?? variant.OrganizationId,
      companyId: dto.companyId ?? variant.companyId,
    });
    return variant;
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
}

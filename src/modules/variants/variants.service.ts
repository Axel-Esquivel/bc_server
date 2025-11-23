import { Injectable, NotFoundException } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { CreateVariantDto } from './dto/create-variant.dto';
import { UpdateVariantDto } from './dto/update-variant.dto';
import { ProductVariant } from './entities/product-variant.entity';

export interface VariantRecord extends ProductVariant {
  id: string;
}

@Injectable()
export class VariantsService {
  private readonly variants: VariantRecord[] = [];

  create(dto: CreateVariantDto): VariantRecord {
    const variant: VariantRecord = {
      id: uuid(),
      productId: dto.productId,
      name: dto.name,
      sku: dto.sku ?? `SKU-${uuid().split('-')[0].toUpperCase()}`,
      barcodes: dto.barcodes?.length ? dto.barcodes : [],
      baseUomId: dto.baseUomId,
      sellable: dto.sellable ?? true,
      workspaceId: dto.workspaceId,
      companyId: dto.companyId,
    };

    this.variants.push(variant);
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
      workspaceId: dto.workspaceId ?? variant.workspaceId,
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
  }
}

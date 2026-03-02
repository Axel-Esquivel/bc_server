import { Type } from 'class-transformer';
import { ArrayNotEmpty, IsArray, IsEnum, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { PurchaseOrderStatus } from '../entities/purchase-order.entity';
import { PurchaseOrderLineDiscountType } from '../entities/purchase-order-line.entity';

export class PurchaseOrderLineDto {
  @IsString()
  variantId!: string;

  @IsString()
  packagingId!: string;

  @IsNumber()
  @Min(1)
  packagingMultiplier!: number;

  @IsOptional()
  @IsString()
  packagingNameId?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  packagingMultiplierSnapshot?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  quantity?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  qty?: number;

  @IsNumber()
  @Min(0)
  unitCost!: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  freightCost?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  extraCosts?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  bonusQty?: number;

  @IsOptional()
  @IsEnum(PurchaseOrderLineDiscountType)
  discountType?: PurchaseOrderLineDiscountType;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discountValue?: number;

  @IsOptional()
  @IsString()
  suggestionId?: string;
}

export class CreatePurchaseOrderDto {
  @IsString()
  OrganizationId!: string;

  @IsString()
  companyId!: string;

  @IsString()
  supplierId!: string;

  @IsOptional()
  @IsString()
  warehouseId?: string;

  @IsOptional()
  @IsString()
  orderDate?: string;

  @IsOptional()
  @IsString()
  expectedDeliveryDate?: string;

  @IsOptional()
  @IsString()
  receivedAt?: string;

  @IsOptional()
  @IsEnum(PurchaseOrderStatus)
  status?: PurchaseOrderStatus;

  @IsOptional()
  @IsString()
  currencyId?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  globalFreight?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  globalExtraCosts?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => PurchaseOrderLineDto)
  lines!: PurchaseOrderLineDto[];

  @IsOptional()
  @IsArray()
  rejectedSuggestionIds?: string[];
}

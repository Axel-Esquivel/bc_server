import { Type } from 'class-transformer';
import { ArrayNotEmpty, IsArray, IsBoolean, IsEnum, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';

export enum GoodsReceiptDiscountType {
  PERCENT = 'percent',
  AMOUNT = 'amount',
  PERCENT_UPPER = 'PERCENT',
  AMOUNT_UPPER = 'AMOUNT',
}

export class GoodsReceiptLineDto {
  @IsString()
  variantId!: string;

  @IsOptional()
  @IsString()
  productId?: string;

  @IsNumber()
  @Min(0)
  quantity!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  quantityReceived?: number;

  @IsNumber()
  @Min(0)
  unitCost!: number;

  @IsOptional()
  @IsString()
  locationId?: string;

  @IsOptional()
  @IsString()
  batchId?: string;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  bonusQty?: number;

  @IsOptional()
  @IsString()
  bonusVariantId?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  bonusVariantQty?: number;

  @IsOptional()
  @IsEnum(GoodsReceiptDiscountType)
  discountType?: GoodsReceiptDiscountType;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discountValue?: number;

  @IsOptional()
  @IsBoolean()
  isBonus?: boolean;

  @IsOptional()
  @IsString()
  bonusSourceLineId?: string;

  @IsOptional()
  @IsString()
  suggestionId?: string;
}

export class CreateGoodsReceiptDto {
  @IsString()
  OrganizationId!: string;

  @IsString()
  companyId!: string;

  @IsOptional()
  @IsString()
  purchaseOrderId?: string;

  @IsString()
  warehouseId!: string;

  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => GoodsReceiptLineDto)
  lines!: GoodsReceiptLineDto[];
}

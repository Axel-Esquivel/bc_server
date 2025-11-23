import { Type } from 'class-transformer';
import { ArrayNotEmpty, IsArray, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';

export class GoodsReceiptLineDto {
  @IsString()
  variantId!: string;

  @IsNumber()
  quantity!: number;

  @IsNumber()
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
  @IsString()
  suggestionId?: string;
}

export class CreateGoodsReceiptDto {
  @IsString()
  workspaceId!: string;

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

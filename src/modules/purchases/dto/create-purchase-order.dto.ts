import { Type } from 'class-transformer';
import { ArrayNotEmpty, IsArray, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';

export class PurchaseOrderLineDto {
  @IsString()
  variantId!: string;

  @IsNumber()
  quantity!: number;

  @IsNumber()
  unitCost!: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  suggestionId?: string;
}

export class CreatePurchaseOrderDto {
  @IsString()
  workspaceId!: string;

  @IsString()
  companyId!: string;

  @IsString()
  supplierId!: string;

  @IsString()
  warehouseId!: string;

  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => PurchaseOrderLineDto)
  lines!: PurchaseOrderLineDto[];

  @IsOptional()
  @IsArray()
  rejectedSuggestionIds?: string[];
}

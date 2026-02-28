import { Type } from 'class-transformer';
import { ArrayNotEmpty, IsArray, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';

export class PurchaseOrderLineDto {
  @IsString()
  variantId!: string;

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

  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => PurchaseOrderLineDto)
  lines!: PurchaseOrderLineDto[];

  @IsOptional()
  @IsArray()
  rejectedSuggestionIds?: string[];
}

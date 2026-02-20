import { IsArray, IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { IsNumber, Min } from 'class-validator';

export class CreateVariantDto {
  @IsString()
  @IsNotEmpty()
  productId!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  sku?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  barcodes?: string[];

  @IsOptional()
  @IsString()
  internalBarcode?: string;

  @IsOptional()
  @IsBoolean()
  generateInternalBarcode?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minStock?: number;

  @IsString()
  @IsNotEmpty()
  uomId!: string;

  @IsOptional()
  @IsString()
  uomCategoryId?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  quantity?: number;

  @IsOptional()
  @IsBoolean()
  sellable?: boolean;

  @IsString()
  @IsNotEmpty()
  OrganizationId!: string;

  @IsString()
  @IsNotEmpty()
  companyId!: string;

  @IsString()
  @IsNotEmpty()
  enterpriseId!: string;
}

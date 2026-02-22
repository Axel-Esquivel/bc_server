import { IsArray, IsBoolean, IsNotEmpty, IsNumber, IsNumberString, IsOptional, IsString, Min } from 'class-validator';

export class UpdateVariantDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  productId?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsNumberString()
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

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  uomId?: string;

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

  @IsOptional()
  @IsString()
  OrganizationId?: string;

  @IsOptional()
  @IsString()
  companyId?: string;

  @IsOptional()
  @IsString()
  enterpriseId?: string;
}


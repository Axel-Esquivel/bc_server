import { IsArray, IsBoolean, IsNotEmpty, IsNumberString, IsOptional, IsString } from 'class-validator';
import { IsNumber, Min } from 'class-validator';

export class CreateProductVariantDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

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
}


import { IsArray, IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { IsNumber, Min } from 'class-validator';

export class CreateProductVariantDto {
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

  @IsNumber()
  @Min(0)
  price!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minStock?: number;

  @IsString()
  @IsNotEmpty()
  uomId!: string;

  @IsOptional()
  @IsBoolean()
  sellable?: boolean;
}

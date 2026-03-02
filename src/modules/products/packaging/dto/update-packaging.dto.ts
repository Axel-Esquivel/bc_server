import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UpdatePackagingDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  packagingNameId?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  multiplierSnapshot?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  unitsPerPack?: number;

  @IsOptional()
  @IsString()
  barcode?: string;

  @IsOptional()
  @IsString()
  internalBarcode?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

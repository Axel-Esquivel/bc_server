<<<<<<< ours
<<<<<<< ours
import { PartialType } from '@nestjs/mapped-types';
import { CreateVariantDto } from './create-variant.dto';

export class UpdateVariantDto extends PartialType(CreateVariantDto) {}
=======
=======
>>>>>>> theirs
import { IsArray, IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

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
  @IsString()
  sku?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  barcodes?: string[];

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  baseUomId?: string;

  @IsOptional()
  @IsBoolean()
  sellable?: boolean;

  @IsOptional()
  @IsString()
  workspaceId?: string;

  @IsOptional()
  @IsString()
  companyId?: string;
}
<<<<<<< ours
>>>>>>> theirs
=======
>>>>>>> theirs

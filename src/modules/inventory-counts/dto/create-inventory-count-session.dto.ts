import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, ValidateNested } from 'class-validator';
import { InventoryCountMode, InventoryCountScope } from '../entities/inventory-count-session.entity';

export class InventoryCountLineInputDto {
  @IsString()
  @IsNotEmpty()
  variantId!: string;

  @IsString()
  @IsNotEmpty()
  warehouseId!: string;

  @IsOptional()
  @IsString()
  locationId?: string;

  @IsOptional()
  @IsString()
  batchId?: string;
}

export class CreateInventoryCountSessionDto {
  @IsString()
  @IsNotEmpty()
  OrganizationId!: string;

  @IsString()
  @IsNotEmpty()
  companyId!: string;

  @IsString()
  @IsNotEmpty()
  warehouseId!: string;

  @IsEnum(InventoryCountScope)
  scope!: InventoryCountScope;

  @IsEnum(InventoryCountMode)
  mode!: InventoryCountMode;

  @IsNumber()
  @IsPositive()
  roundsPlanned!: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InventoryCountLineInputDto)
  lines!: InventoryCountLineInputDto[];
}

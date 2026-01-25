import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsEnum, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
import { WarehouseType } from '../../warehouses/entities/warehouse.entity';

class BootstrapBranchDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsOptional()
  tempKey?: string;

  @IsString()
  @IsOptional()
  countryId?: string;

  @IsString()
  @IsOptional()
  type?: 'retail' | 'wholesale';

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  currencyIds?: string[];
}

class BootstrapWarehouseDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsOptional()
  branchId?: string;

  @IsString()
  @IsOptional()
  branchTempKey?: string;

  @IsEnum(WarehouseType)
  @IsOptional()
  type?: WarehouseType;
}

class BootstrapCompanyDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  countryId!: string;

  @IsString()
  @IsOptional()
  baseCurrencyId?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  currencyIds?: string[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BootstrapBranchDto)
  @IsOptional()
  branches?: BootstrapBranchDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BootstrapWarehouseDto)
  @IsOptional()
  warehouses?: BootstrapWarehouseDto[];
}

export class BootstrapOrganizationDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  currencyIds!: string[];

  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  countryIds!: string[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BootstrapCompanyDto)
  @IsOptional()
  companies?: BootstrapCompanyDto[];
}

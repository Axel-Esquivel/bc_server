import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { WarehouseType } from '../entities/warehouse.entity';

export class UpdateWarehouseDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  code?: string;

  @IsString()
  @IsOptional()
  organizationId?: string;

  @IsString()
  @IsOptional()
  OrganizationId?: string;

  @IsString()
  @IsOptional()
  enterpriseId?: string;

  @IsBoolean()
  @IsOptional()
  active?: boolean;

  @IsEnum(WarehouseType)
  @IsOptional()
  type?: WarehouseType;

  @IsBoolean()
  @IsOptional()
  allowNegativeStock?: boolean;

  @IsBoolean()
  @IsOptional()
  allowCountingLock?: boolean;

  @IsString()
  @IsOptional()
  companyId?: string;

  @IsString()
  @IsOptional()
  branchId?: string;
}

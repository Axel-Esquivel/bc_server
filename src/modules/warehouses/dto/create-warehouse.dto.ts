import { IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { WarehouseType } from '../entities/warehouse.entity';

export class CreateWarehouseDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  code!: string;

  @IsEnum(WarehouseType)
  type!: WarehouseType;

  @IsBoolean()
  @IsOptional()
  allowNegativeStock?: boolean;

  @IsBoolean()
  @IsOptional()
  allowCountingLock?: boolean;

  @IsString()
  @IsNotEmpty()
  OrganizationId!: string;

  @IsString()
  @IsNotEmpty()
  companyId!: string;

  @IsString()
  @IsOptional()
  branchId?: string;
}

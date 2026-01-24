import { IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { WarehouseType } from '../entities/warehouse.entity';

export class CreateCompanyWarehouseDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  branchId!: string;

  @IsString()
  @IsOptional()
  code?: string;

  @IsEnum(WarehouseType)
  @IsOptional()
  type?: WarehouseType;

  @IsBoolean()
  @IsOptional()
  allowNegativeStock?: boolean;

  @IsBoolean()
  @IsOptional()
  allowCountingLock?: boolean;
}

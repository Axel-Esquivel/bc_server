import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { SupplierCatalogBonusType, SupplierCatalogStatus } from '../entities/supplier-catalog-item.entity';

export class CreateSupplierCatalogItemDto {
  @IsString()
  @IsNotEmpty()
  OrganizationId!: string;

  @IsString()
  @IsNotEmpty()
  companyId!: string;

  @IsString()
  @IsNotEmpty()
  supplierId!: string;

  @IsString()
  @IsNotEmpty()
  variantId!: string;

  @IsNumber()
  @Min(0)
  unitCost!: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  freightCost?: number;

  @IsOptional()
  @IsEnum(SupplierCatalogBonusType)
  bonusType?: SupplierCatalogBonusType;

  @IsOptional()
  @IsNumber()
  @Min(0)
  bonusValue?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minQty?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  leadTimeDays?: number;

  @IsOptional()
  @IsDateString()
  validFrom?: string;

  @IsOptional()
  @IsDateString()
  validTo?: string;

  @IsOptional()
  @IsEnum(SupplierCatalogStatus)
  status?: SupplierCatalogStatus;
}

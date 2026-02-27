import { IsEnum, IsOptional, IsString } from 'class-validator';
import { SupplierCatalogStatus } from '../entities/supplier-catalog-item.entity';

export class ListSupplierCatalogQueryDto {
  @IsOptional()
  @IsString()
  OrganizationId?: string;

  @IsOptional()
  @IsString()
  companyId?: string;

  @IsOptional()
  @IsString()
  supplierId?: string;

  @IsOptional()
  @IsEnum(SupplierCatalogStatus)
  status?: SupplierCatalogStatus;

  @IsOptional()
  @IsString()
  q?: string;
}

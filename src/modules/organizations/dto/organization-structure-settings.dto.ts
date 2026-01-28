import { Type } from 'class-transformer';
import { IsArray, IsOptional, IsString, ValidateNested } from 'class-validator';

import {
  OrganizationBranchSettings,
  OrganizationCompanySettings,
  OrganizationStructureSettingsUpdate,
  OrganizationWarehouseSettings,
} from '../../../core/types/organization-structure-settings.types';

export class OrganizationCompanySettingsDto implements OrganizationCompanySettings {
  @IsString()
  id!: string;

  @IsString()
  name!: string;
}

export class OrganizationBranchSettingsDto implements OrganizationBranchSettings {
  @IsString()
  id!: string;

  @IsString()
  companyId!: string;

  @IsString()
  name!: string;
}

export class OrganizationWarehouseSettingsDto implements OrganizationWarehouseSettings {
  @IsString()
  id!: string;

  @IsString()
  branchId!: string;

  @IsString()
  name!: string;

  @IsString()
  @IsOptional()
  type?: string;
}

export class OrganizationStructureSettingsDto implements OrganizationStructureSettingsUpdate {
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => OrganizationCompanySettingsDto)
  companies?: OrganizationCompanySettingsDto[];

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => OrganizationBranchSettingsDto)
  branches?: OrganizationBranchSettingsDto[];

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => OrganizationWarehouseSettingsDto)
  warehouses?: OrganizationWarehouseSettingsDto[];
}

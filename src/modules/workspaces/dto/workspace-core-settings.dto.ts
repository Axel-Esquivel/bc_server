import { Type } from 'class-transformer';
import { IsArray, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';

export class WorkspaceCurrencyDto {
  @IsString()
  id!: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  code?: string;
}

export class WorkspaceCompanyDto {
  @IsString()
  id!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;
}

export class WorkspaceBranchDto {
  @IsString()
  id!: string;

  @IsString()
  companyId!: string;

  @IsString()
  @IsOptional()
  name?: string;
}

export class WorkspaceWarehouseDto {
  @IsString()
  id!: string;

  @IsString()
  branchId!: string;

  @IsString()
  @IsOptional()
  name?: string;
}

export class WorkspaceCoreSettingsDto {
  @IsString()
  @IsOptional()
  countryId?: string;

  @IsString()
  @IsOptional()
  baseCurrencyId?: string;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => WorkspaceCurrencyDto)
  currencies?: WorkspaceCurrencyDto[];

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => WorkspaceCompanyDto)
  companies?: WorkspaceCompanyDto[];

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => WorkspaceBranchDto)
  branches?: WorkspaceBranchDto[];

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => WorkspaceWarehouseDto)
  warehouses?: WorkspaceWarehouseDto[];
}

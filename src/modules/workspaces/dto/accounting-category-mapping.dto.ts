import { IsOptional, IsString } from 'class-validator';

export interface AccountingCategoryMapping {
  id: string;
  categoryId: string;
  salesIncomeAccountId?: string;
  cogsAccountId?: string;
  inventoryAccountId?: string;
}

export class CreateAccountingCategoryMappingDto {
  @IsString()
  categoryId!: string;

  @IsString()
  @IsOptional()
  salesIncomeAccountId?: string;

  @IsString()
  @IsOptional()
  cogsAccountId?: string;

  @IsString()
  @IsOptional()
  inventoryAccountId?: string;
}

export class UpdateAccountingCategoryMappingDto {
  @IsString()
  @IsOptional()
  categoryId?: string;

  @IsString()
  @IsOptional()
  salesIncomeAccountId?: string;

  @IsString()
  @IsOptional()
  cogsAccountId?: string;

  @IsString()
  @IsOptional()
  inventoryAccountId?: string;
}

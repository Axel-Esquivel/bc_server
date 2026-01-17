import { IsOptional, IsString } from 'class-validator';

export interface AccountingDefaults {
  salesIncomeAccountId?: string;
  salesDiscountAccountId?: string;
  inventoryAccountId?: string;
  cogsAccountId?: string;
  purchasesAccountId?: string;
  taxPayableAccountId?: string;
  taxReceivableAccountId?: string;
}

export class UpdateAccountingDefaultsDto {
  @IsString()
  @IsOptional()
  salesIncomeAccountId?: string;

  @IsString()
  @IsOptional()
  salesDiscountAccountId?: string;

  @IsString()
  @IsOptional()
  inventoryAccountId?: string;

  @IsString()
  @IsOptional()
  cogsAccountId?: string;

  @IsString()
  @IsOptional()
  purchasesAccountId?: string;

  @IsString()
  @IsOptional()
  taxPayableAccountId?: string;

  @IsString()
  @IsOptional()
  taxReceivableAccountId?: string;
}

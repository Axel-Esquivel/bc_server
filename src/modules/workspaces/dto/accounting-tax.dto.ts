import { IsBoolean, IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export type AccountingTaxType = 'sales' | 'purchase' | 'both';

export interface AccountingTax {
  id: string;
  name: string;
  rate: number;
  type: AccountingTaxType;
  accountId?: string;
  isActive: boolean;
}

export class CreateAccountingTaxDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  rate!: number;

  @IsIn(['sales', 'purchase', 'both'])
  type!: AccountingTaxType;

  @IsString()
  @IsOptional()
  accountId?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateAccountingTaxDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  rate?: number;

  @IsIn(['sales', 'purchase', 'both'])
  @IsOptional()
  type?: AccountingTaxType;

  @IsString()
  @IsOptional()
  accountId?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

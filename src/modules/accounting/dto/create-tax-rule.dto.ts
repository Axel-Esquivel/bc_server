import { IsBoolean, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { TaxRegime } from '../entities/tax-rule.entity';

export class CreateTaxRuleDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsNumber()
  rate!: number;

  @IsEnum(TaxRegime)
  regime!: TaxRegime;

  @IsOptional()
  @IsBoolean()
  active?: boolean = true;

  @IsString()
  workspaceId!: string;

  @IsString()
  companyId!: string;
}

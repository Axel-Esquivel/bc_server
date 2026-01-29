import { IsArray, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CompanyEnterpriseDto } from './company-enterprise.dto';

export class CreateCompanyDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsOptional()
  legalName?: string;

  @IsString()
  @IsOptional()
  taxId?: string;

  @IsString()
  @IsNotEmpty()
  baseCountryId!: string;

  @IsString()
  @IsNotEmpty()
  baseCurrencyId!: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  currencies?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  operatingCountryIds?: string[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CompanyEnterpriseDto)
  @IsOptional()
  enterprises?: CompanyEnterpriseDto[];

  @IsString()
  @IsOptional()
  defaultEnterpriseId?: string;

  @IsString()
  @IsOptional()
  defaultCurrencyId?: string;
}

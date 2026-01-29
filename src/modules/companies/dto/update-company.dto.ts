import { IsArray, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CompanyEnterpriseDto } from './company-enterprise.dto';

export class UpdateCompanyDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  legalName?: string;

  @IsString()
  @IsOptional()
  taxId?: string;

  @IsString()
  @IsOptional()
  baseCountryId?: string;

  @IsString()
  @IsOptional()
  baseCurrencyId?: string;

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

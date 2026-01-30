import { ArrayMinSize, IsArray, IsInt, IsNotEmpty, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CompanyEnterpriseDto } from './company-enterprise.dto';

export class CompanyUnitDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  allowedCurrencyIds!: string[];

  @IsString()
  @IsNotEmpty()
  baseCurrencyId!: string;
}

export class CompanyEnterprisesByCountryDto {
  @IsString()
  @IsNotEmpty()
  countryId!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CompanyUnitDto)
  enterprises!: CompanyUnitDto[];
}

export class CompanyDefaultEnterpriseKeyDto {
  @IsString()
  @IsNotEmpty()
  countryId!: string;

  @IsInt()
  @Min(0)
  enterpriseIndex!: number;
}

export class CreateCompanyDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsOptional()
  countryId?: string;

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
  @IsString({ each: true })
  @IsOptional()
  currencyIds?: string[];

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CompanyEnterprisesByCountryDto)
  @IsOptional()
  enterprisesByCountry?: CompanyEnterprisesByCountryDto[];

  @ValidateNested()
  @Type(() => CompanyDefaultEnterpriseKeyDto)
  @IsOptional()
  defaultEnterpriseKey?: CompanyDefaultEnterpriseKeyDto;

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

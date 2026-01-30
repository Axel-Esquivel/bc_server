import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

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

export class CreateCoreCompanyDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsOptional()
  countryId?: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  @IsOptional()
  operatingCountryIds?: string[];

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  @IsOptional()
  currencyIds?: string[];

  @IsString()
  @IsOptional()
  defaultCurrencyId?: string;

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
}

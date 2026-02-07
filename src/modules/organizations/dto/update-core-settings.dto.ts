import { Type } from 'class-transformer';
import { ArrayNotEmpty, IsArray, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
import type { OrganizationCoreSettingsUpdate } from '../types/core-settings.types';

export class CoreCountryUpdateDto {
  @IsString()
  @IsOptional()
  id?: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  code!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CoreCompanyConfigUpdateDto)
  @IsOptional()
  companies?: CoreCompanyConfigUpdateDto[];
}

export class CoreCurrencyUpdateDto {
  @IsString()
  @IsOptional()
  id?: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  code!: string;

  @IsString()
  @IsOptional()
  symbol?: string;
}

export class CoreEnterpriseUpdateDto {
  @IsString()
  @IsOptional()
  id?: string;

  @IsString()
  @IsNotEmpty()
  name!: string;
}

export class CoreCompanyConfigUpdateDto {
  @IsString()
  @IsOptional()
  id?: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsArray()
  @IsString({ each: true })
  @ArrayNotEmpty()
  @IsOptional()
  currencyIds?: string[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CoreEnterpriseUpdateDto)
  @IsOptional()
  enterprises?: CoreEnterpriseUpdateDto[];
}

export class UpdateCoreSettingsDto implements OrganizationCoreSettingsUpdate {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CoreCountryUpdateDto)
  @IsOptional()
  countries?: CoreCountryUpdateDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CoreCurrencyUpdateDto)
  @IsOptional()
  currencies?: CoreCurrencyUpdateDto[];
}

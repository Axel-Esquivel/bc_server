import { Type } from 'class-transformer';
import { IsArray, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
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

export class CoreCompanyUpdateDto {
  @IsString()
  @IsOptional()
  id?: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  countryId!: string;
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

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CoreCompanyUpdateDto)
  @IsOptional()
  companies?: CoreCompanyUpdateDto[];
}

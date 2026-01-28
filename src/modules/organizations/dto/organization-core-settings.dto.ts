import { IsArray, IsOptional, IsString } from 'class-validator';

import { OrganizationCoreSettingsUpdate } from '../../../core/types/organization-core-settings.types';

export class OrganizationCoreSettingsDto implements OrganizationCoreSettingsUpdate {
  @IsString()
  @IsOptional()
  countryId?: string;

  @IsString()
  @IsOptional()
  baseCurrencyId?: string;

  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  currencyIds?: string[];
}

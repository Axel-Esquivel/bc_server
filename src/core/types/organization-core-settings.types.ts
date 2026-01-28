export interface OrganizationCoreSettings {
  countryId?: string;
  baseCurrencyId?: string;
  currencyIds: string[];
}

export interface OrganizationCoreSettingsUpdate {
  countryId?: string;
  baseCurrencyId?: string;
  currencyIds?: string[];
}

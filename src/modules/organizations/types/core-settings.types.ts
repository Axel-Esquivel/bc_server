export interface CoreCountry {
  id: string;
  name: string;
  code: string;
  companies?: CoreCompanyConfig[];
}

export interface CoreCurrency {
  id: string;
  name: string;
  code: string;
  symbol?: string;
}

export interface CoreCompanyConfig {
  id: string;
  name: string;
  currencyIds: string[];
  enterprises: CoreEnterprise[];
}

export interface CoreCountryInput {
  id?: string;
  name: string;
  code: string;
  companies?: CoreCompanyConfigInput[];
}

export interface CoreCurrencyInput {
  id?: string;
  name: string;
  code: string;
  symbol?: string;
}

export interface CoreCompanyConfigInput {
  id?: string;
  name: string;
  currencyIds?: string[];
  enterprises?: CoreEnterpriseInput[];
}

export interface CoreCompanyInput {
  id?: string;
  name: string;
  countryId: string;
}

export interface CoreEnterprise {
  id: string;
  name: string;
  countryId?: string;
  allowedCurrencyIds?: string[];
  baseCurrencyId?: string;
}

export interface CoreEnterpriseInput {
  id?: string;
  name: string;
  countryId?: string;
  allowedCurrencyIds?: string[];
  baseCurrencyId?: string;
}

export interface CoreCompany {
  id: string;
  name: string;
  countryId: string;
}

export interface OrganizationCoreSettings {
  countries: CoreCountry[];
  currencies: CoreCurrency[];
}

export interface OrganizationCoreSettingsUpdate {
  countries?: CoreCountryInput[];
  currencies?: CoreCurrencyInput[];
}

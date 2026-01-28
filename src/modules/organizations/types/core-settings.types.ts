export interface CoreCountry {
  id: string;
  name: string;
  code: string;
}

export interface CoreCurrency {
  id: string;
  name: string;
  code: string;
  symbol?: string;
}

export interface CoreCompany {
  id: string;
  name: string;
  countryId: string;
}

export interface CoreCountryInput {
  id?: string;
  name: string;
  code: string;
}

export interface CoreCurrencyInput {
  id?: string;
  name: string;
  code: string;
  symbol?: string;
}

export interface CoreCompanyInput {
  id?: string;
  name: string;
  countryId: string;
}

export interface OrganizationCoreSettings {
  countries: CoreCountry[];
  currencies: CoreCurrency[];
  companies: CoreCompany[];
}

export interface OrganizationCoreSettingsUpdate {
  countries?: CoreCountryInput[];
  currencies?: CoreCurrencyInput[];
  companies?: CoreCompanyInput[];
}

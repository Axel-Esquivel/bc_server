export interface CompanyEnterprise {
  id: string;
  name: string;
  countryId: string;
  currencyIds: string[];
  defaultCurrencyId: string;
}

export interface CompanyEnterpriseInput {
  id?: string;
  name: string;
  countryId: string;
  currencyIds?: string[];
  defaultCurrencyId?: string;
}

export interface CompanyHierarchySettings {
  operatingCountryIds: string[];
  enterprises: CompanyEnterprise[];
  defaultEnterpriseId: string | null;
  defaultCurrencyId: string | null;
}

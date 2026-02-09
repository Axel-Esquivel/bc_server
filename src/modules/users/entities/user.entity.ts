export interface OrganizationMembership {
  OrganizationId: string;
  roles: string[];
}

export interface UserDefaults {
  organizationId?: string;
  companyId?: string;
  enterpriseId?: string;
  countryId?: string;
  currencyId?: string;
}

export interface UserDefaultContext {
  organizationId?: string;
  companyId?: string;
  enterpriseId?: string;
  countryId?: string;
  currencyId?: string;
}

export interface UserPreferences {
  defaultContext?: UserDefaultContext;
}

export interface UserEntity {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  passwordHash: string;
  Organizations: OrganizationMembership[];
  devices: string[];
  defaultOrganizationId?: string;
  defaultCompanyId?: string;
  defaultEnterpriseId?: string;
  defaultCurrencyId?: string;
  defaults?: UserDefaults;
  preferences?: UserPreferences;
  createdAt: Date;
}

export type SafeUser = Omit<UserEntity, 'passwordHash'>;

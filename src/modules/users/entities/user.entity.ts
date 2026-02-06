export interface OrganizationMembership {
  OrganizationId: string;
  roles: string[];
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
  createdAt: Date;
}

export type SafeUser = Omit<UserEntity, 'passwordHash'>;

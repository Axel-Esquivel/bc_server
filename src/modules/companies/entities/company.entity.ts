import type { CompanyEnterprise } from '../types/company-hierarchy.types';

export type CompanyMemberStatus = 'active' | 'invited' | 'disabled';

export interface CompanyMember {
  userId: string;
  roleKey: string;
  status: CompanyMemberStatus;
}

export interface CompanyRoleDefinition {
  key: string;
  name: string;
  permissions: string[];
}

export type CompanyModuleStatus = 'inactive' | 'enabled' | 'pendingConfig' | 'ready' | 'error';

export interface CompanyEntity {
  id: string;
  organizationId: string;
  name: string;
  legalName?: string;
  taxId?: string;
  baseCountryId: string;
  baseCurrencyId: string;
  currencies: string[];
  operatingCountryIds: string[];
  enterprises: CompanyEnterprise[];
  defaultEnterpriseId: string | null;
  defaultCurrencyId: string | null;
  members: CompanyMember[];
  roles: CompanyRoleDefinition[];
  moduleStates: Record<string, CompanyModuleStatus>;
  moduleSettings: Record<string, any>;
  createdAt: Date;
}

export interface OrganizationMembership {
  OrganizationId: string;
  roles: string[];
}

export type OrganizationMembershipStatus = 'active' | 'pending' | 'rejected';

export interface OrganizationMembership {
  organizationId: string;
  role: 'owner' | 'member';
  status: OrganizationMembershipStatus;
}

export interface UserEntity {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  passwordHash: string;
  Organizations: OrganizationMembership[];
  organizations: OrganizationMembership[];
  devices: string[];
  defaultOrganizationId?: string;
  defaultOrganizationId?: string;
  defaultCompanyId?: string;
  createdAt: Date;
}

export type SafeUser = Omit<UserEntity, 'passwordHash'>;

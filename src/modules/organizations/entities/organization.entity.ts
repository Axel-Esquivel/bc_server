export type OrganizationRole = string;

export interface OrganizationRoleDefinition {
  key: string;
  name: string;
  permissions: string[];
  system?: boolean;
}

export interface OrganizationMember {
  userId: string;
  roleKey: OrganizationRole;
  status: 'pending' | 'active';
  invitedBy?: string;
  requestedBy?: string;
  invitedAt?: Date;
  requestedAt?: Date;
  activatedAt?: Date;
}

export interface OrganizationEntity {
  id: string;
  name: string;
  code: string;
  ownerUserId: string;
  createdBy: string;
  members: OrganizationMember[];
  roles: OrganizationRoleDefinition[];
  moduleStates?: Record<string, 'inactive' | 'enabled' | 'pendingConfig' | 'configured' | 'ready' | 'error'>;
  moduleSettings?: Record<string, { configured?: boolean }>;
  createdAt: Date;
}

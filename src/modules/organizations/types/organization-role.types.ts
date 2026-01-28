export const OWNER_ROLE_KEY = 'owner' as const;

export type OrganizationRoleKey = string;

export interface OrganizationRole {
  key: string;
  name: string;
  permissions: string[];
  isSystem?: boolean;
}

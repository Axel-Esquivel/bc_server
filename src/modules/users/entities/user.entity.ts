export interface WorkspaceMembership {
  workspaceId: string;
  roles: string[];
}

export interface UserEntity {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  passwordHash: string;
  workspaces: WorkspaceMembership[];
  devices: string[];
  defaultWorkspaceId?: string;
  createdAt: Date;
}

export type SafeUser = Omit<UserEntity, 'passwordHash'>;

import { SetMetadata } from '@nestjs/common';

export const WORKSPACE_PERMISSION_KEY = 'workspace_permission';

export const WorkspacePermission = (permission: string) =>
  SetMetadata(WORKSPACE_PERMISSION_KEY, permission);
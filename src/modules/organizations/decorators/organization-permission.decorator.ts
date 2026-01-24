import { SetMetadata } from '@nestjs/common';

export const ORGANIZATION_PERMISSION_KEY = 'organizationPermission';

export const OrganizationPermission = (permission: string) =>
  SetMetadata(ORGANIZATION_PERMISSION_KEY, permission);

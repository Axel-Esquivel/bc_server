import { SetMetadata } from '@nestjs/common';

export const COMPANY_PERMISSION_KEY = 'company_permission';

export const CompanyPermission = (permission: string) =>
  SetMetadata(COMPANY_PERMISSION_KEY, permission);

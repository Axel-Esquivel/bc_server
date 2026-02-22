import { Request } from 'express';

export interface AuthenticatedRequest extends Request {
  user?: {
    sub?: string;
    id?: string;
    deviceId?: string;
    organizationId?: string | null;
    companyId?: string | null;
    enterpriseId?: string | null;
  };
  userId?: string;
}

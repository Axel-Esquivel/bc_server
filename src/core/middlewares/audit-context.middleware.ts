import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';

export interface AuditContext {
  userId?: string;
  OrganizationId?: string;
  deviceId?: string;
  requestId?: string;
  endpoint?: string;
  ip?: string;
}

export type AuditRequest = Request & {
  user?: any;
  auditContext?: AuditContext;
  OrganizationId?: string;
  deviceId?: string;
  requestId?: string;
};

@Injectable()
export class AuditContextMiddleware implements NestMiddleware {
  use(req: AuditRequest, _res: Response, next: NextFunction) {
    const forwarded = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim();
    const ip = forwarded || req.ip || (req.socket?.remoteAddress as string | undefined);
    const user = (req as AuditRequest).user;

    const context: AuditContext = {
      userId: user?.id || user?._id || (req.headers['x-user-id'] as string | undefined),
      OrganizationId:
        req.OrganizationId || (req as any).OrganizationId || (req.headers['x-Organization-id'] as string | undefined),
      deviceId: req.deviceId || (req as any).deviceId || (req.headers['x-device-id'] as string | undefined),
      requestId: req.requestId || (req as any).requestId || (req.headers['x-request-id'] as string | undefined),
      endpoint: `${req.method} ${req.originalUrl}`,
      ip,
    };

    req.auditContext = context;

    next();
  }
}

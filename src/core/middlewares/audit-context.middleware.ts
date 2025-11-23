import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response } from 'express';

<<<<<<< ours
@Injectable()
export class AuditContextMiddleware implements NestMiddleware {
  use(req: Request & { auditContext?: any }, _res: Response, next: () => void) {
    const forwarded = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim();
    const ip = forwarded || req.ip;

    req.auditContext = {
      userId: req.user?.id || req.user?._id || req.headers['x-user-id'],
      workspaceId: (req as any).workspaceId || req.headers['x-workspace-id'],
      deviceId: (req as any).deviceId || req.headers['x-device-id'],
      requestId: (req as any).requestId || req.headers['x-request-id'],
=======
interface AuditRequest extends Request {
  user?: any;
  auditContext?: any;
  workspaceId?: string;
  deviceId?: string;
  requestId?: string;
}

@Injectable()
export class AuditContextMiddleware implements NestMiddleware {
  use(req: AuditRequest, _res: Response, next: () => void) {
    const forwarded = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim();
    const ip = forwarded || req.ip;
    const user = req.user as any;

    req.auditContext = {
      userId: user?.id || user?._id || req.headers['x-user-id'],
      workspaceId: req.workspaceId || (req as any).workspaceId || req.headers['x-workspace-id'],
      deviceId: req.deviceId || (req as any).deviceId || req.headers['x-device-id'],
      requestId: req.requestId || (req as any).requestId || req.headers['x-request-id'],
>>>>>>> theirs
      endpoint: `${req.method} ${req.originalUrl}`,
      ip,
    };

    next();
  }
}

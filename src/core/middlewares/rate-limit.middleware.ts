import { HttpException, HttpStatus, Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Response } from 'express';
import { AuditContext, AuditRequest } from './audit-context.middleware';

interface RateLimitBucket {
  count: number;
  firstRequestAt: number;
}

@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  private readonly windowMs = 60 * 1000;
  private readonly limit = 120;
  private readonly buckets = new Map<string, RateLimitBucket>();
  // TODO: Replace in-memory buckets with Redis or Mongo backed storage to coordinate limits across instances.

  use(req: AuditRequest, _res: Response, next: NextFunction) {
    const context: AuditContext = req.auditContext || {};
    const key = [
      context.OrganizationId || 'anon',
      context.userId || 'guest',
      context.deviceId || (req.headers['x-device-id'] as string | undefined) || 'nodevice',
      context.ip || req.ip,
      req.method,
      req.baseUrl || req.originalUrl,
    ].join(':');
    const now = Date.now();
    const bucket = this.buckets.get(key);

    if (!bucket) {
      this.buckets.set(key, { count: 1, firstRequestAt: now });
      return next();
    }

    if (now - bucket.firstRequestAt > this.windowMs) {
      this.buckets.set(key, { count: 1, firstRequestAt: now });
      return next();
    }

    bucket.count += 1;
    if (bucket.count > this.limit) {
      throw new HttpException(
        {
          status: 'error',
          message: 'Rate limit exceeded. Please try again later.',
          result: null,
          error: { key },
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    next();
  }
}

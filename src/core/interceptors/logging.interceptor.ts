import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { RedactionUtil } from '../utils/redaction.util';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest();
    const response = httpContext.getResponse();
    const { method, originalUrl: url } = request;
    const startTime = Date.now();

    const logPayload = (statusCode?: number) => {
      const context = request.auditContext || {};
      const userId =
        context.userId ||
        request.userId ||
        request.user?.sub ||
        request.user?.id ||
        request.user?._id ||
        request.headers['x-user-id'];
      const OrganizationId =
        context.OrganizationId ||
        request.OrganizationId ||
        request.user?.OrganizationId ||
        request.headers['x-Organization-id'];
      const deviceId =
        context.deviceId ||
        request.deviceId ||
        request.user?.deviceId ||
        request.headers['x-device-id'];
      const durationMs = Date.now() - startTime;
      const requestId = request.requestId || context.requestId;
      const ip = context.ip || request.ip;
      const sanitized = RedactionUtil.redact({
        body: request.body,
        params: request.params,
        query: request.query,
      });
      const payloadSummary = RedactionUtil.stringifyPayload(sanitized);

      this.logger.log(
        `${method} ${url} ${statusCode ?? response.statusCode} | userId=${userId ?? 'anonymous'} OrganizationId=${OrganizationId ?? 'n/a'} deviceId=${deviceId ?? 'n/a'} ip=${ip ?? 'unknown'} durationMs=${durationMs} requestId=${requestId ?? 'n/a'} payload=${payloadSummary}`,
      );
    };

    return next.handle().pipe(
      tap({
        next: () => logPayload(),
        error: (error) => {
          const statusCode =
            error instanceof HttpException ? error.getStatus() : response.statusCode ?? 500;
          logPayload(statusCode);
          throw error;
        },
      }),
    );
  }
}

import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : 'Internal server error';

    const message =
      typeof exceptionResponse === 'string'
        ? exceptionResponse
        : (exceptionResponse as any)?.message || 'Unexpected error occurred';

    const errorPayload = {
      status: 'error',
      message,
      result: null,
      error: {
        name: exception instanceof Error ? exception.name : 'Error',
        message,
        details:
          typeof exceptionResponse === 'object' && exceptionResponse !== null
            ? exceptionResponse
            : undefined,
      },
    };

    const auditContext = request.auditContext || {};

    this.logger.error(
      `${request.method} ${request.url} -> ${status} | message=${message} requestId=${request.requestId ?? auditContext.requestId ?? 'n/a'} userId=${auditContext.userId ?? 'anonymous'} workspaceId=${auditContext.workspaceId ?? 'n/a'} deviceId=${auditContext.deviceId ?? 'n/a'} ip=${auditContext.ip ?? request.ip}`,
      exception instanceof Error ? exception.stack : undefined,
    );

    response.status(status).json(errorPayload);
  }
}

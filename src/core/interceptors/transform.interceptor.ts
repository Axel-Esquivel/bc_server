import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, map } from 'rxjs';

interface NormalizedResponse<T = any> {
  status: 'success' | 'error';
  message: string;
  result: T;
  error: any;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, NormalizedResponse<T>> {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<NormalizedResponse<T>> {
    return next.handle().pipe(
      map((data: any) => {
        if (data?.status && data.result !== undefined) {
          return data as NormalizedResponse<T>;
        }

        const hasMessage = typeof data === 'object' && data?.message;
        const responseData =
          hasMessage && 'result' in data
            ? data.result
            : data && hasMessage
              ? data
              : data;

        const message =
          typeof data === 'object' && data?.message
            ? data.message
            : 'Request processed successfully';

        return {
          status: 'success',
          message,
          result: responseData,
          error: null,
        } satisfies NormalizedResponse<T>;
      }),
    );
  }
}

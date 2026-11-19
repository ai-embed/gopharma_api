import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor
} from '@nestjs/common';
import { Observable, catchError, from, map, mergeMap, throwError } from 'rxjs';
import { AuthenticatedUser } from '../common/types/authenticated-user.type';
import { AuditService } from './audit.service';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<{
      method: string;
      originalUrl?: string;
      path?: string;
      ip?: string;
      headers: Record<string, string | undefined>;
      user?: AuthenticatedUser;
      params?: Record<string, unknown>;
      query?: Record<string, unknown>;
    }>();
    const response = context.switchToHttp().getResponse<{ statusCode: number }>();

    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
      return next.handle();
    }

    const basePayload = {
      actorUserId: request.user?.userId,
      actorRole: request.user?.role,
      method: request.method,
      path: request.originalUrl ?? request.path ?? '',
      ip: request.ip,
      userAgent: request.headers['user-agent'],
      requestId: request.headers['x-request-id'],
      metadata: {
        params: request.params,
        query: request.query
      }
    };

    return next.handle().pipe(
      mergeMap((data) =>
        from(
          this.auditService.record({
            ...basePayload,
            outcome: 'SUCCESS',
            statusCode: response.statusCode || 200
          })
        ).pipe(map(() => data))
      ),
      catchError((error: Error & { status?: number }) =>
        from(
          this.auditService.record({
            ...basePayload,
            outcome: 'ERROR',
            statusCode: error.status ?? 500,
            errorMessage: error.message
          })
        ).pipe(mergeMap(() => throwError(() => error)))
      )
    );
  }
}

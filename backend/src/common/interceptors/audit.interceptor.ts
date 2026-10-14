import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { PrismaService } from '../../prisma/prisma.service.js';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const method = request.method;
    const url = request.url;

    if (['GET', 'OPTIONS', 'HEAD'].includes(method)) {
      return next.handle();
    }

    const actionMap: Record<string, string> = {
      POST: 'CREATE',
      PATCH: 'UPDATE',
      PUT: 'UPDATE',
      DELETE: 'DELETE',
    };

    return next.handle().pipe(
      tap(async (responseData: any) => {
        try {
          const urlParts = url.replace('/api/', '').split('/');
          const entityType = urlParts[0] || 'unknown';
          const entityId = urlParts[1] || responseData?.id || null;

          await this.prisma.auditLog.create({
            data: {
              userId: user?.sub || 'system',
              action: actionMap[method] || method,
              entityType,
              entityId: entityId ? String(entityId) : null,
              details: JSON.stringify({ method, url, body: request.body }),
              ipAddress: request.ip,
              userAgent: request.headers['user-agent'],
            },
          });
        } catch {
          // Don't fail the request if audit logging fails
        }
      }),
    );
  }
}

import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();
    const url = req?.url || '';
    const method = req?.method?.toUpperCase() || 'GET';

    // 1. Support ?token= query parameter for direct browser asset requests (e.g. iframes / img tags)
    const tokenQuery = req?.query?.token;
    if (tokenQuery && !req.headers?.authorization) {
      req.headers.authorization = `Bearer ${tokenQuery}`;
    }

    // 2. Identify strictly read-only GET public endpoints
    const isPublicGet =
      method === 'GET' &&
      (url.includes('/convert-docx-to-pdf') ||
        url.includes('/upload-cloud-pdf') ||
        url.includes('/expected-cloud-url') ||
        url.includes('/open-in-word') ||
        (url.includes('/documents/') && (url.includes('/file') || url.includes('/download'))));

    // If it's a public GET and NO token is provided, allow access without authentication
    if (isPublicGet && !req.headers?.authorization) {
      return true;
    }

    // For all mutations (PUT, POST, PATCH, DELETE) or requests with an Authorization header:
    // ALWAYS run Passport JWT authentication so that req.user is properly populated!
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();
    const url = req?.url || '';
    const method = req?.method?.toUpperCase() || 'GET';
    const isPublicGet =
      method === 'GET' &&
      (url.includes('/convert-docx-to-pdf') ||
        url.includes('/upload-cloud-pdf') ||
        url.includes('/expected-cloud-url') ||
        url.includes('/open-in-word') ||
        (url.includes('/documents/') && (url.includes('/file') || url.includes('/download'))));

    if (isPublicGet && (err || !user)) {
      return null;
    }

    return super.handleRequest(err, user, info, context);
  }
}


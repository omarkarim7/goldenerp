import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();
    const url = req?.url || '';
    if (
      url.includes('/convert-docx-to-pdf') ||
      url.includes('/upload-cloud-pdf') ||
      url.includes('/open-in-word') ||
      (url.includes('/documents/') && (url.includes('/file') || url.includes('/download')))
    ) {
      return true;
    }
    return super.canActivate(context);
  }
}


import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { existsSync, mkdirSync } from 'fs';
import { join, extname } from 'path';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class FileUploadService {
  private uploadDir: string;

  constructor(private config: ConfigService) {
    this.uploadDir = config.get<string>('UPLOAD_DIR', './uploads');
  }

  getUploadDir(subPath: string): string {
    const fullPath = join(this.uploadDir, subPath);
    if (!existsSync(fullPath)) {
      mkdirSync(fullPath, { recursive: true });
    }
    return fullPath;
  }

  generateFileName(originalName: string): string {
    const ext = extname(originalName);
    return `${uuidv4()}${ext}`;
  }

  getFilePath(module: string, entityId: string, fileName: string): string {
    return join(module, entityId, fileName).replace(/\\/g, '/');
  }

  getMaxFileSize(): number {
    return this.config.get<number>('MAX_FILE_SIZE', 10485760); // 10MB
  }

  getAllowedMimeTypes(): string[] {
    return [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ];
  }
}

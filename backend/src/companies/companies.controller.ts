import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  Req,
  Res,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as path from 'path';
import * as os from 'os';
import { extname } from 'path';
import { existsSync, mkdirSync, createReadStream, writeFileSync, unlinkSync } from 'fs';
import type { Response } from 'express';
import { CompaniesService } from './companies.service.js';
import { CreateCompanyDto } from './dto/create-company.dto.js';
import { UpdateCompanyDto } from './dto/update-company.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { UserRole } from '@prisma/client';

const getSafeCompanyUploadDir = (): string => {
  const isServerless =
    Boolean(process.env.VERCEL) ||
    Boolean(process.env.VERCEL_ENV) ||
    Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME) ||
    Boolean(process.env.LAMBDA_TASK_ROOT);

  if (isServerless) {
    const tmpDir = path.join(os.tmpdir(), 'goldenerp-uploads', 'companies');
    if (!existsSync(tmpDir)) {
      try { mkdirSync(tmpDir, { recursive: true }); } catch {}
    }
    return tmpDir;
  }
  const localDir = path.resolve(process.cwd(), 'uploads', 'companies');
  try {
    if (!existsSync(localDir)) {
      mkdirSync(localDir, { recursive: true });
    }
    const testFile = path.join(localDir, `.write_test_${Date.now()}`);
    writeFileSync(testFile, 'ok');
    unlinkSync(testFile);
    return localDir;
  } catch {
    const tmpDir = path.join(os.tmpdir(), 'goldenerp-uploads', 'companies');
    if (!existsSync(tmpDir)) {
      try { mkdirSync(tmpDir, { recursive: true }); } catch {}
    }
    return tmpDir;
  }
};

const companyStorage = diskStorage({
  destination: (req, file, cb) => {
    try {
      const uploadPath = getSafeCompanyUploadDir();
      cb(null, uploadPath);
    } catch (err: any) {
      cb(err, os.tmpdir());
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = extname(file.originalname);
    cb(null, `comp-doc-${uniqueSuffix}${ext}`);
  },
});

@Controller('companies')
@UseGuards(JwtAuthGuard)
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Get()
  findAll() {
    return this.companiesService.findAll();
  }

  @Get('overview')
  getOverview(@Req() req: any) {
    return this.companiesService.getOverview(req.user);
  }

  @Get(':code/next-display-code')
  async getNextDisplayCode(
    @Param('code') code: string,
    @Query('tenderType') tenderType?: string,
  ) {
    const displayCode = await this.companiesService.generateDisplayCode(code, tenderType);
    return { displayCode };
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.companiesService.findOne(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.GENERAL_MANAGER)
  create(@Body() dto: CreateCompanyDto) {
    return this.companiesService.create(dto);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.GENERAL_MANAGER)
  update(@Param('id') id: string, @Body() dto: UpdateCompanyDto) {
    return this.companiesService.update(id, dto);
  }

  // -------------------------------------------------------------
  // مستندات الشركة وإدارتها (خاص بالمدير العام)
  // -------------------------------------------------------------

  @Get(':id/documents')
  getDocuments(@Param('id') id: string) {
    return this.companiesService.getDocuments(id);
  }

  @Post(':id/documents')
  @UseGuards(RolesGuard)
  @Roles(UserRole.GENERAL_MANAGER, UserRole.DEPUTY_MANAGER, UserRole.EMPLOYEE)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: companyStorage,
      limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
    }),
  )
  async uploadDocument(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('title') title: string,
    @Body('type') type: string,
    @Body('notes') notes: string,
    @Req() req: any,
  ) {
    if (!file) {
      throw new BadRequestException('يرجى اختيار ملف لرفعه');
    }

    const cleanTitle = title?.trim() || file.originalname;
    return this.companiesService.uploadDocument(
      id,
      file,
      cleanTitle,
      type,
      req.user?.username || req.user?.fullName || 'المدير العام',
      notes,
    );
  }

  @Patch(':id/documents/:docId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.GENERAL_MANAGER, UserRole.DEPUTY_MANAGER, UserRole.EMPLOYEE)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: companyStorage,
      limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
    }),
  )
  async updateDocument(
    @Param('id') id: string,
    @Param('docId') docId: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body('title') title?: string,
    @Body('type') type?: string,
    @Body('notes') notes?: string,
  ) {
    return this.companiesService.updateDocument(id, docId, title, type, file, notes);
  }

  @Delete(':id/documents/:docId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.GENERAL_MANAGER, UserRole.DEPUTY_MANAGER, UserRole.EMPLOYEE)
  async deleteDocument(
    @Param('id') id: string,
    @Param('docId') docId: string,
  ) {
    return this.companiesService.deleteDocument(id, docId);
  }

  @Get(':id/documents/:docId/file')
  async viewDocument(
    @Param('id') id: string,
    @Param('docId') docId: string,
    @Res() res: Response,
  ) {
    const doc = await this.companiesService.getDocument(id, docId);
    const mimeMap: Record<string, string> = {
      pdf: 'application/pdf',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      doc: 'application/msword',
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      webp: 'image/webp',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      xls: 'application/vnd.ms-excel',
      txt: 'text/plain',
      html: 'text/html; charset=utf-8',
    };

    if (doc.filePath && doc.filePath.startsWith('data:')) {
      const commaIdx = doc.filePath.indexOf(',');
      if (commaIdx !== -1) {
        const header = doc.filePath.substring(0, commaIdx);
        const base64Data = doc.filePath.substring(commaIdx + 1);
        const mimeMatch = header.match(/data:([^;]+)/);
        const contentType = mimeMatch ? mimeMatch[1] : (mimeMap[doc.fileType.toLowerCase()] || 'application/octet-stream');
        const buffer = Buffer.from(base64Data, 'base64');
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(doc.fileName)}.${doc.fileType}"`);
        res.setHeader('Content-Length', buffer.length);
        return res.end(buffer);
      }
    }

    let resolvedPath = doc.filePath;
    if (!existsSync(resolvedPath)) {
      const tmpCandidate = path.join(os.tmpdir(), 'goldenerp-uploads', 'companies', path.basename(doc.filePath));
      if (existsSync(tmpCandidate)) resolvedPath = tmpCandidate;
    }

    if (!existsSync(resolvedPath)) {
      throw new NotFoundException('ملف المستند غير موجود على الخادم');
    }

    const contentType = mimeMap[doc.fileType.toLowerCase()] || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${encodeURIComponent(doc.fileName)}.${doc.fileType}"`,
    );
    createReadStream(resolvedPath).pipe(res);
  }

  @Get(':id/documents/:docId/download')
  async downloadDocument(
    @Param('id') id: string,
    @Param('docId') docId: string,
    @Res() res: Response,
  ) {
    const doc = await this.companiesService.getDocument(id, docId);
    const mimeMap: Record<string, string> = {
      pdf: 'application/pdf',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      doc: 'application/msword',
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      webp: 'image/webp',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      xls: 'application/vnd.ms-excel',
      txt: 'text/plain',
      html: 'text/html; charset=utf-8',
    };

    if (doc.filePath && doc.filePath.startsWith('data:')) {
      const commaIdx = doc.filePath.indexOf(',');
      if (commaIdx !== -1) {
        const header = doc.filePath.substring(0, commaIdx);
        const base64Data = doc.filePath.substring(commaIdx + 1);
        const mimeMatch = header.match(/data:([^;]+)/);
        const contentType = mimeMatch ? mimeMatch[1] : (mimeMap[doc.fileType.toLowerCase()] || 'application/octet-stream');
        const buffer = Buffer.from(base64Data, 'base64');
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(doc.fileName)}.${doc.fileType}"`);
        res.setHeader('Content-Length', buffer.length);
        return res.end(buffer);
      }
    }

    let resolvedPath = doc.filePath;
    if (!existsSync(resolvedPath)) {
      const tmpCandidate = path.join(os.tmpdir(), 'goldenerp-uploads', 'companies', path.basename(doc.filePath));
      if (existsSync(tmpCandidate)) resolvedPath = tmpCandidate;
    }

    if (!existsSync(resolvedPath)) {
      throw new NotFoundException('ملف المستند غير موجود على الخادم');
    }

    const contentType = mimeMap[doc.fileType.toLowerCase()] || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(doc.fileName)}.${doc.fileType}"`,
    );
    createReadStream(resolvedPath).pipe(res);
  }
}

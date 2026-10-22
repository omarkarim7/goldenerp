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
import { existsSync, mkdirSync, createReadStream } from 'fs';
import type { Response } from 'express';
import { CompaniesService } from './companies.service.js';
import { CreateCompanyDto } from './dto/create-company.dto.js';
import { UpdateCompanyDto } from './dto/update-company.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { UserRole } from '@prisma/client';

const getSafeCompanyUploadDir = (): string => {
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
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
  @Roles(UserRole.GENERAL_MANAGER)
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
    );
  }

  @Patch(':id/documents/:docId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.GENERAL_MANAGER)
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
  ) {
    return this.companiesService.updateDocument(id, docId, title, type, file);
  }

  @Delete(':id/documents/:docId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.GENERAL_MANAGER)
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
    if (!existsSync(doc.filePath)) {
      throw new NotFoundException('ملف المستند غير موجود على الخادم');
    }

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
    };

    const contentType = mimeMap[doc.fileType.toLowerCase()] || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${encodeURIComponent(doc.fileName)}.${doc.fileType}"`,
    );
    createReadStream(doc.filePath).pipe(res);
  }

  @Get(':id/documents/:docId/download')
  async downloadDocument(
    @Param('id') id: string,
    @Param('docId') docId: string,
    @Res() res: Response,
  ) {
    const doc = await this.companiesService.getDocument(id, docId);
    if (!existsSync(doc.filePath)) {
      throw new NotFoundException('ملف المستند غير موجود على الخادم');
    }

    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(doc.fileName)}.${doc.fileType}"`,
    );
    createReadStream(doc.filePath).pipe(res);
  }
}

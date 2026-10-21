import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
  Res,
  UploadedFile,
  UseInterceptors,
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
import { OperationsService } from './operations.service.js';
import { CreateOperationDto } from './dto/create-operation.dto.js';
import { UpdateOperationDto } from './dto/update-operation.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { OperationStatus, UserRole, OpDocType } from '@prisma/client';

const operationDocStorage = diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = './uploads/operations';
    if (!existsSync(uploadPath)) {
      mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = extname(file.originalname);
    cb(null, `op-doc-${uniqueSuffix}${ext}`);
  },
});

@Controller('operations')
@UseGuards(JwtAuthGuard)
export class OperationsController {
  constructor(private readonly operationsService: OperationsService) {}

  @Get()
  findAll(
    @Query('status') status?: OperationStatus,
    @Query('tenderType') tenderType?: string,
    @Query('governorate') governorate?: string,
    @Query('companyId') companyId?: string,
    @Query('company') company?: string,
    @Query('search') search?: string,
    @Query('limit') limit?: string,
  ) {
    return this.operationsService.findAll({
      status,
      tenderType,
      governorate,
      companyId,
      company,
      search,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('stats')
  getStats() {
    return this.operationsService.getStats();
  }

  @Get('next-code')
  getNextCode(
    @Query('companyCode') companyCode?: string,
    @Query('tenderType') tenderType?: string,
  ) {
    return this.operationsService.getNextCode(companyCode || 'A', tenderType || 'TENDER');
  }

  @Get('code/:code')
  findByCode(@Param('code') code: string) {
    return this.operationsService.findByCode(code);
  }

  @Get('expected-cloud-url')
  async getExpectedCloudUrl(@Query('fileName') fileName: string) {
    const url = await this.operationsService.getExpectedCloudUrl(fileName);
    return { success: true, url, provider: 'Cloudflare R2 Storage (حساب الشركة المعتمد)' };
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.operationsService.findOne(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.GENERAL_MANAGER, UserRole.EMPLOYEE)
  create(@Body() dto: CreateOperationDto, @Req() req: any) {
    return this.operationsService.create(dto, req.user?.sub);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.GENERAL_MANAGER, UserRole.EMPLOYEE)
  update(@Param('id') id: string, @Body() dto: UpdateOperationDto) {
    return this.operationsService.update(id, dto);
  }

  @Patch(':id/status')
  @UseGuards(RolesGuard)
  @Roles(UserRole.GENERAL_MANAGER, UserRole.EMPLOYEE)
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: OperationStatus,
    @Body('isCodeLocked') isCodeLocked?: boolean,
  ) {
    return this.operationsService.updateStatus(id, status, isCodeLocked);
  }

  @Patch(':id/toggle-lock')
  @UseGuards(RolesGuard)
  @Roles(UserRole.GENERAL_MANAGER, UserRole.EMPLOYEE)
  toggleCodeLock(@Param('id') id: string) {
    return this.operationsService.toggleCodeLock(id);
  }

  @Patch(':id/archive')
  @UseGuards(RolesGuard)
  @Roles(UserRole.GENERAL_MANAGER)
  archive(@Param('id') id: string) {
    return this.operationsService.archive(id);
  }

  // ━━━ Lifecycle endpoints ━━━

  @Post(':id/booklet')
  @UseGuards(RolesGuard)
  @Roles(UserRole.GENERAL_MANAGER, UserRole.EMPLOYEE)
  addBooklet(
    @Param('id') id: string,
    @Body() body: { fileName: string; companyId?: string },
  ) {
    return this.operationsService.addBooklet(id, body);
  }

  @Post(':id/dates')
  @UseGuards(RolesGuard)
  @Roles(UserRole.GENERAL_MANAGER, UserRole.EMPLOYEE)
  addDate(
    @Param('id') id: string,
    @Body() body: { dateType: any; dateValue: string; label?: string; notes?: string },
  ) {
    return this.operationsService.addDate(id, body);
  }

  @Patch(':id/dates/:dateId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.GENERAL_MANAGER, UserRole.EMPLOYEE)
  updateDate(
    @Param('id') id: string,
    @Param('dateId') dateId: string,
    @Body() body: { dateType?: any; dateValue?: string; label?: string; notes?: string },
  ) {
    return this.operationsService.updateDate(id, dateId, body);
  }

  @Delete(':id/dates/:dateId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.GENERAL_MANAGER, UserRole.EMPLOYEE)
  deleteDate(
    @Param('id') id: string,
    @Param('dateId') dateId: string,
  ) {
    return this.operationsService.deleteDate(id, dateId);
  }

  @Post(':id/submissions')
  @UseGuards(RolesGuard)
  @Roles(UserRole.GENERAL_MANAGER, UserRole.EMPLOYEE)
  addSubmission(
    @Param('id') id: string,
    @Body() body: { companyId: string; submissionDate: string; receiptNumber: string; notes?: string },
  ) {
    return this.operationsService.addSubmission(id, body);
  }

  @Post(':id/technical-openings')
  @UseGuards(RolesGuard)
  @Roles(UserRole.GENERAL_MANAGER, UserRole.EMPLOYEE)
  addTechnicalOpening(
    @Param('id') id: string,
    @Body() body: { companyId: string; result: 'ACCEPTED' | 'REJECTED'; reason?: string; openingDate?: string; notes?: string },
  ) {
    return this.operationsService.addTechnicalOpening(id, body);
  }

  @Patch(':id/technical-openings/:toId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.GENERAL_MANAGER, UserRole.EMPLOYEE)
  updateTechnicalOpening(
    @Param('id') id: string,
    @Param('toId') toId: string,
    @Body() body: any,
  ) {
    return this.operationsService.updateTechnicalOpening(id, toId, body);
  }

  @Delete(':id/technical-openings/:toId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.GENERAL_MANAGER, UserRole.EMPLOYEE)
  deleteTechnicalOpening(
    @Param('id') id: string,
    @Param('toId') toId: string,
  ) {
    return this.operationsService.deleteTechnicalOpening(id, toId);
  }

  @Post(':id/grievances')
  @UseGuards(RolesGuard)
  @Roles(UserRole.GENERAL_MANAGER, UserRole.EMPLOYEE)
  addGrievance(
    @Param('id') id: string,
    @Body() body: { companyId: string; grievanceType: 'AUTHORITY' | 'TRIBUNAL'; filingDate?: string; reason: string; notes?: string },
  ) {
    return this.operationsService.addGrievance(id, body);
  }

  @Patch(':id/grievances/:grievanceId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.GENERAL_MANAGER, UserRole.EMPLOYEE)
  updateGrievance(
    @Param('id') id: string,
    @Param('grievanceId') grievanceId: string,
    @Body() body: { status: any; notes?: string; approvedBy?: string },
  ) {
    return this.operationsService.updateGrievance(id, grievanceId, body);
  }

  @Delete(':id/grievances/:grievanceId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.GENERAL_MANAGER, UserRole.EMPLOYEE)
  deleteGrievance(
    @Param('id') id: string,
    @Param('grievanceId') grievanceId: string,
  ) {
    return this.operationsService.deleteGrievance(id, grievanceId);
  }

  @Post(':id/financial-openings')
  @UseGuards(RolesGuard)
  @Roles(UserRole.GENERAL_MANAGER, UserRole.EMPLOYEE)
  addFinancialOpening(
    @Param('id') id: string,
    @Body() body: { openingDate?: string; notes?: string; competitors: Array<{ competitorName: string; price: number; isOwnCompany?: boolean; companyId?: string; notes?: string }> },
  ) {
    return this.operationsService.addFinancialOpening(id, body);
  }

  @Patch(':id/financial-openings/:foId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.GENERAL_MANAGER, UserRole.EMPLOYEE)
  updateFinancialOpening(
    @Param('id') id: string,
    @Param('foId') foId: string,
    @Body() body: any,
  ) {
    return this.operationsService.updateFinancialOpening(id, foId, body);
  }

  @Delete(':id/financial-openings/:foId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.GENERAL_MANAGER, UserRole.EMPLOYEE)
  deleteFinancialOpening(
    @Param('id') id: string,
    @Param('foId') foId: string,
  ) {
    return this.operationsService.deleteFinancialOpening(id, foId);
  }

  @Post(':id/awards')
  @UseGuards(RolesGuard)
  @Roles(UserRole.GENERAL_MANAGER, UserRole.EMPLOYEE)
  addAward(
    @Param('id') id: string,
    @Body() body: { winnerName: string; winnerPrice: number; isOurCompany?: boolean; companyId?: string; awardDate?: string; notes?: string },
  ) {
    return this.operationsService.addAward(id, body);
  }

  @Patch(':id/awards/:awardId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.GENERAL_MANAGER, UserRole.EMPLOYEE)
  updateAward(
    @Param('id') id: string,
    @Param('awardId') awardId: string,
    @Body() body: any,
  ) {
    return this.operationsService.updateAward(id, awardId, body);
  }

  @Delete(':id/awards/:awardId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.GENERAL_MANAGER, UserRole.EMPLOYEE)
  deleteAward(
    @Param('id') id: string,
    @Param('awardId') awardId: string,
  ) {
    return this.operationsService.deleteAward(id, awardId);
  }

  @Post(':id/supply-orders')
  @UseGuards(RolesGuard)
  @Roles(UserRole.GENERAL_MANAGER, UserRole.EMPLOYEE)
  addSupplyOrder(
    @Param('id') id: string,
    @Body() body: { companyId?: string; orderNumber: string; orderDate: string; notes?: string },
  ) {
    return this.operationsService.addSupplyOrder(id, body);
  }

  @Patch(':id/supply-orders/:orderId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.GENERAL_MANAGER, UserRole.EMPLOYEE)
  updateSupplyOrder(
    @Param('id') id: string,
    @Param('orderId') orderId: string,
    @Body() body: any,
  ) {
    return this.operationsService.updateSupplyOrder(id, orderId, body);
  }

  @Delete(':id/supply-orders/:orderId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.GENERAL_MANAGER, UserRole.EMPLOYEE)
  deleteSupplyOrder(
    @Param('id') id: string,
    @Param('orderId') orderId: string,
  ) {
    return this.operationsService.deleteSupplyOrder(id, orderId);
  }

  @Post(':id/supply-receipts')
  @UseGuards(RolesGuard)
  @Roles(UserRole.GENERAL_MANAGER, UserRole.EMPLOYEE)
  addSupplyReceipt(
    @Param('id') id: string,
    @Body() body: { supplyOrderId?: string; receiptNumber: string; receiptDate: string; notes?: string; items?: Array<{ itemName: string; unit: string; quantity: number; unitPrice: number; totalPrice: number }> },
  ) {
    return this.operationsService.addSupplyReceipt(id, body);
  }

  @Post(':id/certificates')
  @UseGuards(RolesGuard)
  @Roles(UserRole.GENERAL_MANAGER, UserRole.EMPLOYEE)
  addCertificate(
    @Param('id') id: string,
    @Body() body: { companyId?: string; certificateNo: number; grossAmount: number; certificateDate?: string; taxDeduction?: number; vatAmount?: number; performanceBond?: number; netAmount?: number; notes?: string },
  ) {
    return this.operationsService.addCertificate(id, body);
  }

  @Post(':id/finance')
  @UseGuards(RolesGuard)
  @Roles(UserRole.GENERAL_MANAGER)
  updateFinance(
    @Param('id') id: string,
    @Body() body: { totalRevenue: number; totalCost: number; netProfit?: number; notes?: string },
  ) {
    return this.operationsService.updateFinance(id, body);
  }

  @Post(':id/recovery-step')
  @UseGuards(RolesGuard)
  @Roles(UserRole.GENERAL_MANAGER, UserRole.EMPLOYEE)
  advanceRecovery(
    @Param('id') id: string,
    @Body() body: { guaranteeId?: string; step: number; date: string; deliveredTo?: string },
  ) {
    return this.operationsService.advanceRecovery(id, body);
  }

  @Post(':id/guarantees')
  @UseGuards(RolesGuard)
  @Roles(UserRole.GENERAL_MANAGER, UserRole.EMPLOYEE)
  addGuarantee(
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.operationsService.addGuarantee(id, body);
  }

  @Patch(':id/guarantees/:guaranteeId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.GENERAL_MANAGER, UserRole.EMPLOYEE)
  updateGuarantee(
    @Param('id') id: string,
    @Param('guaranteeId') guaranteeId: string,
    @Body() body: any,
  ) {
    return this.operationsService.updateGuarantee(id, guaranteeId, body);
  }

  @Delete(':id/guarantees/:guaranteeId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.GENERAL_MANAGER, UserRole.EMPLOYEE)
  deleteGuarantee(
    @Param('id') id: string,
    @Param('guaranteeId') guaranteeId: string,
  ) {
    return this.operationsService.deleteGuarantee(id, guaranteeId);
  }

  // ━━━ مستندات العملية ودراسة السوق والملفات المرفقة ━━━

  @Post(':id/documents')
  @UseGuards(RolesGuard)
  @Roles(UserRole.GENERAL_MANAGER, UserRole.EMPLOYEE)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: operationDocStorage,
      limits: { fileSize: 35 * 1024 * 1024 }, // 35MB
    }),
  )
  async uploadDocument(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('fileName') fileName: string,
    @Body('title') title?: string,
    @Body('type') type?: OpDocType,
    @Body('companyId') companyId?: string,
    @Req() req?: any,
  ) {
    if (!file) {
      throw new BadRequestException('يرجى اختيار ملف أو صورة لرفعها');
    }
    const customName = fileName?.trim() || title?.trim() || file.originalname;
    const docType = type || OpDocType.MARKET_STUDY;
    const uploadedBy = req?.user?.fullName || req?.user?.username || 'المدير العام';

    return this.operationsService.uploadDocument(
      id,
      file,
      customName,
      docType,
      companyId,
      uploadedBy,
    );
  }

  @Get(':id/documents/:docId/file')
  async viewDocument(
    @Param('id') id: string,
    @Param('docId') docId: string,
    @Res() res: Response,
  ) {
    const file = await this.operationsService.getDocumentFile(id, docId);
    res.setHeader('Content-Type', file.contentType);
    const encFileName = encodeURIComponent(file.fileName);
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${encFileName}.${file.fileType}"; filename*=UTF-8''${encFileName}.${file.fileType}`,
    );
    if (file.size) {
      res.setHeader('Content-Length', file.size);
    }
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition, Content-Type, Content-Length');

    if (file.streamPath) {
      createReadStream(file.streamPath).pipe(res);
    } else if (file.buffer) {
      res.end(file.buffer);
    }
  }

  @Get(':id/documents/:docId/download')
  async downloadDocument(
    @Param('id') id: string,
    @Param('docId') docId: string,
    @Res() res: Response,
  ) {
    const file = await this.operationsService.getDocumentFile(id, docId);
    res.setHeader('Content-Type', file.contentType);
    const encFileName = encodeURIComponent(file.fileName);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encFileName}.${file.fileType}"; filename*=UTF-8''${encFileName}.${file.fileType}`,
    );
    if (file.size) {
      res.setHeader('Content-Length', file.size);
    }
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition, Content-Type, Content-Length');

    if (file.streamPath) {
      createReadStream(file.streamPath).pipe(res);
    } else if (file.buffer) {
      res.end(file.buffer);
    }
  }

  @Patch(':id/documents/:docId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.GENERAL_MANAGER, UserRole.EMPLOYEE)
  async updateDocument(
    @Param('id') id: string,
    @Param('docId') docId: string,
    @Body('fileName') fileName: string,
  ) {
    if (!fileName?.trim()) {
      throw new BadRequestException('اسم المستند مطلوب');
    }
    return this.operationsService.updateDocument(id, docId, fileName);
  }

  @Put(':id/documents/:docId/file')
  @UseGuards(RolesGuard)
  @Roles(UserRole.GENERAL_MANAGER, UserRole.EMPLOYEE)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: operationDocStorage,
      limits: { fileSize: 50 * 1024 * 1024 },
    }),
  )
  async replaceDocumentFile(
    @Param('id') id: string,
    @Param('docId') docId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('fileName') customName?: string,
  ) {
    if (!file) {
      throw new BadRequestException('الملف الجديد مطلوب للاستبدال');
    }
    return this.operationsService.replaceDocumentFile(id, docId, file, customName);
  }

  @Delete(':id/documents/:docId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.GENERAL_MANAGER, UserRole.EMPLOYEE)
  async deleteDocument(
    @Param('id') id: string,
    @Param('docId') docId: string,
  ) {
    return this.operationsService.deleteDocument(id, docId);
  }

  @Post('convert-docx-to-pdf')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 50 * 1024 * 1024 },
    }),
  )
  async convertDocxToPdf(
    @UploadedFile() file: Express.Multer.File,
    @Res() res: Response,
  ) {
    if (!file || !file.buffer) {
      throw new BadRequestException('ملف Word (.docx) مطلوب للتحويل');
    }
    try {
      const pdfBuffer = await this.operationsService.convertDocxBufferToPdf(file.buffer);
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline; filename="letter.pdf"',
        'Content-Length': pdfBuffer.length,
      });
      res.end(pdfBuffer);
    } catch (err: any) {
      return res.status(503).json({
        statusCode: 503,
        message: err?.message || 'فشل تحويل المستند إلى PDF',
        error: 'Service Unavailable',
      });
    }
  }

  @Post('open-in-word')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 50 * 1024 * 1024 },
    }),
  )
  async openInWord(@UploadedFile() file: Express.Multer.File) {
    if (!file || !file.buffer) {
      throw new BadRequestException('ملف Word (.docx) مطلوب للفتح');
    }
    return this.operationsService.openDocxInDesktopWord(file.buffer);
  }

  @Post('upload-cloud-pdf')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 50 * 1024 * 1024 },
    }),
  )
  async uploadCloudPdf(@UploadedFile() file: Express.Multer.File) {
    if (!file || !file.buffer) {
      throw new BadRequestException('ملف PDF مطلوب للرفع السحابي');
    }
    return this.operationsService.uploadCloudPdf(file.buffer, file.originalname);
  }

  @Get('download-remote-file')
  async downloadRemoteFile(
    @Query('url') fileUrl: string,
    @Query('fileName') fileName: string,
    @Res() res: Response,
  ) {
    if (!fileUrl) {
      throw new BadRequestException('رابط الملف مطلوب');
    }
    const finalName = fileName || 'document.pdf';
    try {
      const resp = await fetch(fileUrl);
      if (!resp.ok) {
        throw new BadRequestException('تعذر تحميل الملف من الخادم البعيد');
      }
      const buffer = Buffer.from(await resp.arrayBuffer());
      const contentType = resp.headers.get('content-type') || 'application/octet-stream';
      res.set({
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${encodeURIComponent(finalName)}"`,
        'Content-Length': buffer.length,
      });
      res.end(buffer);
    } catch (err: any) {
      throw new BadRequestException('فشل تنزيل الملف: ' + (err.message || 'خطأ اتصال'));
    }
  }

  @Get('public-doc/:fileName')
  async getPublicDoc(@Param('fileName') fileName: string, @Res() res: Response) {
    const safeName = decodeURIComponent(fileName).replace(/[^a-zA-Z0-9_\-\.]/g, '');
    const searchDirs = [
      path.resolve(process.cwd(), 'uploads', 'cloud_docs'),
      path.resolve(process.cwd(), '..', 'uploads', 'cloud_docs'),
      path.resolve(process.cwd(), '..', 'frontend', 'public', 'cloud_docs'),
      path.resolve(os.tmpdir(), 'cloud_docs'),
      path.resolve(process.cwd(), 'uploads'),
    ];

    for (const dir of searchDirs) {
      const p = path.resolve(dir, safeName);
      if (existsSync(p)) {
        res.set({
          'Content-Type': 'application/pdf',
          'Content-Disposition': `inline; filename="${safeName}"`,
          'Cache-Control': 'public, max-age=86400',
        });
        const stream = createReadStream(p);
        return stream.pipe(res);
      }
    }

    const frontendUrl = process.env.FRONTEND_URL || 'https://goldenerp-tau.vercel.app';
    const regMatch = safeName.match(/([a-zA-Z]{1,4}\d{6,14})/i);
    const regNo = regMatch ? regMatch[1] : safeName;
    return res.redirect(302, `${frontendUrl}/verify-doc?ref=${encodeURIComponent(regNo)}`);
  }

}


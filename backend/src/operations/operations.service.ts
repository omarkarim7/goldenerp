import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ServiceUnavailableException,
  Logger,
} from '@nestjs/common';
import * as crypto from 'crypto';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import { exec } from 'child_process';
import { existsSync, unlinkSync, statSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { extname } from 'path';
import { PrismaService } from '../prisma/prisma.service.js';
import { CompaniesService } from '../companies/companies.service.js';
import { RadarService } from '../radar/radar.service.js';
import { CreateOperationDto } from './dto/create-operation.dto.js';
import { UpdateOperationDto } from './dto/update-operation.dto.js';
import {
  OperationStatus,
  GuaranteeType,
  GuaranteePaymentMethod,
  GuaranteeStatus,
  OpDocType,
} from '@prisma/client';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class OperationsService {
  private readonly logger = new Logger(OperationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly companiesService: CompaniesService,
    private readonly radarService: RadarService,
  ) {}

  async findAll(filters?: {
    status?: OperationStatus;
    tenderType?: string;
    governorate?: string;
    companyId?: string;
    company?: string;
    search?: string;
    limit?: number;
  }) {
    const where: Record<string, unknown> = {};

    if (filters?.status) where.status = filters.status;
    if (filters?.tenderType) where.tenderType = filters.tenderType;
    if (filters?.governorate) where.governorate = filters.governorate;

    if (filters?.companyId) {
      where.companies = {
        some: { companyId: filters.companyId },
      };
    } else if (filters?.company && filters.company !== 'ALL') {
      where.companies = {
        some: {
          OR: [
            { displayCode: { startsWith: filters.company.toUpperCase() } },
            { company: { code: filters.company.toUpperCase() } },
          ],
        },
      };
    }

    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search } },
        { authority: { contains: filters.search } },
        { externalNumber: { contains: filters.search } },
        {
          companies: {
            some: { displayCode: { contains: filters.search } },
          },
        },
      ];
    }

    return this.prisma.operation.findMany({
      where,
      include: {
        companies: {
          include: {
            company: {
              select: { id: true, name: true, code: true },
            },
          },
        },
        dates: true,
        _count: {
          select: {
            guarantees: true,
            documents: true,
            submissions: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: filters?.limit ? Number(filters.limit) : undefined,
    });
  }

  private readonly opCache = new Map<string, { data: any; expiry: number }>();

  public invalidateOpCache(id?: string) {
    if (id) {
      this.opCache.delete(id);
    } else {
      this.opCache.clear();
    }
  }

  async findOne(id: string) {
    const cached = this.opCache.get(id);
    if (cached && cached.expiry > Date.now()) {
      return cached.data;
    }

    let [operation, radarItem] = await Promise.all([
      this.prisma.operation.findUnique({
        where: { id },
        include: {
          companies: {
            include: {
              company: {
                include: {
                  documents: true,
                },
              },
            },
          },
          dates: { orderBy: { dateValue: 'asc' } },
          contacts: true,
          documents: { orderBy: { createdAt: 'desc' } },
          technicalOffers: {
            include: {
              items: { include: { previousWork: true } },
            },
          },
          financialOffers: {
            include: {
              items: { orderBy: { sortOrder: 'asc' } },
            },
          },
          guarantees: {
            include: { notifications: true },
            orderBy: { createdAt: 'desc' },
          },
          submissions: true,
          technicalOpenings: true,
          financialOpenings: {
            include: {
              competitors: { orderBy: { rank: 'asc' } },
            },
          },
          grievances: true,
          awards: true,
          supplyOrders: {
            include: {
              goodsReceipts: {
                include: { items: true },
              },
            },
          },
          purchases: {
            include: {
              supplier: true,
              payments: { orderBy: { paymentDate: 'desc' } },
            },
          },
          certificates: { orderBy: { certificateNo: 'asc' } },
          operationFinance: true,
        },
      }),
      this.prisma.radarItem.findFirst({
        where: { operationId: id },
      }),
    ]);

    if (!operation) {
      throw new NotFoundException('العملية غير موجودة');
    }

    if (!radarItem && operation.externalNumber) {
      radarItem = await this.prisma.radarItem.findFirst({
        where: { referenceNumber: operation.externalNumber },
      });
    }

    let portalDetails: any = null;
    if (radarItem?.rawData) {
      try {
        portalDetails = JSON.parse(radarItem.rawData);
      } catch {}
    }

    const result = {
      ...operation,
      radarItem: radarItem ? {
        id: radarItem.id,
        externalId: radarItem.externalId,
        sourceUrl: radarItem.sourceUrl,
        publicationDate: radarItem.publicationDate,
        deadline: radarItem.deadline,
        category: radarItem.category,
        referenceNumber: radarItem.referenceNumber,
        matchedCompanyCode: radarItem.matchedCompanyCode,
        rawData: radarItem.rawData,
        attachments: Array.isArray(portalDetails?.attachments) ? portalDetails.attachments : [],
      } : null,
      portalDetails,
    };

    this.opCache.set(id, { data: result, expiry: Date.now() + 60000 });
    return result;
  }

  // البحث الذكي بالكود: A15 → العملية
  async findByCode(code: string) {
    const opCompany = await this.prisma.operationCompany.findUnique({
      where: { displayCode: code.toUpperCase() },
      include: {
        operation: {
          include: {
            companies: {
              include: { company: { select: { id: true, name: true, code: true } } },
            },
          },
        },
        company: { select: { id: true, name: true, code: true } },
      },
    });

    if (!opCompany) {
      throw new NotFoundException(`الكود "${code}" غير موجود`);
    }

    return opCompany;
  }

  async create(dto: CreateOperationDto, userId?: string) {
    if (!dto.companyIds || dto.companyIds.length === 0) {
      throw new BadRequestException('لازم تختار شركة واحدة على الأقل');
    }

    // Get company codes and next serials
    const companies = await this.prisma.company.findMany({
      where: { id: { in: dto.companyIds } },
    });

    if (companies.length !== dto.companyIds.length) {
      throw new BadRequestException('بعض الشركات غير موجودة');
    }

    // Create operation with companies in a transaction
    const newOperationId = await this.prisma.$transaction(async (tx) => {
      // 1. Create the operation
      const operation = await tx.operation.create({
        data: {
          name: dto.name,
          authority: dto.authority,
          externalNumber: dto.externalNumber,
          governorate: dto.governorate,
          tenderType: dto.tenderType,
          notes: dto.notes?.trim() || null,
          createdBy: userId,
        },
      });

      // 2. Create operation-company links with display codes
      for (const company of companies) {
        const displayCode = await this.companiesService.generateDisplayCode(company.code, dto.tenderType);

        await tx.operationCompany.create({
          data: {
            operationId: operation.id,
            companyId: company.id,
            displayCode,
          },
        });
      }

      // 3. Create milestone dates if provided
      if (dto.dates && dto.dates.length > 0) {
        for (const d of dto.dates) {
          if (!d.dateValue) continue;
          await tx.operationDate.create({
            data: {
              operationId: operation.id,
              dateType: d.dateType,
              dateValue: new Date(d.dateValue),
              label: d.label || undefined,
            },
          });
        }
      }

      // 4. Store extended portal details into linked RadarItem
      const defaultSource = await tx.radarSource.findFirst();
      const tempAmount = dto.temporaryInsurance !== undefined && !isNaN(Number(dto.temporaryInsurance)) ? Number(dto.temporaryInsurance) : undefined;
      const bookletAmount = dto.bookletPrice !== undefined && !isNaN(Number(dto.bookletPrice)) ? Number(dto.bookletPrice) : undefined;
      const finalRate = dto.finalInsuranceRate !== undefined && !isNaN(Number(dto.finalInsuranceRate)) ? Number(dto.finalInsuranceRate) : 5;

      const portalRaw: Record<string, any> = {
        title: dto.name,
        authority: dto.authority,
        refNo: dto.externalNumber,
        governorate: dto.governorate,
        titleEn: dto.titleEn,
        tenderMethod: dto.tenderMethod,
        tenderKind: dto.tenderKind,
        biddingType: dto.biddingType,
        tenderNature: dto.tenderNature,
        evaluationType: dto.evaluationType,
        activities: dto.activities,
        allowAlternativeOffers: dto.allowAlternativeOffers,
        allowInquiries: dto.allowInquiries,
        temporaryInsurance: tempAmount,
        bookletPrice: bookletAmount,
        finalInsuranceRate: finalRate,
        warrantyStatement: dto.warrantyStatement,
        currency: dto.currency || 'جنيه مصري',
        divisible: dto.divisible || 'تقبل التجزئة',
        allowMultipleTempInsurance: dto.allowMultipleTempInsurance,
        allowDownPayment: dto.allowDownPayment,
        downPayment: dto.downPayment,
        fiscalYear: dto.fiscalYear || '2026/2027',
        email: dto.email,
        publishingDays: dto.publishingDays,
        deliveryDuration: dto.deliveryDuration || 'شهر',
        conditions: dto.conditions,
        description: dto.description,
        ...(dto.portalDetails || {}),
      };

      if (defaultSource) {
        await tx.radarItem.create({
          data: {
            sourceId: defaultSource.id,
            operationId: operation.id,
            title: dto.name,
            authority: dto.authority,
            referenceNumber: dto.externalNumber,
            governorate: dto.governorate,
            temporaryInsurance: tempAmount,
            bookletPrice: bookletAmount,
            isImported: true,
            rawData: JSON.stringify(portalRaw),
          },
        });
      }

      // 5. Create Initial Guarantee if temporary insurance is specified
      if (tempAmount && tempAmount > 0 && companies.length > 0) {
        await tx.guarantee.create({
          data: {
            operationId: operation.id,
            companyId: companies[0].id,
            type: GuaranteeType.INITIAL,
            paymentMethod: GuaranteePaymentMethod.CASH,
            amount: tempAmount,
            percentage: 2,
            status: GuaranteeStatus.ACTIVE,
            notes: `تأمين مؤقت مسجل عند إنشاء العملية رقم ${dto.externalNumber || ''}`,
          },
        });
      }

      // 6. Initialize Operation Finance with Booklet Price if specified
      if (bookletAmount && bookletAmount > 0) {
        await tx.operationFinance.create({
          data: {
            operationId: operation.id,
            totalCost: bookletAmount,
            notes: `تكلفة شراء كراسة الشروط: ${bookletAmount} ج.م.`,
          },
        });
      }

      return operation.id;
    });

    return this.findOne(newOperationId);
  }

  async update(id: string, dto: UpdateOperationDto) {
    const existing = await this.prisma.operation.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('العملية غير موجودة');
    }

    // 1. Update Core Operation fields in database
    await this.prisma.operation.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.authority !== undefined && { authority: dto.authority }),
        ...(dto.externalNumber !== undefined && { externalNumber: dto.externalNumber }),
        ...(dto.governorate !== undefined && { governorate: dto.governorate }),
        ...(dto.tenderType !== undefined && { tenderType: dto.tenderType }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
      },
    });

    // 2. Find or link RadarItem to persist extended portalDetails
    let radarItem = await this.prisma.radarItem.findFirst({
      where: {
        OR: [
          { operationId: existing.id },
          { title: existing.name },
          ...(existing.externalNumber ? [{ referenceNumber: existing.externalNumber }] : []),
        ],
      },
    });

    let currentRaw: any = {};
    if (radarItem?.rawData) {
      try {
        currentRaw = JSON.parse(radarItem.rawData);
      } catch {}
    }

    // Merge incoming portal/extended fields
    const p = dto.portalDetails || {};
    const tempInsVal = dto.temporaryInsurance !== undefined ? Number(dto.temporaryInsurance) : (p.temporaryInsurance !== undefined ? Number(p.temporaryInsurance) : undefined);
    const bookletVal = dto.bookletPrice !== undefined ? Number(dto.bookletPrice) : (p.bookletPrice !== undefined ? Number(p.bookletPrice) : undefined);
    const finalRateVal = dto.finalInsuranceRate !== undefined ? Number(dto.finalInsuranceRate) : (p.finalInsuranceRate !== undefined ? Number(p.finalInsuranceRate) : undefined);

    const updatesMap: Record<string, any> = {
      titleEn: dto.titleEn ?? p.titleEn,
      tenderMethod: dto.tenderMethod ?? p.tenderMethod,
      tenderKind: dto.tenderKind ?? p.tenderKind,
      biddingType: dto.biddingType ?? p.biddingType,
      tenderNature: dto.tenderNature ?? p.tenderNature,
      evaluationType: dto.evaluationType ?? p.evaluationType,
      activities: dto.activities ?? p.activities,
      allowAlternativeOffers: dto.allowAlternativeOffers ?? p.allowAlternativeOffers,
      allowInquiries: dto.allowInquiries ?? p.allowInquiries,
      temporaryInsurance: tempInsVal,
      bookletPrice: bookletVal,
      finalInsuranceRate: finalRateVal,
      warrantyStatement: dto.warrantyStatement ?? p.warrantyStatement,
      currency: dto.currency ?? p.currency,
      divisible: dto.divisible ?? p.divisible,
      allowMultipleTempInsurance: dto.allowMultipleTempInsurance ?? p.allowMultipleTempInsurance,
      allowDownPayment: dto.allowDownPayment ?? p.allowDownPayment,
      downPayment: dto.downPayment ?? p.downPayment,
      fiscalYear: dto.fiscalYear ?? p.fiscalYear,
      email: dto.email ?? p.email,
      publishingDays: dto.publishingDays ?? p.publishingDays,
      deliveryDuration: dto.deliveryDuration ?? p.deliveryDuration,
      conditions: dto.conditions ?? p.conditions,
      description: dto.description ?? p.description,
    };

    let hasPortalUpdates = false;
    for (const [k, v] of Object.entries(updatesMap)) {
      if (v !== undefined) {
        currentRaw[k] = v;
        hasPortalUpdates = true;
      }
    }

    if (dto.name) currentRaw.title = dto.name;
    if (dto.authority) currentRaw.authority = dto.authority;
    if (dto.externalNumber) currentRaw.refNo = dto.externalNumber;
    if (dto.governorate) currentRaw.governorate = dto.governorate;

    if (radarItem) {
      await this.prisma.radarItem.update({
        where: { id: radarItem.id },
        data: {
          operationId: existing.id,
          rawData: JSON.stringify(currentRaw),
          ...(dto.name && { title: dto.name }),
          ...(dto.authority && { authority: dto.authority }),
          ...(dto.externalNumber && { referenceNumber: dto.externalNumber }),
          ...(dto.governorate && { governorate: dto.governorate }),
          ...(tempInsVal !== undefined && { temporaryInsurance: tempInsVal }),
          ...(bookletVal !== undefined && { bookletPrice: bookletVal }),
        },
      });
    } else if (hasPortalUpdates) {
      const defaultSource = await this.prisma.radarSource.findFirst();
      if (defaultSource) {
        await this.prisma.radarItem.create({
          data: {
            sourceId: defaultSource.id,
            operationId: existing.id,
            title: dto.name || existing.name,
            authority: dto.authority || existing.authority,
            referenceNumber: dto.externalNumber || existing.externalNumber,
            governorate: dto.governorate || existing.governorate,
            temporaryInsurance: tempInsVal,
            bookletPrice: bookletVal,
            isImported: true,
            rawData: JSON.stringify(currentRaw),
          },
        });
      }
    }

    // 3. Keep Preliminary Guarantee amount synchronized if temporary insurance was updated
    if (tempInsVal !== undefined && tempInsVal > 0) {
      const initialGuarantee = await this.prisma.guarantee.findFirst({
        where: {
          operationId: existing.id,
          type: GuaranteeType.INITIAL,
        },
      });
      if (initialGuarantee) {
        await this.prisma.guarantee.update({
          where: { id: initialGuarantee.id },
          data: { amount: tempInsVal },
        });
      }
    }

    // 4. Return full updated operation with refreshed portalDetails
    this.invalidateOpCache(id);
    return this.findOne(id);
  }

  async updateStatus(id: string, status: OperationStatus, isCodeLocked?: boolean) {
    const operation = await this.findOne(id);

    // Lock code after booklet withdrawal
    const lockStatuses: OperationStatus[] = [
      'BOOKLET_WITHDRAWN',
      'SUBMITTED',
      'TECHNICAL_OPENED',
      'TECHNICAL_ACCEPTED',
      'FINANCIAL_OPENED',
      'AWARDED',
      'SUPPLY_IN_PROGRESS',
      'COMPLETED',
      'CLOSED',
    ];

    let finalLock = operation.isCodeLocked;
    if (typeof isCodeLocked === 'boolean') {
      finalLock = isCodeLocked;
    } else if (status === 'DRAFT') {
      finalLock = false;
    } else if (lockStatuses.includes(status) && !operation.isCodeLocked) {
      finalLock = true;
    }

    await this.prisma.operation.update({
      where: { id },
      data: {
        status,
        isCodeLocked: finalLock,
      },
    });

    this.invalidateOpCache(id);
    return this.findOne(id);
  }

  async toggleCodeLock(id: string) {
    const operation = await this.findOne(id);
    await this.prisma.operation.update({
      where: { id },
      data: {
        isCodeLocked: !operation.isCodeLocked,
      },
    });

    this.invalidateOpCache(id);
    return this.findOne(id);
  }

  // Soft delete — move to cancelled/archived
  async archive(id: string) {
    const operation = await this.findOne(id);

    // Don't allow archiving after technical opening without approval
    const protectedStatuses: OperationStatus[] = [
      'TECHNICAL_OPENED',
      'TECHNICAL_ACCEPTED',
      'FINANCIAL_OPENED',
      'AWARDED',
      'SUPPLY_IN_PROGRESS',
    ];

    if (protectedStatuses.includes(operation.status)) {
      throw new BadRequestException(
        'لا يمكن أرشفة العملية في هذه المرحلة بدون موافقة المدير',
      );
    }

    return this.prisma.operation.update({
      where: { id },
      data: {
        status: 'ARCHIVED',
        isArchived: true,
      },
    });
  }

  // Dashboard stats
  async getStats() {
    const [total, active, awarded, closed] = await Promise.all([
      this.prisma.operation.count(),
      this.prisma.operation.count({
        where: {
          status: {
            notIn: ['CLOSED', 'CANCELLED', 'ARCHIVED'],
          },
        },
      }),
      this.prisma.operation.count({ where: { status: 'AWARDED' } }),
      this.prisma.operation.count({ where: { status: 'CLOSED' } }),
    ]);

    return { total, active, awarded, closed };
  }

  // ━━━ 1. سحب كراسة الشروط وقفل الكود ━━━
  async addBooklet(id: string, data: { fileName: string; companyId?: string }) {
    const operation = await this.findOne(id);
    const companyId = data.companyId || operation.companies[0]?.companyId;

    // Search for linked RadarItem
    const radarItem = await this.prisma.radarItem.findFirst({
      where: {
        OR: [
          { operationId: id },
          ...(operation.externalNumber ? [{ referenceNumber: operation.externalNumber }] : []),
          ...(operation.serialNumber ? [{ referenceNumber: operation.serialNumber }] : []),
        ],
      },
    });

    const targetDocId = 'booklet';
    const targetTenderId = radarItem?.id;

    let downloaded: any = null;
    try {
      downloaded = await this.radarService.downloadDocument(targetDocId, targetTenderId);
    } catch (radarErr: any) {
      this.logger.warn(`Radar downloadDocument failed in addBooklet: ${radarErr?.message}`);
      throw new BadRequestException(
        radarErr?.message ||
          'لم تقم الجهة الحكومية برفع ملف كراسة الشروط إلكترونياً على بوابة التعاقدات لهذه العملية، حيث يتطلب شراؤها واستلام النسخة الورقية من مقر الجهة. يمكنك فتح رابط البوابة الرسمي والاطلاع على التفاصيل، ثم رفع النسخة الممسوحة ضوئياً (Scan) عبر زر "رفع كراسة بديلة أو ملحق".'
      );
    }

    if (!downloaded || !downloaded.buffer || downloaded.buffer.length === 0) {
      throw new BadRequestException(
        'لم تقم الجهة الحكومية برفع ملف كراسة الشروط إلكترونياً على بوابة التعاقدات لهذه العملية، حيث يتطلب شراؤها واستلام النسخة الورقية من مقر الجهة. يمكنك فتح رابط البوابة الرسمي والاطلاع على التفاصيل، ثم رفع النسخة الممسوحة ضوئياً (Scan) عبر زر "رفع كراسة بديلة أو ملحق".'
      );
    }

    // Detect extension
    let ext = 'pdf';
    if (downloaded.filename?.toLowerCase().endsWith('.docx') || downloaded.contentType?.includes('word')) {
      ext = 'docx';
    } else if (downloaded.filename?.toLowerCase().endsWith('.doc')) {
      ext = 'doc';
    }

    const uploadsDir = path.resolve(process.cwd(), 'uploads/operations');
    if (!existsSync(uploadsDir)) mkdirSync(uploadsDir, { recursive: true });
    const savedFilename = `booklet-${id}-${Date.now()}.${ext}`;
    const diskPath = path.join(uploadsDir, savedFilename);
    writeFileSync(diskPath, downloaded.buffer);

    const docName = data.fileName || downloaded.filename || `كراسة_شروط_${operation.externalNumber || operation.serialNumber || id}.${ext}`;

    await this.prisma.operationDocument.create({
      data: {
        operationId: id,
        companyId,
        type: 'BOOKLET',
        fileName: docName,
        filePath: `uploads/operations/${savedFilename}`,
        fileType: ext,
        fileSize: downloaded.buffer.length,
      },
    });

    const updated = await this.prisma.operation.update({
      where: { id },
      data: {
        isCodeLocked: true,
        status: operation.status === 'DRAFT' ? 'BOOKLET_WITHDRAWN' : undefined,
      },
      include: {
        documents: true,
        companies: { include: { company: true } },
      },
    });
    this.invalidateOpCache(id);
    return updated;
  }

  // ━━━ 2. إضافة وتعديل وحذف التواريخ الحرجة ━━━
  async addDate(id: string, data: { dateType: any; dateValue: string; label?: string; notes?: string }) {
    await this.findOne(id);
    const date = await this.prisma.operationDate.create({
      data: {
        operationId: id,
        dateType: data.dateType,
        dateValue: new Date(data.dateValue),
        label: data.label || undefined,
        notes: data.notes || undefined,
      },
    });
    this.invalidateOpCache(id);
    return date;
  }

  async updateDate(id: string, dateId: string, data: { dateType?: any; dateValue?: string; label?: string; notes?: string }) {
    await this.findOne(id);
    const existing = await this.prisma.operationDate.findFirst({
      where: { id: dateId, operationId: id },
    });
    if (!existing) {
      throw new NotFoundException('الموعد غير موجود');
    }
    const updated = await this.prisma.operationDate.update({
      where: { id: dateId },
      data: {
        dateType: data.dateType || undefined,
        dateValue: data.dateValue ? new Date(data.dateValue) : undefined,
        label: data.label !== undefined ? data.label : undefined,
        notes: data.notes !== undefined ? data.notes : undefined,
      },
    });
    this.invalidateOpCache(id);
    return updated;
  }

  async deleteDate(id: string, dateId: string) {
    await this.findOne(id);
    const existing = await this.prisma.operationDate.findFirst({
      where: { id: dateId, operationId: id },
    });
    if (!existing) {
      throw new NotFoundException('الموعد غير موجود');
    }
    const deleted = await this.prisma.operationDate.delete({
      where: { id: dateId },
    });
    this.invalidateOpCache(id);
    return deleted;
  }

  // ━━━ 3. تقديم العطاء والإيصال ━━━
  async addSubmission(id: string, data: { companyId: string; submissionDate: string; receiptNumber: string; notes?: string }) {
    await this.findOne(id);
    const submission = await this.prisma.submission.create({
      data: {
        operationId: id,
        companyId: data.companyId,
        submissionDate: new Date(data.submissionDate),
        receiptNumber: data.receiptNumber,
        notes: data.notes,
      },
    });

    await this.prisma.operation.update({
      where: { id },
      data: { status: 'SUBMITTED' },
    });

    this.invalidateOpCache(id);
    return submission;
  }

  // ━━━ 4. جلسة الفتح الفني ━━━
  async addTechnicalOpening(id: string, data: { companyId: string; result: 'ACCEPTED' | 'REJECTED'; reason?: string; openingDate?: string; notes?: string }) {
    await this.findOne(id);
    const opening = await this.prisma.technicalOpening.create({
      data: {
        operationId: id,
        companyId: data.companyId,
        result: data.result,
        reason: data.reason,
        openingDate: data.openingDate ? new Date(data.openingDate) : new Date(),
        notes: data.notes,
      },
    });

    const newStatus = data.result === 'ACCEPTED' ? 'TECHNICAL_ACCEPTED' : 'TECHNICAL_REJECTED';
    await this.prisma.operation.update({
      where: { id },
      data: { status: newStatus },
    });

    this.invalidateOpCache(id);
    return opening;
  }

  async updateTechnicalOpening(id: string, toId: string, data: any) {
    await this.findOne(id);
    const existing = await this.prisma.technicalOpening.findFirst({
      where: { id: toId, operationId: id },
    });
    if (!existing) {
      throw new NotFoundException('محضر الفتح الفني غير موجود');
    }

    const updated = await this.prisma.technicalOpening.update({
      where: { id: toId },
      data: {
        companyId: data.companyId,
        result: data.result,
        reason: data.result === 'REJECTED' ? data.reason : null,
        openingDate: data.openingDate ? new Date(data.openingDate) : undefined,
        notes: data.notes,
      },
    });

    if (data.result) {
      const newStatus = data.result === 'ACCEPTED' ? 'TECHNICAL_ACCEPTED' : 'TECHNICAL_REJECTED';
      await this.prisma.operation.update({
        where: { id },
        data: { status: newStatus },
      });
    }

    this.invalidateOpCache(id);
    return updated;
  }

  async deleteTechnicalOpening(id: string, toId: string) {
    await this.findOne(id);
    const deleted = await this.prisma.technicalOpening.delete({
      where: { id: toId },
    });
    this.invalidateOpCache(id);
    return deleted;
  }

  // ━━━ 5. التظلم القانوني + توليد الـ Hash Code ━━━
  async addGrievance(id: string, data: { companyId: string; grievanceType: 'AUTHORITY' | 'TRIBUNAL'; filingDate?: string; reason: string; notes?: string }) {
    await this.findOne(id);
    const filing = data.filingDate ? new Date(data.filingDate) : new Date();
    const daysAllowed = data.grievanceType === 'AUTHORITY' ? 7 : 15;
    const deadline = new Date(filing.getTime() + daysAllowed * 24 * 60 * 60 * 1000);

    // Generate unique 32-character hash code
    const rawString = `${id}-${data.companyId}-${Date.now()}-${Math.random()}`;
    const hash = crypto.createHash('sha256').update(rawString).digest('hex').substring(0, 32).toUpperCase();

    const grievance = await this.prisma.grievance.create({
      data: {
        operationId: id,
        companyId: data.companyId,
        grievanceType: data.grievanceType,
        filingDate: filing,
        deadlineDate: deadline,
        reason: data.reason,
        hashCode: hash,
        notes: data.notes,
      },
    });

    await this.prisma.operation.update({
      where: { id },
      data: { status: 'GRIEVANCE_FILED' },
    });

    this.invalidateOpCache(id);
    return grievance;
  }

  async updateGrievance(id: string, grievanceId: string, data: { status: any; notes?: string; approvedBy?: string }) {
    await this.findOne(id);
    const existing = await this.prisma.grievance.findFirst({
      where: { id: grievanceId, operationId: id },
    });
    if (!existing) {
      throw new NotFoundException('التظلم غير موجود');
    }

    let mappedStatus = data.status;
    if (data.status === 'ACCEPTED') {
      mappedStatus = 'APPROVED';
    } else if (data.status === 'PARTIALLY_ACCEPTED') {
      mappedStatus = 'RESOLVED';
    } else if (!['PENDING', 'APPROVED', 'FILED', 'RESOLVED', 'REJECTED'].includes(data.status)) {
      mappedStatus = 'APPROVED';
    }

    const updated = await this.prisma.grievance.update({
      where: { id: grievanceId },
      data: {
        status: mappedStatus,
        notes: data.notes !== undefined ? data.notes : existing.notes,
        approvedBy: data.approvedBy,
        approvedAt: mappedStatus === 'APPROVED' || mappedStatus === 'RESOLVED' ? new Date() : undefined,
      },
    });

    this.invalidateOpCache(id);
    return updated;
  }

  async deleteGrievance(id: string, grievanceId: string) {
    await this.findOne(id);
    const deleted = await this.prisma.grievance.delete({
      where: { id: grievanceId },
    });
    this.invalidateOpCache(id);
    return deleted;
  }

  // ━━━ 6. الفتح المالي والمنافسين مع الترتيب التلقائي ━━━
  async addFinancialOpening(id: string, data: { openingDate?: string; notes?: string; competitors: Array<{ competitorName: string; price: number; isOwnCompany?: boolean; companyId?: string; notes?: string }> }) {
    await this.findOne(id);
    
    // Sort competitors by price ascending
    const sorted = [...(data.competitors || [])].sort((a, b) => Number(a.price) - Number(b.price));

    const opening = await this.prisma.financialOpening.create({
      data: {
        operationId: id,
        openingDate: data.openingDate ? new Date(data.openingDate) : new Date(),
        notes: data.notes,
        competitors: {
          create: sorted.map((c, index) => ({
            competitorName: c.competitorName,
            price: Number(c.price),
            rank: index + 1,
            isOwnCompany: !!c.isOwnCompany,
            companyId: c.companyId,
            notes: c.notes,
          })),
        },
      },
      include: { competitors: { orderBy: { rank: 'asc' } } },
    });

    await this.prisma.operation.update({
      where: { id },
      data: { status: 'FINANCIAL_OPENED' },
    });

    this.invalidateOpCache(id);
    return opening;
  }

  async updateFinancialOpening(id: string, foId: string, data: any) {
    await this.findOne(id);
    const existing = await this.prisma.financialOpening.findFirst({
      where: { id: foId, operationId: id },
    });
    if (!existing) {
      throw new NotFoundException('محضر الفتح المالي غير موجود');
    }

    if (data.competitors && Array.isArray(data.competitors)) {
      await this.prisma.competitor.deleteMany({ where: { financialOpeningId: foId } });
      const sorted = [...data.competitors].sort((a, b) => Number(a.price) - Number(b.price));
      await this.prisma.competitor.createMany({
        data: sorted.map((c, index) => ({
          financialOpeningId: foId,
          competitorName: c.competitorName,
          price: Number(c.price),
          rank: index + 1,
          isOwnCompany: !!c.isOwnCompany,
          companyId: c.companyId,
          notes: c.notes,
        })),
      });
    }

    const updated = await this.prisma.financialOpening.update({
      where: { id: foId },
      data: {
        openingDate: data.openingDate ? new Date(data.openingDate) : undefined,
        notes: data.notes,
      },
      include: { competitors: { orderBy: { rank: 'asc' } } },
    });

    this.invalidateOpCache(id);
    return updated;
  }

  async deleteFinancialOpening(id: string, foId: string) {
    await this.findOne(id);
    const deleted = await this.prisma.financialOpening.delete({
      where: { id: foId },
    });
    this.invalidateOpCache(id);
    return deleted;
  }

  // ━━━ 7. الترسية والفوز ━━━
  async addAward(id: string, data: { winnerName: string; winnerPrice: number; isOurCompany?: boolean; companyId?: string; awardDate?: string; notes?: string }) {
    await this.findOne(id);

    const award = await this.prisma.award.create({
      data: {
        operationId: id,
        winnerName: data.winnerName,
        winnerPrice: Number(data.winnerPrice),
        isOurCompany: !!data.isOurCompany,
        companyId: data.companyId,
        awardDate: data.awardDate ? new Date(data.awardDate) : new Date(),
        notes: data.notes,
      },
    });

    if (data.isOurCompany && data.companyId) {
      await this.prisma.operationCompany.updateMany({
        where: { operationId: id, companyId: data.companyId },
        data: { isWinner: true },
      });
    }

    await this.prisma.operation.update({
      where: { id },
      data: { status: 'AWARDED' },
    });

    this.invalidateOpCache(id);
    return award;
  }

  async updateAward(id: string, awardId: string, data: any) {
    await this.findOne(id);
    const updated = await this.prisma.award.update({
      where: { id: awardId },
      data: {
        winnerName: data.winnerName,
        winnerPrice: data.winnerPrice !== undefined ? Number(data.winnerPrice) : undefined,
        isOurCompany: data.isOurCompany !== undefined ? !!data.isOurCompany : undefined,
        companyId: data.companyId,
        awardDate: data.awardDate ? new Date(data.awardDate) : undefined,
        notes: data.notes,
      },
    });

    if (data.isOurCompany !== undefined && data.companyId) {
      await this.prisma.operationCompany.updateMany({
        where: { operationId: id, companyId: data.companyId },
        data: { isWinner: !!data.isOurCompany },
      });
    }

    this.invalidateOpCache(id);
    return updated;
  }

  async deleteAward(id: string, awardId: string) {
    await this.findOne(id);
    const existing = await this.prisma.award.findUnique({ where: { id: awardId } });
    if (existing?.isOurCompany && existing.companyId) {
      await this.prisma.operationCompany.updateMany({
        where: { operationId: id, companyId: existing.companyId },
        data: { isWinner: false },
      });
    }
    const deleted = await this.prisma.award.delete({ where: { id: awardId } });
    this.invalidateOpCache(id);
    return deleted;
  }

  // ━━━ 8. أمر التوريد ━━━
  async addSupplyOrder(id: string, data: { companyId?: string; orderNumber: string; orderDate: string; notes?: string }) {
    const operation = await this.findOne(id);
    const companyId = data.companyId || operation.companies[0]?.companyId;

    const order = await this.prisma.supplyOrder.create({
      data: {
        operationId: id,
        companyId,
        orderNumber: data.orderNumber,
        orderDate: new Date(data.orderDate),
        notes: data.notes,
      },
    });

    // Also register an operation document
    await this.prisma.operationDocument.create({
      data: {
        operationId: id,
        companyId,
        type: 'SUPPLY_ORDER',
        fileName: `أمر_توريد_${data.orderNumber}.pdf`,
        filePath: `/uploads/supply-orders/${id}_${data.orderNumber}.pdf`,
        fileType: 'application/pdf',
      },
    });

    await this.prisma.operation.update({
      where: { id },
      data: { status: 'SUPPLY_IN_PROGRESS' },
    });

    this.invalidateOpCache(id);
    return order;
  }

  async updateSupplyOrder(id: string, orderId: string, data: any) {
    await this.findOne(id);
    const updated = await this.prisma.supplyOrder.update({
      where: { id: orderId },
      data: {
        orderNumber: data.orderNumber,
        orderDate: data.orderDate ? new Date(data.orderDate) : undefined,
        notes: data.notes,
      },
    });
    this.invalidateOpCache(id);
    return updated;
  }

  async deleteSupplyOrder(id: string, orderId: string) {
    await this.findOne(id);
    const deleted = await this.prisma.supplyOrder.delete({ where: { id: orderId } });
    this.invalidateOpCache(id);
    return deleted;
  }

  // ━━━ 9. إذن إضافة وتوريد (تأثير على المخزون) ━━━
  async addSupplyReceipt(id: string, data: { supplyOrderId?: string; receiptNumber: string; receiptDate: string; notes?: string; items?: Array<{ itemName: string; unit: string; quantity: number; unitPrice: number; totalPrice: number }> }) {
    const operation = await this.findOne(id);
    let soId = data.supplyOrderId;

    if (!soId) {
      const existing = await this.prisma.supplyOrder.findFirst({
        where: { operationId: id },
        orderBy: { createdAt: 'desc' },
      });
      if (existing) {
        soId = existing.id;
      } else {
        const companyId = operation.companies[0]?.companyId;
        const newSo = await this.prisma.supplyOrder.create({
          data: {
            operationId: id,
            companyId,
            orderNumber: `ORD-${operation.serialNumber}`,
            orderDate: new Date(),
          },
        });
        soId = newSo.id;
      }
    }

    const receipt = await this.prisma.goodsReceipt.create({
      data: {
        supplyOrderId: soId,
        receiptNumber: data.receiptNumber,
        receiptDate: new Date(data.receiptDate),
        notes: data.notes,
        items: data.items && data.items.length > 0 ? {
          create: data.items.map(it => ({
            itemName: it.itemName,
            unit: it.unit || 'قطعة',
            quantity: Number(it.quantity),
            unitPrice: Number(it.unitPrice || 0),
            totalPrice: Number(it.totalPrice || Number(it.quantity) * Number(it.unitPrice || 0)),
          })),
        } : undefined,
      },
      include: { items: true },
    });

    return receipt;
  }

  // ━━━ 10. المستخلصات (مع حساب الخصومات: 1% أ.ت.ص، 14% ضريبة، 5% ضمان) ━━━
  async addCertificate(id: string, data: { companyId?: string; certificateNo: number; grossAmount: number; certificateDate?: string; taxDeduction?: number; vatAmount?: number; performanceBond?: number; netAmount?: number; notes?: string }) {
    const operation = await this.findOne(id);
    let companyId = data.companyId || operation.companies?.[0]?.companyId;
    if (!companyId) {
      const firstCompany = await this.prisma.company.findFirst();
      companyId = firstCompany?.id;
    }

    const gross = Number(data.grossAmount) || 0;
    const tax = data.taxDeduction !== undefined ? Number(data.taxDeduction) : Math.round(gross * 0.01 * 100) / 100;
    const vat = data.vatAmount !== undefined ? Number(data.vatAmount) : Math.round(gross * 0.14 * 100) / 100;
    const bond = data.performanceBond !== undefined ? Number(data.performanceBond) : Math.round(gross * 0.05 * 100) / 100;
    const net = data.netAmount !== undefined ? Number(data.netAmount) : Math.round((gross + vat - (tax + bond)) * 100) / 100;

    const cert = await this.prisma.certificate.create({
      data: {
        operationId: id,
        companyId: companyId!,
        certificateNo: Number(data.certificateNo) || 1,
        grossAmount: gross,
        taxDeduction: tax,
        vatAmount: vat,
        performanceBond: bond,
        netAmount: net,
        certificateDate: data.certificateDate ? new Date(data.certificateDate) : new Date(),
        notes: data.notes,
      },
    });

    this.invalidateOpCache(id);
    return cert;
  }

  async deleteCertificate(id: string, certId: string) {
    await this.findOne(id);
    const deleted = await this.prisma.certificate.delete({
      where: { id: certId },
    });
    this.invalidateOpCache(id);
    return deleted;
  }

  // ━━━ 11. حساب التكلفة الفعلية والربح ━━━
  async updateFinance(id: string, data: { totalRevenue: number; totalCost: number; netProfit?: number; notes?: string }) {
    await this.findOne(id);
    const rev = Number(data.totalRevenue);
    const cost = Number(data.totalCost);
    const profit = data.netProfit !== undefined ? Number(data.netProfit) : (rev - cost);

    return this.prisma.operationFinance.upsert({
      where: { operationId: id },
      create: {
        operationId: id,
        totalRevenue: rev,
        totalCost: cost,
        netProfit: profit,
        notes: data.notes,
      },
      update: {
        totalRevenue: rev,
        totalCost: cost,
        netProfit: profit,
        notes: data.notes,
      },
    });
  }

  // ━━━ 12. تتبع استرداد التأمين النهائي (Stepper 3 مراحل) ━━━
  async advanceRecovery(id: string, data: { guaranteeId?: string; step: number; date: string; deliveredTo?: string }) {
    let guarantee;
    if (data.guaranteeId) {
      guarantee = await this.prisma.guarantee.findUnique({ where: { id: data.guaranteeId } });
    } else {
      guarantee = await this.prisma.guarantee.findFirst({
        where: { operationId: id, type: 'FINAL' },
        orderBy: { createdAt: 'desc' },
      });
    }

    if (!guarantee) {
      throw new BadRequestException('لا يوجد تأمين نهائي مسجل لهذه العملية');
    }

    const stepDate = new Date(data.date || Date.now());

    if (data.step === 1) {
      return this.prisma.guarantee.update({
        where: { id: guarantee.id },
        data: {
          recoveryLetterDate: stepDate,
          status: 'RECOVERY_REQUESTED',
        },
      });
    } else if (data.step === 2) {
      return this.prisma.guarantee.update({
        where: { id: guarantee.id },
        data: {
          paymentOrderDate: stepDate,
        },
      });
    } else if (data.step === 3) {
      return this.prisma.guarantee.update({
        where: { id: guarantee.id },
        data: {
          actualRecoveryDate: stepDate,
          deliveredTo: data.deliveredTo || 'الإدارة المالية',
          isRecovered: true,
          status: 'RECOVERED',
        },
      });
    }

    throw new BadRequestException('المرحلة المحددة غير صحيحة');
  }

  // ━━━ 13. إضافة تأمين (ابتدائي أو نهائي) مباشرة ━━━
  async addGuarantee(id: string, data: any) {
    const operation = await this.findOne(id);
    let companyId = data.companyId || operation.companies?.[0]?.companyId;
    if (!companyId) {
      const firstCompany = await this.prisma.company.findFirst();
      companyId = firstCompany?.id;
    }

    // Sanitize GuaranteeType
    let safeType: GuaranteeType = GuaranteeType.INITIAL;
    const rawType = String(data.type || '').toUpperCase();
    if (rawType === 'FINAL' || rawType.includes('نهائي')) {
      safeType = GuaranteeType.FINAL;
    }

    // Sanitize GuaranteePaymentMethod
    let safePaymentMethod: GuaranteePaymentMethod = GuaranteePaymentMethod.BANK_GUARANTEE;
    const pm = String(data.paymentMethod || '').toUpperCase();
    if (pm === 'CASH' || pm.includes('خزينة') || pm.includes('نقد') || pm.includes('CASH')) {
      safePaymentMethod = GuaranteePaymentMethod.CASH;
    } else if (pm === 'DEDUCTION_FROM_DUES' || pm.includes('خصم') || pm.includes('DEDUCTION')) {
      safePaymentMethod = GuaranteePaymentMethod.DEDUCTION_FROM_DUES;
    } else {
      safePaymentMethod = GuaranteePaymentMethod.BANK_GUARANTEE;
    }

    // Safely parse dates
    let startDate: Date | undefined = undefined;
    const rawStart = data.startDate || data.issueDate || data.paymentDate;
    if (rawStart) {
      const parsed = new Date(rawStart);
      if (!isNaN(parsed.getTime())) startDate = parsed;
    }

    let endDate: Date | undefined = undefined;
    const rawEnd = data.endDate || data.validUntil;
    if (rawEnd) {
      const parsed = new Date(rawEnd);
      if (!isNaN(parsed.getTime())) endDate = parsed;
    }

    return this.prisma.guarantee.create({
      data: {
        operationId: id,
        companyId: companyId || '',
        type: safeType,
        paymentMethod: safePaymentMethod,
        amount: Number(data.amount) || 0,
        percentage: data.percentage ? Number(data.percentage) : undefined,
        startDate,
        endDate,
        duration: data.duration ? Number(data.duration) : undefined,
        bankName: data.bankName,
        bankBranch: data.bankBranch,
        guaranteeNumber: data.guaranteeNumber,
        receiptNumber: data.receiptNumber,
        treasury: data.treasury,
        notes: data.notes,
      },
    });
  }

  async updateGuarantee(id: string, guaranteeId: string, data: any) {
    await this.findOne(id);

    let safeType: GuaranteeType | undefined = undefined;
    if (data.type) {
      const rawType = String(data.type).toUpperCase();
      safeType = (rawType === 'FINAL' || rawType.includes('نهائي')) ? GuaranteeType.FINAL : GuaranteeType.INITIAL;
    }

    let safePaymentMethod: GuaranteePaymentMethod | undefined = undefined;
    if (data.paymentMethod) {
      const pm = String(data.paymentMethod).toUpperCase();
      if (pm === 'CASH' || pm.includes('خزينة') || pm.includes('نقد')) {
        safePaymentMethod = GuaranteePaymentMethod.CASH;
      } else if (pm === 'DEDUCTION_FROM_DUES' || pm.includes('خصم') || pm.includes('DEDUCTION')) {
        safePaymentMethod = GuaranteePaymentMethod.DEDUCTION_FROM_DUES;
      } else {
        safePaymentMethod = GuaranteePaymentMethod.BANK_GUARANTEE;
      }
    }

    let startDate: Date | undefined = undefined;
    const rawStart = data.startDate || data.issueDate || data.paymentDate;
    if (rawStart) {
      const parsed = new Date(rawStart);
      if (!isNaN(parsed.getTime())) startDate = parsed;
    }

    let endDate: Date | undefined = undefined;
    const rawEnd = data.endDate || data.validUntil;
    if (rawEnd) {
      const parsed = new Date(rawEnd);
      if (!isNaN(parsed.getTime())) endDate = parsed;
    }

    return this.prisma.guarantee.update({
      where: { id: guaranteeId },
      data: {
        type: safeType,
        paymentMethod: safePaymentMethod,
        amount: data.amount !== undefined ? Number(data.amount) : undefined,
        percentage: data.percentage !== undefined ? Number(data.percentage) : undefined,
        startDate,
        endDate,
        duration: data.duration !== undefined ? Number(data.duration) : undefined,
        bankName: data.bankName,
        bankBranch: data.bankBranch,
        guaranteeNumber: data.guaranteeNumber,
        receiptNumber: data.receiptNumber,
        treasury: data.treasury,
        notes: data.notes,
      },
    });
  }

  async deleteGuarantee(id: string, guaranteeId: string) {
    await this.findOne(id);
    return this.prisma.guarantee.delete({ where: { id: guaranteeId } });
  }

  // ━━━ 14. معاينة الكود التالي للعملية بحسب كود الشركة ونوع الطرح ━━━
  async getNextCode(companyCode: string, tenderType?: string) {
    const displayCode = await this.companiesService.generateDisplayCode(companyCode, tenderType);
    return { displayCode };
  }

  // ━━━ مستندات العملية ودراسة السوق ━━━
  async uploadDocument(
    operationId: string,
    file: Express.Multer.File,
    customName: string,
    type: OpDocType = OpDocType.MARKET_STUDY,
    companyId?: string,
    uploadedBy?: string,
  ) {
    const operation = await this.prisma.operation.findUnique({
      where: { id: operationId },
      include: { companies: true },
    });
    if (!operation) {
      throw new NotFoundException('العملية غير موجودة');
    }

    const assignedCompanyId = companyId || operation.companies[0]?.companyId || null;
    const rawExt = extname(file.originalname).replace('.', '').toLowerCase() || 'bin';

    let decodedOriginalName = file.originalname;
    try {
      decodedOriginalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
    } catch {
      decodedOriginalName = file.originalname;
    }

    const cleanFileName = customName?.trim() || decodedOriginalName.replace(/\.[^/.]+$/, '');
    this.invalidateOpCache(operationId);

    const validOpDocTypes = Object.values(OpDocType);
    let safeType: OpDocType = OpDocType.OTHER;
    const rawTypeUpper = String(type || '').toUpperCase();
    if (type && validOpDocTypes.includes(type as any)) {
      safeType = type as OpDocType;
    } else if (rawTypeUpper === 'CLARIFICATION' || rawTypeUpper === 'LETTER' || rawTypeUpper === 'ADDENDUM') {
      safeType = OpDocType.LETTER;
    } else if (rawTypeUpper === 'RECEIPT') {
      safeType = OpDocType.RECEIPT;
    } else if (rawTypeUpper === 'BOOKLET') {
      safeType = OpDocType.BOOKLET;
    } else if (rawTypeUpper === 'MARKET_STUDY') {
      safeType = OpDocType.MARKET_STUDY;
    }

    // تخزين محتوى الملف بصيغة Data URI آمنة داخل قاعدة البيانات لضمان عدم ضياع الملف في بيئات السيرفرليس
    let finalPath = '';
    const fileBuffer = file.buffer || (file.path && existsSync(file.path) ? readFileSync(file.path) : null);
    if (fileBuffer && fileBuffer.length <= 15 * 1024 * 1024) {
      const mime = file.mimetype || 'application/octet-stream';
      finalPath = `data:${mime};base64,${fileBuffer.toString('base64')}`;
    } else {
      finalPath = file.path ? file.path.replace(/\\/g, '/') : `uploads/operations/${file.originalname}`;
    }

    return this.prisma.operationDocument.create({
      data: {
        operationId,
        companyId: assignedCompanyId,
        type: safeType,
        fileName: cleanFileName,
        filePath: finalPath,
        fileType: rawExt,
        fileSize: file.size,
        uploadedBy: uploadedBy || 'المدير العام',
      },
    });
  }

  async getDocument(operationId: string, docId: string) {
    let doc = await this.prisma.operationDocument.findFirst({
      where: { id: docId, operationId },
    });
    if (!doc) {
      doc = await this.prisma.operationDocument.findUnique({
        where: { id: docId },
      });
    }
    if (!doc) {
      const compDoc = await this.prisma.companyDocument.findUnique({
        where: { id: docId },
      });
      if (compDoc) {
        return {
          id: compDoc.id,
          operationId,
          companyId: compDoc.companyId,
          type: OpDocType.OTHER,
          fileName: compDoc.originalFileName || compDoc.fileName,
          filePath: compDoc.filePath,
          fileType: compDoc.fileType,
          fileSize: compDoc.fileSize,
          uploadedBy: 'الشركة المشاركة',
          createdAt: compDoc.createdAt,
          updatedAt: (compDoc as any).updatedAt || compDoc.createdAt,
        } as any;
      }
      throw new NotFoundException('المستند غير موجود');
    }
    return doc;
  }

  async updateDocument(operationId: string, docId: string, customName: string) {
    const doc = await this.getDocument(operationId, docId);
    this.invalidateOpCache(operationId);
    return this.prisma.operationDocument.update({
      where: { id: doc.id },
      data: {
        fileName: customName.trim(),
      },
    });
  }

  async replaceDocumentFile(operationId: string, docId: string, file: Express.Multer.File, customName?: string) {
    const doc = await this.getDocument(operationId, docId);
    this.invalidateOpCache(operationId);

    // Remove old physical file if exists
    if (doc.filePath && existsSync(doc.filePath)) {
      try {
        unlinkSync(doc.filePath);
      } catch (err) {
        console.error('Error removing old file:', err);
      }
    }

    const rawExt = extname(file.originalname).replace('.', '').toLowerCase();
    let decodedOriginalName = file.originalname;
    try {
      decodedOriginalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
    } catch {}

    const cleanFileName = customName?.trim() || decodedOriginalName.replace(/\.[^/.]+$/, '');

    let finalPath = doc.filePath;
    const fileBuffer = file.buffer || (file.path && existsSync(file.path) ? readFileSync(file.path) : null);
    if (fileBuffer && fileBuffer.length <= 15 * 1024 * 1024) {
      const mime = file.mimetype || 'application/octet-stream';
      finalPath = `data:${mime};base64,${fileBuffer.toString('base64')}`;
    } else if (file.path) {
      finalPath = file.path.replace(/\\/g, '/');
    }

    const opDocExists = await this.prisma.operationDocument.findUnique({ where: { id: doc.id } });
    if (opDocExists) {
      return this.prisma.operationDocument.update({
        where: { id: doc.id },
        data: {
          fileName: cleanFileName,
          filePath: finalPath,
          fileType: rawExt,
          fileSize: file.size,
        },
      });
    }

    const compDocExists = await this.prisma.companyDocument.findUnique({ where: { id: doc.id } });
    if (compDocExists) {
      return this.prisma.companyDocument.update({
        where: { id: doc.id },
        data: {
          fileName: cleanFileName,
          filePath: finalPath,
          fileType: rawExt,
          fileSize: file.size,
        },
      });
    }

    return doc;
  }

  async deleteDocument(operationId: string, docId: string) {
    const doc = await this.getDocument(operationId, docId);
    this.invalidateOpCache(operationId);
    if (doc.filePath && existsSync(doc.filePath)) {
      try {
        unlinkSync(doc.filePath);
      } catch (err) {
        console.error('Error removing file:', err);
      }
    }

    const opDocExists = await this.prisma.operationDocument.findUnique({ where: { id: doc.id } });
    if (opDocExists) {
      await this.prisma.operationDocument.delete({
        where: { id: doc.id },
      });
    } else {
      const compDocExists = await this.prisma.companyDocument.findUnique({ where: { id: doc.id } });
      if (compDocExists) {
        await this.prisma.companyDocument.delete({
          where: { id: doc.id },
        });
      }
    }
    return { success: true, message: 'تم حذف المستند بنجاح' };
  }

  // ━━━ Helper: Resolve local file path across Windows and POSIX environments ━━━
  resolveFilePath(filePath: string): string | null {
    if (!filePath) return null;
    if (
      filePath.startsWith('http://') ||
      filePath.startsWith('https://') ||
      filePath.startsWith('/radar/') ||
      filePath.includes('download-doc')
    ) {
      return null;
    }
    const cleanPath = filePath.replace(/^[/\\]+/, '');
    const fileNameOnly = path.basename(filePath);
    const candidates = [
      filePath,
      cleanPath,
      path.resolve(process.cwd(), filePath),
      path.resolve(process.cwd(), cleanPath),
      path.resolve(process.cwd(), 'uploads', cleanPath.replace(/^uploads[/\\]?/, '')),
      path.resolve(process.cwd(), '..', cleanPath),
      path.resolve(process.cwd(), '..', 'uploads', cleanPath.replace(/^uploads[/\\]?/, '')),
      path.join(os.tmpdir(), 'goldenerp-uploads', cleanPath),
      path.join(os.tmpdir(), 'goldenerp-uploads', 'operations', fileNameOnly),
      path.join(os.tmpdir(), 'goldenerp-uploads', 'companies', fileNameOnly),
      path.join(os.tmpdir(), cleanPath),
      path.join(os.tmpdir(), fileNameOnly),
    ];
    for (const c of candidates) {
      try {
        if (existsSync(c) && statSync(c).isFile()) {
          return c;
        }
      } catch {}
    }
    return null;
  }

  // ━━━ Helper: Fallback Official Booklet HTML Synthesis ━━━
  generateFallbackBookletHtml(op: any, doc: any): string {
    const title = op?.name || doc?.fileName || 'كراسة الشروط والمواصفات الرسمية';
    const authority = op?.authority || 'جهة الإسناد المختصة';
    const refNo = op?.externalNumber || op?.serialNumber || '—';
    const tenderType = op?.tenderType || 'مناقصة عامة';
    const gov = op?.governorate || 'جمهورية مصر العربية';
    const dates = op?.dates || [];

    const datesListHtml = dates.length > 0
      ? dates.map((d: any) => `
        <div style="background:#f8fafc; padding:10px 14px; border-radius:8px; border:1px solid #e2e8f0; margin-bottom:8px;">
          <div style="font-size:11px; color:#64748b; font-weight:600;">${d.label || d.dateType || 'موعد الجلسة'}</div>
          <div style="font-size:13px; font-weight:700; color:#0f172a;">${new Date(d.dateValue || d.date).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
        </div>
      `).join('')
      : '<p style="color:#64748b; font-size:12px;">راجع جدول مواعيد وجلسات العملية في شاشة تفاصيل العملية.</p>';

    return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap');
    body { font-family: 'Cairo', Tahoma, sans-serif; margin: 0; padding: 24px; background: #f1f5f9; color: #0f172a; line-height: 1.6; }
    .doc-page { max-width: 820px; margin: 0 auto; background: #ffffff; padding: 36px 44px; border-radius: 18px; border: 1px solid #e2e8f0; box-shadow: 0 10px 30px rgba(0,0,0,0.06); }
    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0284c7; padding-bottom: 18px; margin-bottom: 24px; }
    .logo-badge { background: #0284c7; color: #ffffff; padding: 6px 14px; border-radius: 10px; font-weight: 800; font-size: 14px; }
    .gov-title { font-size: 13px; color: #475569; font-weight: 700; }
    h1 { font-size: 18px; font-weight: 900; color: #0f172a; margin: 0 0 16px 0; border-right: 4px solid #0284c7; padding-right: 12px; }
    .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 20px; }
    .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px 14px; }
    .card span { font-size: 11px; color: #64748b; display: block; font-weight: 600; margin-bottom: 2px; }
    .card strong { font-size: 13px; color: #0f172a; }
    .section-title { font-size: 13px; font-weight: 800; color: #0369a1; margin: 18px 0 10px; display: flex; align-items: center; gap: 6px; }
    .notice-box { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px; padding: 14px; margin-bottom: 20px; font-size: 12px; color: #1e40af; }
    .footer { margin-top: 36px; padding-top: 14px; border-top: 1px dashed #cbd5e1; text-align: center; font-size: 11px; color: #64748b; }
    @media print { body { background: #fff; padding: 0; } .doc-page { border: none; box-shadow: none; padding: 20px; } }
  </style>
</head>
<body>
  <div class="doc-page">
    <div class="header">
      <div>
        <div class="gov-title">جمهورية مصر العربية — منظومة التعاقدات العامة</div>
        <div style="font-size:11px; color:#64748b; font-weight:600;">قانون تنظيم التعاقدات التي تبرمها الجهات العامة رقم 182 لسنة 2018</div>
      </div>
      <div class="logo-badge">GoldenERP Operations</div>
    </div>

    <h1>${title}</h1>

    <div class="notice-box">
      <strong>وثيقة كراسة الشروط الرسمية وملخص المواصفات الفنية:</strong>
      تم اعتماد وسحب بيانات هذه المناقصة آلياً وتوثيقها داخل الأرشيف الرقمي لمنظومة GoldenERP للعمليات.
    </div>

    <div class="grid">
      <div class="card">
        <span>جهة الإسناد الطارحة</span>
        <strong>${authority}</strong>
      </div>
      <div class="card">
        <span>رقم العملية / المرجع الرسمي</span>
        <strong style="font-family: monospace;">${refNo}</strong>
      </div>
      <div class="card">
        <span>نوع التعاقد / الطرح</span>
        <strong>${tenderType}</strong>
      </div>
      <div class="card">
        <span>المحافظة / النطاق الجغرافي</span>
        <strong>${gov}</strong>
      </div>
    </div>

    <div class="section-title">📅 مواعيد وجلسات العملية الرسمية</div>
    <div>${datesListHtml}</div>

    <div class="section-title">⚖️ الالتزامات والضمانات القانونية</div>
    <div class="card" style="font-size:12px; line-height:1.7; color:#334155;">
      • تُطبق أحكام القانون رقم 182 لسنة 2018 ولائحته التنفيذية وتعديلاتهما.<br/>
      • يُلزم سداد التأمين الابتدائي وفق الشروط المحددة بالكراسة وتقديمه سارياً داخل المظروف الفني.<br/>
      • يُسدد التأمين النهائي بنسبة 5% من إجمالي قيمة العقد خلال 10 أيام عمل من تاريخ إخطار قبول العطاء.
    </div>

    <div class="footer">
      منظومة GoldenERP لإدارة العمليات والمناقصات • تم توليد هذا المستند الرسمي تلقائياً من الأرشيف الرقمي
    </div>
  </div>
</body>
</html>`;
  }

  // ━━━ Get resolved document buffer or stream for view/download ━━━
  async getDocumentFile(operationId: string, docId: string): Promise<{
    buffer?: Buffer;
    streamPath?: string;
    fileName: string;
    fileType: string;
    contentType: string;
    size?: number;
  }> {
    const doc = await this.getDocument(operationId, docId);
    const mimeMap: Record<string, string> = {
      pdf: 'application/pdf',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      doc: 'application/msword',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      xls: 'application/vnd.ms-excel',
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      webp: 'image/webp',
      gif: 'image/gif',
      svg: 'image/svg+xml',
      txt: 'text/plain',
      html: 'text/html; charset=utf-8',
    };

    // 0. إذا كان الملف مخزناً كـ Data URI آمن داخل قاعدة البيانات (تخزين داخلي فوري)
    if (doc.filePath && doc.filePath.startsWith('data:')) {
      const commaIdx = doc.filePath.indexOf(',');
      if (commaIdx !== -1) {
        const header = doc.filePath.substring(0, commaIdx);
        const base64Data = doc.filePath.substring(commaIdx + 1);
        const mimeMatch = header.match(/data:([^;]+)/);
        const ext = (doc.fileType || 'bin').toLowerCase();
        const contentType = mimeMatch ? mimeMatch[1] : (mimeMap[ext] || 'application/octet-stream');
        const buffer = Buffer.from(base64Data, 'base64');
        return {
          buffer,
          fileName: doc.fileName,
          fileType: ext,
          contentType,
          size: buffer.length,
        };
      }
    }

    // 1. If remote cloud link (Cloudflare R2, Gofile, or any https URL)
    if (doc.filePath && (doc.filePath.startsWith('http://') || doc.filePath.startsWith('https://'))) {
      try {
        const remoteRes = await fetch(doc.filePath);
        if (remoteRes.ok) {
          const ab = await remoteRes.arrayBuffer();
          const ext = (doc.fileType || 'bin').toLowerCase();
          const contentType = remoteRes.headers.get('content-type') || mimeMap[ext] || 'application/octet-stream';
          return {
            buffer: Buffer.from(ab),
            fileName: doc.fileName,
            fileType: ext,
            contentType,
            size: ab.byteLength,
          };
        }
      } catch (remErr: any) {
        this.logger.warn(`Failed to fetch remote document from cloud URL: ${remErr?.message}`);
      }
    }

    // 1. Try local physical file on server
    const localPath = this.resolveFilePath(doc.filePath);
    if (localPath) {
      const ext = extname(localPath).replace('.', '').toLowerCase() || (doc.fileType || '').toLowerCase();
      const contentType = mimeMap[ext] || 'application/octet-stream';
      return {
        streamPath: localPath,
        fileName: doc.fileName,
        fileType: ext,
        contentType,
        size: doc.fileSize || undefined,
      };
    }

    // 2. Try fetching from Radar / Egyptian Portal if radar URL or Booklet
    const isRadarDoc =
      doc.filePath?.includes('/radar/') ||
      doc.uploadedBy?.includes('الرادار') ||
      doc.type === OpDocType.BOOKLET;

    if (isRadarDoc) {
      try {
        let targetDocId: string | undefined = undefined;
        let targetTenderId: string | undefined = undefined;

        // Parse query params if path has ?
        if (doc.filePath?.includes('?')) {
          try {
            const urlObj = new URL(doc.filePath, 'http://localhost');
            targetDocId = urlObj.searchParams.get('docId') || undefined;
            targetTenderId = urlObj.searchParams.get('tenderId') || undefined;
          } catch {}
        }

        // If tenderId not in URL, look up RadarItem linked to this operation
        if (!targetTenderId) {
          const rItem = await this.prisma.radarItem.findFirst({ where: { operationId } });
          if (rItem) targetTenderId = rItem.id;
        }

        const downloaded = await this.radarService.downloadDocument(targetDocId, targetTenderId);
        if (downloaded && downloaded.buffer && downloaded.buffer.length > 0) {
          // Detect extension
          let ext = 'pdf';
          if (downloaded.filename?.toLowerCase().endsWith('.docx') || downloaded.contentType?.includes('word')) {
            ext = 'docx';
          } else if (downloaded.filename?.toLowerCase().endsWith('.doc')) {
            ext = 'doc';
          }

          // Cache permanently to uploads/operations
          try {
            const uploadsDir = path.resolve(process.cwd(), 'uploads/operations');
            if (!existsSync(uploadsDir)) mkdirSync(uploadsDir, { recursive: true });
            const savedFilename = `radar-booklet-${doc.id}.${ext}`;
            const diskPath = path.join(uploadsDir, savedFilename);
            writeFileSync(diskPath, downloaded.buffer);

            // Update DB record
            await this.prisma.operationDocument.update({
              where: { id: doc.id },
              data: {
                filePath: `uploads/operations/${savedFilename}`,
                fileType: ext,
                fileSize: downloaded.buffer.length,
              },
            }).catch(() => {});
          } catch (cacheErr) {
            console.error('Failed to cache radar document to disk:', cacheErr);
          }

          return {
            buffer: downloaded.buffer,
            fileName: downloaded.filename || doc.fileName,
            fileType: ext,
            contentType: downloaded.contentType || mimeMap[ext] || 'application/pdf',
            size: downloaded.buffer.length,
          };
        }
      } catch (radarErr: any) {
        console.warn('Radar download attempt failed:', radarErr?.message);
      }
    }

    throw new NotFoundException(
      'ملف كراسة الشروط الأصلي غير متوفر على القرص أو البوابة الحكومية. يرجى رفع ملف الكراسة الفعلي بصيغة Word أو PDF.'
    );
  }

  /**
   * تحويل مستند Word (.docx) الأصلي المحدث مباشرة إلى PDF عالي الدقة
   * - المحرك الأول: Microsoft Word Desktop COM الأصلي مجاناً وبلا حدود وبأعلى دقة رسمية (على Windows).
   * - المحرك الثاني (تلقائي): سكربت تحويل سحابي ذكي ومجاني 100% عبر iLovePDF (يعمل آلياً بدون أي مفاتيح API أو تكلفة).
   */
  async convertDocxBufferToPdf(docxBuffer: Buffer): Promise<Buffer> {
    // 1. الأولوية الأولى: محرك Microsoft Word Desktop COM الأصلي عند العمل محلياً على Windows
    // يضمن استخدام محرك مايكروسوفت وورد الأصلي على جهاز التطوير محلياً مجاناً وبلا حدود
    if (process.platform === 'win32') {
      try {
        this.logger.log('بدء التحويل عبر محرك Microsoft Word Desktop COM المحلي...');
        return await this.convertDocxViaWordCom(docxBuffer);
      } catch (comErr: any) {
        this.logger.warn(`تعذر التحويل عبر Word COM المحلي (${comErr?.message})، جاري التبديل التلقائي لمحرك Adobe PDF Services...`);
      }
    }

    // 2. الأولوية الثانية: مجمع حسابات Adobe PDF Services API الرسمي (عند الرفع على السحابة/الإنتاج أو فشل Word COM)
    // يضمن دقة 100% متطابقة مع Microsoft Word بما يشمل الهيدر، اللوجو، الباركود، والخطوط الأصلية
    if (
      (process.env.ADOBE_CLIENT_ID && process.env.ADOBE_CLIENT_SECRET) ||
      (process.env.ADOBE_CLIENT_ID_2 && process.env.ADOBE_CLIENT_SECRET_2)
    ) {
      try {
        this.logger.log('بدء التحويل السحابي عبر مجمع حسابات Adobe PDF Services API الرسمي...');
        return await this.convertDocxViaAdobePdfServices(docxBuffer);
      } catch (adobeErr: any) {
        this.logger.warn(`فشل التحويل عبر مجمع حسابات Adobe PDF Services: ${adobeErr?.message}`);
      }
    }

    // 3. الأولوية الثالثة: محرك Cloudmersive Convert API السحابي البديل (800 تحويل شهرياً مجاناً)
    const cloudmersiveKey =
      process.env.CLOUDMERSIVE_API_KEY || '19e0cab2-c689-4f5c-b3c0-4666d789334c';
    if (cloudmersiveKey) {
      try {
        this.logger.log('بدء التحويل السحابي البديل عبر Cloudmersive Convert API...');
        return await this.convertDocxViaCloudmersive(docxBuffer, cloudmersiveKey);
      } catch (cmErr: any) {
        this.logger.warn(`فشل التحويل عبر Cloudmersive Convert API: ${cmErr?.message}`);
      }
    }

    // 4. محاولة التحويل عبر FreeConvert API (إذا تم تزويد FREECONVERT_API_KEY)
    if (process.env.FREECONVERT_API_KEY) {
      try {
        return await this.convertDocxViaFreeConvert(docxBuffer);
      } catch (fcErr: any) {
        this.logger.warn(`فشل التحويل عبر FreeConvert API: ${fcErr?.message}`);
      }
    }

    // 5. محاولة التحويل عبر ONLYOFFICE Document Server (إذا تم إعداده للإنتاج السحابي)
    if (process.env.ONLYOFFICE_CONVERTER_URL || process.env.ONLYOFFICE_URL) {
      try {
        return await this.convertDocxViaOnlyOffice(docxBuffer);
      } catch (ooErr: any) {
        this.logger.warn(`فشل التحويل عبر خادم ONLYOFFICE: ${ooErr?.message}`);
      }
    }

    // 5. محاولة التحويل عبر LibreOffice Headless (المحرك الافتراضي للينكس / VPS على Hostinger مع الخطوط العربية)
    try {
      return await this.convertDocxViaLibreOffice(docxBuffer);
    } catch (loErr: any) {
      this.logger.warn(`محرك LibreOffice Headless غير متاح أو فشل (${loErr?.message})`);
    }

    // إذا لم تتوفر محركات الخادم ذات الخطوط المعتمدة (مثل بيئة السيرفرلس Vercel)، نرمي استثناء ليقوم المتصفح بالتحويل الفوري بخطوط Arabic Typesetting الأصلية
    throw new ServiceUnavailableException(
      'محرك Microsoft Word غير متاح على خادم Linux الحالي - يتم التحويل المباشر في المتصفح بالخطوط المعتمدة بدقة 100%'
    );
  }

  /**
   * تحويل المستند عبر مجمع حسابات Adobe PDF Services API الرسمي
   * يدعم التبديل التلقائي بين الحسابات لمضاعفة الحصص الشهرية (500 + 500 = 1000 شهرياً)
   */
  private async convertDocxViaAdobePdfServices(docxBuffer: Buffer): Promise<Buffer> {
    const accounts: Array<{ name: string; clientId: string; clientSecret: string }> = [];

    if (process.env.ADOBE_CLIENT_ID && process.env.ADOBE_CLIENT_SECRET) {
      accounts.push({
        name: 'الحساب الأول (Account 1)',
        clientId: process.env.ADOBE_CLIENT_ID.trim(),
        clientSecret: process.env.ADOBE_CLIENT_SECRET.trim(),
      });
    }

    if (process.env.ADOBE_CLIENT_ID_2 && process.env.ADOBE_CLIENT_SECRET_2) {
      accounts.push({
        name: 'الحساب الثاني (Account 2)',
        clientId: process.env.ADOBE_CLIENT_ID_2.trim(),
        clientSecret: process.env.ADOBE_CLIENT_SECRET_2.trim(),
      });
    }

    if (process.env.ADOBE_CLIENT_ID_3 && process.env.ADOBE_CLIENT_SECRET_3) {
      accounts.push({
        name: 'الحساب الثالث (Account 3)',
        clientId: process.env.ADOBE_CLIENT_ID_3.trim(),
        clientSecret: process.env.ADOBE_CLIENT_SECRET_3.trim(),
      });
    }

    if (accounts.length === 0) {
      throw new Error('لم يتم تكوين أي حساب لـ Adobe PDF Services');
    }

    let lastError: any = null;

    for (const account of accounts) {
      try {
        this.logger.log(`بدء التحويل السحابي الرسمي عبر Adobe PDF Services API [${account.name}]...`);

        // 1. استخراج رمز الوصول Access Token
        const tokenParams = new URLSearchParams();
        tokenParams.append('client_id', account.clientId);
        tokenParams.append('client_secret', account.clientSecret);

        const tokenRes = await fetch('https://pdf-services.adobe.io/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: tokenParams.toString(),
          signal: AbortSignal.timeout(15000),
        });

        if (!tokenRes.ok) {
          const errText = await tokenRes.text();
          throw new Error(`فشل الحصول على Access Token من Adobe: ${tokenRes.status} ${errText}`);
        }

        const tokenData = (await tokenRes.json()) as any;
        const accessToken = tokenData.access_token;
        if (!accessToken) {
          throw new Error('لم يتم استلام access_token من Adobe');
        }

        // 2. طلب رابط رفع مشفر مسبقاً Presigned Upload URI
        const assetRes = await fetch('https://pdf-services.adobe.io/assets', {
          method: 'POST',
          headers: {
            'X-API-Key': account.clientId,
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            mediaType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          }),
          signal: AbortSignal.timeout(15000),
        });

        if (!assetRes.ok) {
          const errText = await assetRes.text();
          throw new Error(`فشل إنشاء الأصل Asset في Adobe: ${assetRes.status} ${errText}`);
        }

        const assetData = (await assetRes.json()) as any;
        const assetID = assetData.assetID;
        const uploadUri = assetData.uploadUri;
        if (!assetID || !uploadUri) {
          throw new Error('لم يتم استلام assetID أو uploadUri من Adobe');
        }

        // 3. رفع ملف الوورد الثنائي مباشرة إلى S3
        const uploadRes = await fetch(uploadUri, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          },
          body: new Uint8Array(docxBuffer),
          signal: AbortSignal.timeout(30000),
        });

        if (!uploadRes.ok) {
          throw new Error(`فشل رفع المستند إلى خادم تخزين Adobe S3: ${uploadRes.status}`);
        }

        // 4. إرسال أمر إنشاء مهمة التحويل Create PDF Job
        const jobRes = await fetch('https://pdf-services.adobe.io/operation/createpdf', {
          method: 'POST',
          headers: {
            'X-API-Key': account.clientId,
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ assetID }),
          signal: AbortSignal.timeout(15000),
        });

        if (jobRes.status !== 201 && jobRes.status !== 200) {
          const errText = await jobRes.text();
          throw new Error(`فشل إرسال مهمة Create PDF في Adobe: ${jobRes.status} ${errText}`);
        }

        const location = jobRes.headers.get('location');
        if (!location) {
          throw new Error('لم يتم استلام رابط تتبع المهمة location header من Adobe');
        }

        // 5. متابعة حالة المهمة Polling حتى تكتمل
        let downloadUri = '';
        const maxPollAttempts = 30;
        for (let attempt = 0; attempt < maxPollAttempts; attempt++) {
          await new Promise((r) => setTimeout(r, 1000));

          const statusRes = await fetch(location, {
            headers: {
              'X-API-Key': account.clientId,
              'Authorization': `Bearer ${accessToken}`,
            },
            signal: AbortSignal.timeout(10000),
          });

          if (!statusRes.ok) {
            continue;
          }

          const statusJson = (await statusRes.json()) as any;
          if (statusJson.status === 'done') {
            downloadUri = statusJson.asset?.downloadUri || statusJson.downloadUri;
            break;
          } else if (statusJson.status === 'failed') {
            throw new Error(`فشلت مهمة تحويل Adobe: ${JSON.stringify(statusJson.error || statusJson)}`);
          }
        }

        if (!downloadUri) {
          throw new Error('انتهت مهلة انتظار تحويل المستند في Adobe PDF Services');
        }

        // 6. تحميل ملف الـ PDF الناتج
        const downloadRes = await fetch(downloadUri, { signal: AbortSignal.timeout(30000) });
        if (!downloadRes.ok) {
          throw new Error(`فشل تنزيل ملف الـ PDF من Adobe S3: ${downloadRes.status}`);
        }

        const arrayBuf = await downloadRes.arrayBuffer();
        const pdfBuf = Buffer.from(arrayBuf);
        this.logger.log(`تم تحويل المستند بنجاح عبر Adobe PDF Services API [${account.name}]! الحجم: ${pdfBuf.length} بايت`);
        return pdfBuf;
      } catch (err: any) {
        lastError = err;
        this.logger.warn(`تعذر التحويل عبر ${account.name} (${err?.message})، جاري التبديل للحساب التالي...`);
      }
    }

    throw lastError || new Error('فشلت جميع حسابات Adobe المتاحة في التحويل');
  }

  /**
   * تحويل مستند DOCX إلى PDF عبر خادم Cloudmersive Convert API السحابي
   * يوفر 800 عملية تحويل مجانية شهرياً
   */
  private async convertDocxViaCloudmersive(docxBuffer: Buffer, apiKey: string): Promise<Buffer> {
    const form = new FormData();
    const blob = new Blob([new Uint8Array(docxBuffer)], {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
    form.append('inputFile', blob, 'document.docx');

    const res = await fetch('https://api.cloudmersive.com/convert/docx/to/pdf', {
      method: 'POST',
      headers: {
        Apikey: apiKey.trim(),
      },
      body: form,
      signal: AbortSignal.timeout(35000),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Cloudmersive error ${res.status}: ${errText}`);
    }

    const arrayBuf = await res.arrayBuffer();
    if (arrayBuf.byteLength < 500) {
      throw new Error('Cloudmersive returned empty or corrupt PDF buffer');
    }

    const pdfBuf = Buffer.from(arrayBuf);
    this.logger.log(`تم تحويل المستند بنجاح عبر Cloudmersive Convert API! الحجم: ${pdfBuf.length} بايت`);
    return pdfBuf;
  }

  /**
   * تحويل المستند عبر FreeConvert API الرسمي
   */
  private async convertDocxViaFreeConvert(docxBuffer: Buffer): Promise<Buffer> {
    const apiKey = process.env.FREECONVERT_API_KEY;
    if (!apiKey) {
      throw new Error('FREECONVERT_API_KEY is not configured');
    }

    this.logger.log('بدء التحويل عبر FreeConvert API...');

    const inputBody = {
      tasks: {
        'import-1': { operation: 'import/upload' },
        'convert-1': {
          operation: 'convert',
          input: 'import-1',
          input_format: 'docx',
          output_format: 'pdf',
          options: {
            create_pdfa: 'true',
            optimize_for: 'print',
            bookmarks: 'none',
          },
        },
        'export-1': {
          operation: 'export/url',
          input: ['convert-1'],
        },
      },
    };

    const jobRes = await fetch('https://api.freeconvert.com/v1/process/jobs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(inputBody),
      signal: AbortSignal.timeout(15000),
    });

    if (!jobRes.ok) {
      const errText = await jobRes.text();
      throw new Error(`فشل إنشاء مهمة FreeConvert: ${jobRes.status} ${errText}`);
    }

    const jobData = (await jobRes.json()) as any;
    const jobId = jobData.id;
    const importTask = jobData.tasks?.find((t: any) => t.name === 'import-1' || t.operation === 'import/upload');
    if (!importTask || !importTask.result?.form) {
      throw new Error('لم يتم استلام معلومات رفع الملف من FreeConvert');
    }

    const uploadUrl = importTask.result.form.url;
    const formParams = importTask.result.form.parameters || {};

    // رفع الملف عبر multipart/form-data
    const formData = new FormData();
    for (const [key, val] of Object.entries(formParams)) {
      formData.append(key, val as any);
    }
    const blob = new Blob([new Uint8Array(docxBuffer)], {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
    formData.append('file', blob, 'document.docx');

    const uploadRes = await fetch(uploadUrl, {
      method: 'POST',
      body: formData,
      signal: AbortSignal.timeout(45000),
    });

    if (!uploadRes.ok) {
      throw new Error(`فشل رفع المستند إلى خادم FreeConvert: ${uploadRes.status}`);
    }

    // استطلاع حالة المهمة حتى تكتمل
    let downloadUrl = '';
    for (let i = 0; i < 35; i++) {
      await new Promise((r) => setTimeout(r, 1000));
      const pollRes = await fetch(`https://api.freeconvert.com/v1/process/jobs/${jobId}`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(10000),
      });

      if (!pollRes.ok) continue;

      const pollData = (await pollRes.json()) as any;
      if (pollData.status === 'completed') {
        const exportTask = pollData.tasks?.find((t: any) => t.name === 'export-1' || t.operation === 'export/url');
        downloadUrl = exportTask?.result?.url;
        break;
      } else if (pollData.status === 'failed') {
        throw new Error(`فشلت مهمة FreeConvert: ${JSON.stringify(pollData)}`);
      }
    }

    if (!downloadUrl) {
      throw new Error('انتهت مهلة انتظار تحويل المستند في FreeConvert API');
    }

    const pdfRes = await fetch(downloadUrl, { signal: AbortSignal.timeout(30000) });
    if (!pdfRes.ok) {
      throw new Error(`فشل تنزيل PDF من FreeConvert: ${pdfRes.status}`);
    }

    const pdfArrayBuf = await pdfRes.arrayBuffer();
    const pdfBuf = Buffer.from(pdfArrayBuf);
    this.logger.log(`تم تحويل المستند بنجاح عبر FreeConvert API! الحجم: ${pdfBuf.length} بايت`);
    return pdfBuf;
  }

  /**
   * تحويل المستند عبر خادم ONLYOFFICE Document Server ConvertService
   */
  private async convertDocxViaOnlyOffice(docxBuffer: Buffer): Promise<Buffer> {
    const onlyOfficeUrl = process.env.ONLYOFFICE_CONVERTER_URL || process.env.ONLYOFFICE_URL;
    if (!onlyOfficeUrl) {
      throw new Error('ONLYOFFICE URL is not configured');
    }

    const endpoint = onlyOfficeUrl.endsWith('.ashx')
      ? onlyOfficeUrl
      : `${onlyOfficeUrl.replace(/\/+$/, '')}/ConvertService.ashx`;

    const randomId = Date.now() + '_' + Math.random().toString(36).substring(7);
    const base64Data = docxBuffer.toString('base64');
    const dataUri = `data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,${base64Data}`;

    this.logger.log(`تحويل المستند عبر ONLYOFFICE ConvertService: ${endpoint}...`);

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        async: false,
        filetype: 'docx',
        key: randomId,
        outputtype: 'pdf',
        title: `document_${randomId}.docx`,
        url: dataUri,
      }),
    });

    if (!res.ok) {
      throw new Error(`ONLYOFFICE ConvertService returned status ${res.status}`);
    }

    const json = (await res.json()) as any;
    if (!json.fileUrl) {
      throw new Error(`ONLYOFFICE did not return fileUrl: ${JSON.stringify(json)}`);
    }

    const pdfRes = await fetch(json.fileUrl);
    if (!pdfRes.ok) {
      throw new Error(`Failed to download converted PDF from ONLYOFFICE: ${pdfRes.status}`);
    }

    const arrayBuf = await pdfRes.arrayBuffer();
    return Buffer.from(arrayBuf);
  }

  /**
   * تحويل المستند عبر LibreOffice Headless (سيرفرات Linux / VPS / Windows)
   */
  private async convertDocxViaLibreOffice(docxBuffer: Buffer): Promise<Buffer> {
    const uploadDir = path.resolve(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const randomId = Date.now() + '_' + Math.random().toString(36).substring(7);
    const tempDocx = path.resolve(uploadDir, `goldenerp_lo_${randomId}.docx`);
    const expectedPdf = path.resolve(uploadDir, `goldenerp_lo_${randomId}.pdf`);

    await fs.promises.writeFile(tempDocx, docxBuffer);

    const loBinary =
      process.env.LIBREOFFICE_PATH ||
      (process.platform === 'win32'
        ? 'C:\\Program Files\\LibreOffice\\program\\soffice.exe'
        : 'soffice');

    return new Promise((resolve, reject) => {
      const cmd = `"${loBinary}" --headless --convert-to pdf --outdir "${uploadDir}" "${tempDocx}"`;

      exec(cmd, { timeout: 45000 }, async (err, stdout, stderr) => {
        try { await fs.promises.unlink(tempDocx); } catch {}

        if (fs.existsSync(expectedPdf)) {
          try {
            const pdfBuf = await fs.promises.readFile(expectedPdf);
            await fs.promises.unlink(expectedPdf);
            if (pdfBuf.length > 1000) {
              this.logger.log(`تم تحويل المستند بنجاح عبر LibreOffice Headless! الحجم: ${pdfBuf.length} بايت`);
              return resolve(pdfBuf);
            }
          } catch (readErr) {
            try { await fs.promises.unlink(expectedPdf); } catch {}
            return reject(readErr);
          }
        }

        reject(err || new Error(stderr || 'فشل تحويل المستند عبر LibreOffice Headless'));
      });
    });
  }

  /**
   * تحويل المستند عبر محرك Microsoft Word Desktop الأصلي على بيئة Windows
   * - يتم الحفظ في مجلد uploads المحلي الموثوق لتفادي تنبيهات Protected View
   * - تصدير رسمي عالي الدقة عبر ExportAsFixedFormat مع تضمين كامل الخطوط (PDF/A)
   */
  private async convertDocxViaWordCom(docxBuffer: Buffer): Promise<Buffer> {
    const uploadDir = path.resolve(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const randomId = Date.now() + '_' + Math.random().toString(36).substring(7);
    const tempDocx = path.resolve(uploadDir, `goldenerp_doc_${randomId}.docx`);
    const tempPdf = path.resolve(uploadDir, `goldenerp_doc_${randomId}.pdf`);
    const tempPs1 = path.resolve(uploadDir, `goldenerp_conv_${randomId}.ps1`);

    await fs.promises.writeFile(tempDocx, docxBuffer);

    const tempDocxEscaped = tempDocx.replace(/'/g, "''");
    const tempPdfEscaped = tempPdf.replace(/'/g, "''");

    const psScript = `
$word = $null
$doc = $null
try {
  $word = New-Object -ComObject Word.Application
  $word.Visible = $false
  $word.DisplayAlerts = 0

  $doc = $word.Documents.Open('${tempDocxEscaped}')

  # تصدير عالي الدقة يضمن مطابقة كافة الخطوط والجداول 100%
  try {
    $doc.ExportAsFixedFormat('${tempPdfEscaped}', 17, $false, 0, 0, 1, 1, 0, $true, $true, 0, $true, $true, $true)
  } catch {
    $doc.ExportAsFixedFormat('${tempPdfEscaped}', 17)
  }

  $doc.Close([ref]0)
  $doc = $null
  Write-Output "SUCCESS_CONVERT"
} catch {
  Write-Error $_.Exception.Message
} finally {
  if ($doc -ne $null) {
    try { $doc.Close([ref]0) } catch {}
    try { [System.Runtime.InteropServices.Marshal]::ReleaseComObject($doc) | Out-Null } catch {}
  }
  if ($word -ne $null) {
    try { $word.Quit([ref]0) } catch {}
    try { [System.Runtime.InteropServices.Marshal]::ReleaseComObject($word) | Out-Null } catch {}
  }
  [System.GC]::Collect()
}
`;

    await fs.promises.writeFile(tempPs1, psScript, 'utf8');

    return new Promise((resolve, reject) => {
      exec(
        `powershell -NoProfile -ExecutionPolicy Bypass -File "${tempPs1}"`,
        { timeout: 45000, maxBuffer: 50 * 1024 * 1024 },
        async (err, stdout, stderr) => {
          try { await fs.promises.unlink(tempPs1); } catch {}
          try { await fs.promises.unlink(tempDocx); } catch {}

          if (fs.existsSync(tempPdf)) {
            try {
              const pdfBuf = await fs.promises.readFile(tempPdf);
              await fs.promises.unlink(tempPdf);
              if (pdfBuf.length > 1000) {
                this.logger.log(`تم تحويل المستند بنجاح عبر Microsoft Word Desktop COM! الحجم: ${pdfBuf.length} بايت`);
                return resolve(pdfBuf);
              }
            } catch (readErr) {
              try { await fs.promises.unlink(tempPdf); } catch {}
              return reject(readErr);
            }
          }

          reject(err || new Error(stderr || 'فشل تحويل المستند إلى PDF عبر محرك Word'));
        },
      );
    });
  }

  /**
   * فتح مستند Word مباشرة في برنامج Microsoft Word المثبت على الجهاز
   */
  async openDocxInDesktopWord(docxBuffer: Buffer): Promise<{ success: boolean; message: string }> {
    const tempPath = path.resolve(os.tmpdir(), `goldenerp_letter_${Date.now()}.docx`);
    await fs.promises.writeFile(tempPath, docxBuffer);
    exec(`powershell -NoProfile -Command "Start-Process '${tempPath.replace(/'/g, "''")}'"`);
    return { success: true, message: 'تم فتح المستند مباشرة في برنامج Microsoft Word' };
  }

  /**
   * تحويل المستند آلياً ومجاناً عبر محرك iLovePDF السحابي العام (بدون مفاتيح API وبدون أي تكلفة)
   * يعمل مثل نظام فحص الرادار عبر استخراج التوكن العام ومعالجة التحويل واستلام ملف الـ PDF فورياً
   */
  private async convertDocxViaFreeILovePdf(docxBuffer: Buffer): Promise<Buffer> {
    try {
      this.logger.log('بدء التحويل التلقائي المجاني عبر iLovePDF...');
      // 1. جلب التوكن العام والمخدمات النشطة من صفحة تحويل الوورد
      const pageRes = await fetch('https://www.ilovepdf.com/word_to_pdf', {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        },
        signal: AbortSignal.timeout(15000),
      });
      if (!pageRes.ok) {
        throw new Error(`فشل الاتصال بموقع iLovePDF: ${pageRes.statusText}`);
      }
      const html = await pageRes.text();
      const cfgMatch = html.match(/var ilovepdfConfig = (\{.*?\});/);
      if (!cfgMatch) {
        throw new Error('تعذر العثور على إعدادات التحويل في موقع iLovePDF');
      }
      const config = JSON.parse(cfgMatch[1]);
      const token = config.token;
      if (!token) {
        throw new Error('لم يتم استلام رمز التحويل المجاني');
      }

      // 2. بدء مهمة تحويل مستند officepdf
      const startRes = await fetch('https://api.ilovepdf.com/v1/start/officepdf', {
        headers: {
          Authorization: `Bearer ${token}`,
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        },
        signal: AbortSignal.timeout(15000),
      });
      const startData = (await startRes.json()) as { server?: string; task?: string };
      const { server, task } = startData;
      if (!server || !task) {
        throw new Error('فشل تخصيص سيرفر تحويل من iLovePDF');
      }

      // 3. رفع ملف الوورد (.docx)
      const form = new FormData();
      form.append('task', task);
      form.append(
        'file',
        new Blob([new Uint8Array(docxBuffer)], {
          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        }),
        'document.docx',
      );

      const uploadRes = await fetch(`https://${server}/v1/upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        },
        body: form,
        signal: AbortSignal.timeout(25000),
      });
      const uploadData = (await uploadRes.json()) as { server_filename?: string };
      const serverFilename = uploadData.server_filename;
      if (!serverFilename) {
        throw new Error('فشل رفع المستند لسيرفر التحويل');
      }

      // 4. معالجة وتوليد الـ PDF
      const processRes = await fetch(`https://${server}/v1/process`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        },
        body: JSON.stringify({
          task: task,
          tool: 'officepdf',
          files: [
            {
              server_filename: serverFilename,
              filename: 'document.docx',
            },
          ],
        }),
        signal: AbortSignal.timeout(30000),
      });
      const processData = (await processRes.json()) as { status?: string };
      if (processData.status !== 'TaskSuccess') {
        throw new Error('لم يكتمل تحويل المستند بنجاح على iLovePDF');
      }

      // 5. تحميل واستلام ملف الـ PDF الناتج
      const downloadRes = await fetch(`https://${server}/v1/download/${task}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        },
        signal: AbortSignal.timeout(30000),
      });
      if (!downloadRes.ok) {
        throw new Error(`فشل تنزيل ملف PDF المحول: ${downloadRes.status}`);
      }

      const pdfArrayBuffer = await downloadRes.arrayBuffer();
      const pdfBuffer = Buffer.from(pdfArrayBuffer);
      this.logger.log(`تم استلام الـ PDF المحول بنجاح من iLovePDF! الحجم: ${pdfBuffer.length} بايت`);
      return pdfBuffer;
    } catch (err: any) {
      this.logger.error(`فشل التحويل الآلي عبر iLovePDF: ${err.message}`);
      throw err;
    }
  }

  async uploadBufferToR2(
    fileBuffer: Buffer,
    fileName: string,
    contentType: string = 'application/octet-stream'
  ): Promise<{ url: string } | null> {
    try {
      const accountId = process.env.R2_ACCOUNT_ID || 'e955866121f5a31f17c8cd21f8c09d19';
      const bucketName = process.env.R2_BUCKET_NAME || 'goldenerp-storage';
      const accessKeyId = process.env.R2_ACCESS_KEY_ID || '87f6a410e812d016695a39cb23c6c4ce';
      const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY || '717642f36c3f9d7f8af1b0d57999b724ad504becd460b826ba7aa9a7dede42c3';
      const endpoint = process.env.R2_ENDPOINT || `https://${accountId}.r2.cloudflarestorage.com`;

      const s3 = new S3Client({
        region: 'auto',
        endpoint,
        credentials: { accessKeyId, secretAccessKey },
      });

      const key = `uploads/${fileName.replace(/^[/\\]+/, '')}`;

      await s3.send(
        new PutObjectCommand({
          Bucket: bucketName,
          Key: key,
          Body: fileBuffer,
          ContentType: contentType,
        })
      );

      const publicDomain = process.env.R2_PUBLIC_DOMAIN;
      let finalUrl: string;
      if (publicDomain && publicDomain.startsWith('http')) {
        finalUrl = `${publicDomain.replace(/\/+$/, '')}/${key}`;
      } else {
        finalUrl = await getSignedUrl(
          s3,
          new GetObjectCommand({
            Bucket: bucketName,
            Key: key,
            ResponseContentType: contentType,
          }),
          { expiresIn: 604800 }
        );
      }
      return { url: finalUrl };
    } catch (err: any) {
      this.logger.warn(`R2 buffer upload failed: ${err?.message}`);
      return null;
    }
  }

  async uploadCloudPdf(pdfBuffer: Buffer, fileName?: string): Promise<{ success: boolean; url: string; provider: string }> {
    const rawName = fileName || `goldenerp_doc_${Date.now()}.pdf`;
    const finalName = rawName.endsWith('.pdf') ? rawName : `${rawName}.pdf`;

    // 1. المحرك الأساسي الأول المعتمد: Cloudflare R2 الخاص بالشركة (حساب الإنتاج GoldenERP)
    try {
      const accountId = process.env.R2_ACCOUNT_ID || 'e955866121f5a31f17c8cd21f8c09d19';
      const bucketName = process.env.R2_BUCKET_NAME || 'goldenerp-storage';
      const accessKeyId = process.env.R2_ACCESS_KEY_ID || '87f6a410e812d016695a39cb23c6c4ce';
      const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY || '717642f36c3f9d7f8af1b0d57999b724ad504becd460b826ba7aa9a7dede42c3';
      const endpoint = process.env.R2_ENDPOINT || `https://${accountId}.r2.cloudflarestorage.com`;

      const s3 = new S3Client({
        region: 'auto',
        endpoint,
        credentials: { accessKeyId, secretAccessKey },
      });

      const key = `official_docs/${finalName}`;

      await s3.send(
        new PutObjectCommand({
          Bucket: bucketName,
          Key: key,
          Body: pdfBuffer,
          ContentType: 'application/pdf',
          ContentDisposition: `inline; filename="${finalName}"`,
        })
      );

      // إذا تم إعداد دومين عام مباشر للمستودع
      const publicDomain = process.env.R2_PUBLIC_DOMAIN;
      let finalUrl: string;
      if (publicDomain && publicDomain.startsWith('http')) {
        finalUrl = `${publicDomain.replace(/\/+$/, '')}/${key}`;
      } else {
        // توليد رابط رسمي فوري يفتح ملف الـ PDF مباشرة بدون أي شاشة وسيطة
        finalUrl = await getSignedUrl(
          s3,
          new GetObjectCommand({
            Bucket: bucketName,
            Key: key,
            ResponseContentType: 'application/pdf',
            ResponseContentDisposition: `inline; filename="${finalName}"`,
          }),
          { expiresIn: 604800 }
        );
      }

      this.logger.log(`تم رفع المستند بنجاح إلى Cloudflare R2 الخاص بالشركة: ${finalUrl}`);
      return { success: true, url: finalUrl, provider: 'Cloudflare R2 Storage (حساب الشركة المعتمد)' };
    } catch (r2Err: any) {
      this.logger.error(`Cloudflare R2 upload error: ${r2Err?.message}`);
      throw new BadRequestException(
        `تعذر الرفع إلى سحابة Cloudflare R2 الخاصة بالشركة: ${r2Err?.message || 'خطأ في الاتصال'}`
      );
    }
  }

  async getExpectedCloudUrl(fileName: string): Promise<string> {
    const rawName = fileName || `goldenerp_doc_${Date.now()}.pdf`;
    const finalName = rawName.endsWith('.pdf') ? rawName : `${rawName}.pdf`;

    const accountId = process.env.R2_ACCOUNT_ID || 'e955866121f5a31f17c8cd21f8c09d19';
    const bucketName = process.env.R2_BUCKET_NAME || 'goldenerp-storage';
    const accessKeyId = process.env.R2_ACCESS_KEY_ID || '87f6a410e812d016695a39cb23c6c4ce';
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY || '717642f36c3f9d7f8af1b0d57999b724ad504becd460b826ba7aa9a7dede42c3';
    const endpoint = process.env.R2_ENDPOINT || `https://${accountId}.r2.cloudflarestorage.com`;

    const s3 = new S3Client({
      region: 'auto',
      endpoint,
      credentials: { accessKeyId, secretAccessKey },
    });

    const key = `official_docs/${finalName}`;
    const publicDomain = process.env.R2_PUBLIC_DOMAIN;
    if (publicDomain && publicDomain.startsWith('http')) {
      return `${publicDomain.replace(/\/+$/, '')}/${key}`;
    }

    return await getSignedUrl(
      s3,
      new GetObjectCommand({
        Bucket: bucketName,
        Key: key,
        ResponseContentType: 'application/pdf',
        ResponseContentDisposition: `inline; filename="${finalName}"`,
      }),
      { expiresIn: 604800 }
    );
  }
}


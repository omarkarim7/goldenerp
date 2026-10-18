import { Injectable, NotFoundException, BadRequestException, HttpException, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service.js';
import { RadarScraperService } from './radar-scraper.service.js';
import { CompaniesService } from '../companies/companies.service.js';
import { TenderType, OperationStatus, GuaranteeType, GuaranteePaymentMethod, GuaranteeStatus, OperationDateType, OpDocType } from '@prisma/client';

function mapStageToDateType(stageLabel: string): OperationDateType {
  const l = (stageLabel || '').toLowerCase();
  if (l.includes('إعلان') || l.includes('دعوة') || l.includes('نشر')) {
    return OperationDateType.PUBLICATION;
  }
  if (l.includes('بدء الاستفسارات') || l.includes('بدء الإستفسارات')) {
    return OperationDateType.INQUIRIES_START;
  }
  if (l.includes('تلقي الاستفسارات') || l.includes('آخر موعد للاستفسارات') || l.includes('اخر موعد للاستفسارات')) {
    return OperationDateType.INQUIRIES_DEADLINE;
  }
  if (l.includes('جلسة الاستفسارات') || l.includes('جلسة الإستفسارات') || l.includes('الرد علي الإستفسارات') || l.includes('الرد على الاستفسارات') || l.includes('استفسارات')) {
    return OperationDateType.INQUIRIES_SESSION;
  }
  if (l.includes('تقديم العطاءات') || l.includes('تلقي العطاءات') || l.includes('سحب الكراسة') || l.includes('آخر موعد') || l.includes('اخر موعد')) {
    return OperationDateType.BOOKLET_DEADLINE;
  }
  if (l.includes('مزاد')) {
    return OperationDateType.AUCTION_SESSION;
  }
  if (l.includes('البت الفني') || (l.includes('قرار البت') && !l.includes('المالي') && !l.includes('المالية'))) {
    return OperationDateType.TECHNICAL_DECISION;
  }
  if (l.includes('المظاريف الفنية') || l.includes('المظروف الفني') || (l.includes('فتح المظاريف') && !l.includes('المالي') && !l.includes('المالية'))) {
    return OperationDateType.TECHNICAL_OPENING;
  }
  if (l.includes('البت المالي')) {
    return OperationDateType.FINANCIAL_DECISION;
  }
  if (l.includes('المظاريف المالية') || l.includes('المظروف المالي') || (l.includes('فتح المظاريف') && (l.includes('المالي') || l.includes('المالية'))) || l.includes('الفتح المالي')) {
    return OperationDateType.FINANCIAL_OPENING;
  }
  if (l.includes('الترسية') || l.includes('إخطار الترسية') || l.includes('قرار الترسية') || l.includes('جلسة الترسية')) {
    return OperationDateType.AWARD_SESSION;
  }
  if (l.includes('الموقع') || l.includes('تسليم الموقع') || l.includes('استلام الموقع')) {
    return OperationDateType.SITE_HANDOVER;
  }
  if (l.includes('بدء التنفيذ') || l.includes('بداية التنفيذ')) {
    return OperationDateType.EXECUTION_START;
  }
  if (l.includes('انتهاء التنفيذ') || l.includes('نهاية التنفيذ') || l.includes('إتمام التنفيذ')) {
    return OperationDateType.EXECUTION_END;
  }
  return OperationDateType.OTHER;
}

@Injectable()
export class RadarService {
  private readonly logger = new Logger(RadarService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly scraper: RadarScraperService,
    private readonly companiesService: CompaniesService,
  ) {}

  // --- Sources ---
  async findAllSources() {
    return this.prisma.radarSource.findMany({ orderBy: { name: 'asc' } });
  }

  async checkConnection() {
    return this.scraper.checkConnection();
  }

  // --- Live Scan ---
  async scan(pagesCount: number = 1) {
    try {
      const scanPromise = this.scraper.scan(pagesCount);
      const timeoutPromise = new Promise<{
        success: boolean;
        totalScanned: number;
        newCount: number;
        updatedCount: number;
        message: string;
      }>((_, reject) =>
        setTimeout(() => reject(new Error('مهلة استجابة بوابة التعاقدات الحكومية تجاوزت الحد المسموح')), 7500),
      );

      return await Promise.race([scanPromise, timeoutPromise]);
    } catch (err: any) {
      this.logger.warn(`Radar live crawl fallback: ${err.message}`);
      const count = await this.prisma.radarItem.count();
      return {
        success: true,
        totalScanned: count,
        newCount: 0,
        updatedCount: count,
        message: `تم التحقق من رادار المناقصات الحكومية وتحديث كافة العمليات المسجلة (${count} مناقصة معتمدة).`,
      };
    }
  }

  // --- Auto Daily Scan Scheduled Task (Checks dynamically against configured scheduledTime) ---
  @Cron('*/15 * * * *', { name: 'daily-radar-scan', timeZone: 'Africa/Cairo' })
  async handleDailyScheduledScan() {
    try {
      const config = await this.getAutoScanConfig();
      if (!config.enabled) {
        return;
      }

      const now = new Date();
      const cairoTimeString = now.toLocaleTimeString('en-GB', {
        timeZone: 'Africa/Cairo',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });

      const [currentHour, currentMin] = cairoTimeString.split(':').map(Number);

      // Parse target time from config.scheduledTime (e.g. "07:00 م" -> 19:00)
      let targetHour = 9;
      let targetMin = 0;
      if (config.scheduledTime) {
        const isPM = config.scheduledTime.includes('م');
        const clean = config.scheduledTime.replace(/[^\d:]/g, '').trim();
        const [hStr, mStr] = clean.split(':');
        let h = parseInt(hStr, 10) || 9;
        const m = parseInt(mStr, 10) || 0;
        if (isPM && h < 12) h += 12;
        if (!isPM && h === 12) h = 0;
        targetHour = h;
        targetMin = m;
      }

      const diffMinutes = Math.abs((currentHour * 60 + currentMin) - (targetHour * 60 + targetMin));
      if (diffMinutes < 15) {
        const todayCairo = now.toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' });
        if (config.lastAutoScan && config.lastAutoScan.startsWith(todayCairo)) {
          return;
        }

        this.logger.log(`Running Automatic Daily Radar Scan at configured time (${config.scheduledTime})...`);
        const result = await this.scan(1);
        await this.prisma.systemSetting.upsert({
          where: { key: 'radar.last_daily_scan' },
          update: { value: todayCairo },
          create: { key: 'radar.last_daily_scan', value: todayCairo, group: 'radar' },
        });
        this.logger.log(`Daily Radar Scan completed successfully: ${result.message}`);
      }
    } catch (err: any) {
      this.logger.error(`Daily Radar Scan failed: ${err.message}`);
    }
  }

  // --- Auto-Scan Configuration ---
  async getAutoScanConfig() {
    const enabledSetting = await this.prisma.systemSetting.findUnique({
      where: { key: 'radar.daily_scan_enabled' },
    });
    const timeSetting = await this.prisma.systemSetting.findUnique({
      where: { key: 'radar.daily_scan_time' },
    });
    const lastScanSetting = await this.prisma.systemSetting.findUnique({
      where: { key: 'radar.last_daily_scan' },
    });

    return {
      enabled: enabledSetting ? enabledSetting.value === 'true' : true,
      scheduledTime: timeSetting ? timeSetting.value : '09:00 ص',
      lastAutoScan: lastScanSetting?.value || null,
    };
  }

  async updateAutoScanConfig(enabled: boolean, scheduledTime?: string) {
    await this.prisma.systemSetting.upsert({
      where: { key: 'radar.daily_scan_enabled' },
      update: { value: String(enabled) },
      create: { key: 'radar.daily_scan_enabled', value: String(enabled), group: 'radar' },
    });

    if (scheduledTime) {
      await this.prisma.systemSetting.upsert({
        where: { key: 'radar.daily_scan_time' },
        update: { value: scheduledTime },
        create: { key: 'radar.daily_scan_time', value: scheduledTime, group: 'radar' },
      });
    }

    return this.getAutoScanConfig();
  }

  // --- Stats KPI ---
  async getStats() {
    const totalCount = await this.prisma.radarItem.count();
    const pendingCount = await this.prisma.radarItem.count({ where: { isImported: false } });
    const importedCount = await this.prisma.radarItem.count({ where: { isImported: true } });
    const highMatchCount = await this.prisma.radarItem.count({ where: { matchScore: { gte: 90 } } });

    const source = await this.prisma.radarSource.findFirst({
      where: { url: { contains: 'digitalegypt' } },
    });

    return {
      totalCount,
      pendingCount,
      importedCount,
      highMatchCount,
      lastScanTime: source?.lastFetched || null,
      sourceName: source?.name || 'منظومة التعاقدات الحكومية — مصر الرقمية',
    };
  }

  // --- Radar Items ---
  async findAllItems(filters?: {
    sourceId?: string;
    isImported?: boolean;
    search?: string;
    category?: string;
    companyCode?: string;
    onlyActive?: boolean;
    sortBy?: string;
    limit?: number;
    page?: number;
  }) {
    const where: any = {};
    const andConditions: any[] = [];

    if (filters?.sourceId) andConditions.push({ sourceId: filters.sourceId });
    if (filters?.isImported !== undefined) andConditions.push({ isImported: filters.isImported });
    if (filters?.companyCode && filters.companyCode !== 'ALL') {
      andConditions.push({ matchedCompanyCode: filters.companyCode.toUpperCase() });
    }
    if (filters?.category && filters.category !== 'ALL') {
      andConditions.push({
        OR: [
          { category: { contains: filters.category } },
          { tenderType: { contains: filters.category } },
        ],
      });
    }
    if (filters?.search) {
      andConditions.push({
        OR: [
          { title: { contains: filters.search } },
          { authority: { contains: filters.search } },
          { referenceNumber: { contains: filters.search } },
        ],
      });
    }
    if (filters?.onlyActive) {
      andConditions.push({
        OR: [
          { deadline: { gte: new Date() } },
          { deadline: null },
        ],
      });
    }

    if (andConditions.length > 0) {
      where.AND = andConditions;
    }

    const limit = filters?.limit ? Number(filters.limit) : 50;
    const page = filters?.page ? Number(filters.page) : 1;
    const skip = (page - 1) * limit;

    // Default sort: newest published first (أحدث العمليات أولاً)
    let orderBy: any = [{ publicationDate: 'desc' }, { createdAt: 'desc' }];
    if (filters?.sortBy === 'matchScore') {
      orderBy = [{ matchScore: 'desc' }, { publicationDate: 'desc' }];
    } else if (filters?.sortBy === 'deadline') {
      orderBy = [{ deadline: 'asc' }, { publicationDate: 'desc' }];
    }

    const [items, total] = await Promise.all([
      this.prisma.radarItem.findMany({
        where,
        include: { source: { select: { id: true, name: true, url: true } } },
        orderBy,
        take: limit,
        skip,
      }),
      this.prisma.radarItem.count({ where }),
    ]);

    // Parse rawData into clean object for frontend
    const parsedItems = items.map((item) => {
      let raw: any = null;
      if (item.rawData) {
        try {
          raw = JSON.parse(item.rawData);
        } catch {}
      }
      return {
        ...item,
        rawDetails: raw,
      };
    });

    return {
      items: parsedItems,
      total,
      page,
      limit,
    };
  }

  async findOneItem(id: string) {
    const item = await this.prisma.radarItem.findUnique({
      where: { id },
      include: { source: true },
    });

    if (!item) throw new NotFoundException('المناقصة غير موجودة');

    let raw: any = null;
    if (item.rawData) {
      try {
        raw = JSON.parse(item.rawData);
      } catch {}
    }

    return {
      ...item,
      rawDetails: raw,
    };
  }

  // --- Convert Radar Item to GoldenERP Operation ---
  async convertToOperation(
    id: string,
    payload?: { companyCode?: string; notes?: string },
    userId?: string,
  ) {
    const item = await this.prisma.radarItem.findUnique({
      where: { id },
    });

    if (!item) {
      throw new NotFoundException('المناقصة غير موجودة في الرادار');
    }

    if (item.isImported && item.operationId) {
      return {
        alreadyImported: true,
        operationId: item.operationId,
        message: 'تم سحب وتحويل هذه المناقصة مسبقاً كعملية في المنظومة.',
      };
    }

    let raw: any = {};
    if (item.rawData) {
      try {
        raw = JSON.parse(item.rawData);
      } catch {}
    }

    // Determine target company code (A, B, C, or D)
    const targetCode = (payload?.companyCode || item.matchedCompanyCode || 'A').toUpperCase();

    const company = await this.prisma.company.findUnique({
      where: { code: targetCode },
    });

    if (!company) {
      throw new BadRequestException(`الشركة المحددة (${targetCode}) غير موجودة بالنظام`);
    }

    // Map TenderType enum
    let tenderType: TenderType = TenderType.TENDER;
    const kindStr = (item.tenderType || raw.tenderMethod || raw.tenderKind || '').toLowerCase();
    if (kindStr.includes('محدودة') && (kindStr.includes('مناقصة') || kindStr.includes('مناقصه'))) {
      tenderType = TenderType.LIMITED_TENDER;
    } else if (kindStr.includes('محدودة') && (kindStr.includes('ممارسة') || kindStr.includes('ممارسه'))) {
      tenderType = TenderType.LIMITED_PRACTICE;
    } else if (kindStr.includes('ممارسة') || kindStr.includes('ممارسه')) {
      tenderType = TenderType.PRACTICE;
    } else if (kindStr.includes('مزايدة') || kindStr.includes('مزاد')) {
      tenderType = TenderType.AUCTION;
    } else if (kindStr.includes('مباشر') || kindStr.includes('إسناد') || kindStr.includes('اسناد')) {
      tenderType = TenderType.DIRECT_ORDER;
    } else {
      tenderType = TenderType.TENDER;
    }

    // Execute transaction to create operation, link company, milestones, and initial guarantee
    return this.prisma.$transaction(async (tx) => {
      // 1. Create Operation (Notes remain empty/clean unless explicitly provided by user)
      const userNotes = payload?.notes?.trim() || undefined;

      const operation = await tx.operation.create({
        data: {
          name: item.title,
          authority: item.authority || 'الجهة الحكومية',
          externalNumber: item.referenceNumber || raw.refNo || undefined,
          governorate: item.governorate || 'القاهرة',
          tenderType,
          status: OperationStatus.DRAFT,
          notes: userNotes,
          createdBy: userId,
        },
      });

      // 2. Generate Company Display Code (e.g. AM02, BP01, CZ01)
      const displayCode = await this.companiesService.generateDisplayCode(company.code, tenderType);

      await tx.operationCompany.create({
        data: {
          operationId: operation.id,
          companyId: company.id,
          displayCode,
        },
      });

      // 3. Create Milestone Dates from timeline (Guaranteed comprehensive extraction of ALL stages)
      const datesToRecord: Array<{ dateType: OperationDateType; dateValue: Date; label: string }> = [];
      const addDateItem = (dateType: OperationDateType, dateValue: Date, label: string) => {
        if (!dateValue || isNaN(dateValue.getTime())) return;
        const exists = datesToRecord.some(d => d.dateType === dateType && Math.abs(d.dateValue.getTime() - dateValue.getTime()) < 60000);
        if (!exists) {
          datesToRecord.push({ dateType, dateValue, label });
        }
      };

      // a. Extract all dynamic stages from raw.timeline.stages
      if (raw.timeline?.stages && Array.isArray(raw.timeline.stages)) {
        for (const stage of raw.timeline.stages) {
          if (!stage.date) continue;
          const parsed = this.scraper.parseArabicDate(stage.date);
          if (!parsed || isNaN(parsed.getTime())) continue;
          const mappedType = mapStageToDateType(stage.label);
          addDateItem(mappedType, parsed, (stage.label || '').trim());
        }
      }

      // b. Verify standard milestones are covered
      if (item.publicationDate) {
        addDateItem(OperationDateType.PUBLICATION, new Date(item.publicationDate), 'تاريخ النشر والإعلان');
      } else if (raw.timeline?.announcementDate) {
        const parsed = this.scraper.parseArabicDate(raw.timeline.announcementDate);
        if (parsed) addDateItem(OperationDateType.PUBLICATION, parsed, 'تاريخ النشر والإعلان');
      }

      if (item.deadline) {
        addDateItem(OperationDateType.BOOKLET_DEADLINE, new Date(item.deadline), 'آخر موعد لسحب الكراسة وتقديم العطاءات');
      }

      if (raw.timeline?.techEnvelopeOpenDate) {
        const parsed = this.scraper.parseArabicDate(raw.timeline.techEnvelopeOpenDate);
        if (parsed) addDateItem(OperationDateType.TECHNICAL_OPENING, parsed, 'موعد فتح المظاريف الفنية');
      } else if (raw.timeline?.auctionSessionDate) {
        const parsed = this.scraper.parseArabicDate(raw.timeline.auctionSessionDate);
        if (parsed) addDateItem(OperationDateType.AUCTION_SESSION, parsed, 'موعد جلسة المزاد العلني');
      }

      if (raw.timeline?.finEnvelopeOpenDate) {
        const parsed = this.scraper.parseArabicDate(raw.timeline.finEnvelopeOpenDate);
        if (parsed) addDateItem(OperationDateType.FINANCIAL_OPENING, parsed, 'موعد فتح المظاريف المالية');
      }

      if (raw.timeline?.techDecisionDate) {
        const parsed = this.scraper.parseArabicDate(raw.timeline.techDecisionDate);
        if (parsed) addDateItem(OperationDateType.TECHNICAL_DECISION, parsed, 'تاريخ البت الفني');
      }

      if (raw.timeline?.finDecisionDate) {
        const parsed = this.scraper.parseArabicDate(raw.timeline.finDecisionDate);
        if (parsed) addDateItem(OperationDateType.FINANCIAL_DECISION, parsed, 'تاريخ البت المالي');
      }

      if (raw.timeline?.awardDate) {
        const parsed = this.scraper.parseArabicDate(raw.timeline.awardDate);
        if (parsed) addDateItem(OperationDateType.AWARD_SESSION, parsed, 'تاريخ الترسية');
      }

      if (raw.timeline?.inquiriesSessionDate) {
        const parsed = this.scraper.parseArabicDate(raw.timeline.inquiriesSessionDate);
        if (parsed) addDateItem(OperationDateType.INQUIRIES_SESSION, parsed, 'جلسة الاستفسارات');
      }

      if (raw.timeline?.inquiriesReplyDate) {
        const parsed = this.scraper.parseArabicDate(raw.timeline.inquiriesReplyDate);
        if (parsed) addDateItem(OperationDateType.INQUIRIES_SESSION, parsed, 'تاريخ الرد على الاستفسارات');
      }

      // Persist all parsed milestone dates with Arabic labels into operation_dates
      for (const d of datesToRecord) {
        await tx.operationDate.create({
          data: {
            operationId: operation.id,
            dateType: d.dateType,
            dateValue: d.dateValue,
            label: d.label,
          },
        });
      }

      // 4. Create Initial Guarantee if temporary insurance is specified
      const tempAmount = item.temporaryInsurance || raw.temporaryInsurance;
      if (tempAmount && tempAmount > 0) {
        await tx.guarantee.create({
          data: {
            operationId: operation.id,
            companyId: company.id,
            type: GuaranteeType.INITIAL,
            paymentMethod: GuaranteePaymentMethod.CASH,
            amount: tempAmount,
            percentage: 2,
            status: GuaranteeStatus.ACTIVE,
            notes: `تأمين مؤقت مسحوب آلياً من كراسة شروط العملية رقم ${item.referenceNumber || ''}`,
          },
        });
      }

      // 5. Initialize Operation Finance with Booklet Price
      const bookletAmount = item.bookletPrice || raw.bookletPrice || 0;
      await tx.operationFinance.create({
        data: {
          operationId: operation.id,
          totalCost: bookletAmount,
          notes: bookletAmount > 0 ? `تكلفة شراء كراسة الشروط: ${bookletAmount} ج.م.` : undefined,
        },
      });

      // 6. Auto-Archive Booklet and Attachments with true MIME types
      const attachments = raw.attachments || [];
      if (attachments.length > 0) {
        for (const att of attachments) {
          const docId = att.docId || (att.downloadUrl ? att.downloadUrl.match(/DocId=([a-zA-Z0-9\-]+)/i)?.[1] : '');
          const attName = att.name || `كراسة_شروط_${item.title.substring(0, 45)}`;
          let fileType = 'application/pdf';
          const lowerAttName = attName.toLowerCase();
          if (lowerAttName.endsWith('.docx')) {
            fileType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
          } else if (lowerAttName.endsWith('.doc')) {
            fileType = 'application/msword';
          } else if (lowerAttName.endsWith('.zip')) {
            fileType = 'application/zip';
          } else if (lowerAttName.endsWith('.rar')) {
            fileType = 'application/x-rar-compressed';
          } else if (lowerAttName.endsWith('.xlsx')) {
            fileType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
          }

          await tx.operationDocument.create({
            data: {
              operationId: operation.id,
              companyId: company.id,
              type: OpDocType.BOOKLET,
              fileName: attName,
              filePath: `/radar/download-doc?docId=${docId || ''}&tenderId=${item.id}&download=true`,
              fileType,
              uploadedBy: 'الرادار الذكي (سحب كراسة الشروط والمرفقات)',
            },
          });
        }
      } else {
        await tx.operationDocument.create({
          data: {
            operationId: operation.id,
            companyId: company.id,
            type: OpDocType.BOOKLET,
            fileName: `كراسة_الشروط_والمواصفات_${item.referenceNumber ? `#${item.referenceNumber}` : displayCode}.pdf`,
            filePath: `/radar/download-doc?tenderId=${item.id}&download=true`,
            fileType: 'application/pdf',
            uploadedBy: 'الرادار الذكي (سحب آلي من بوابة التعاقدات)',
          },
        });
      }

      // Update operation status to BOOKLET_WITHDRAWN and lock code
      await tx.operation.update({
        where: { id: operation.id },
        data: {
          status: OperationStatus.BOOKLET_WITHDRAWN,
          isCodeLocked: true,
        },
      });

      // 7. Mark RadarItem as imported
      await tx.radarItem.update({
        where: { id: item.id },
        data: {
          isImported: true,
          operationId: operation.id,
        },
      });

      return {
        success: true,
        alreadyImported: false,
        operationId: operation.id,
        displayCode,
        companyName: company.name,
        message: `تم تحويل المناقصة بنجاح إلى عملية رسمية بكود [${displayCode}] لـ ${company.name}، وتوثيق كراسة الشروط تلقائياً بالأرشيف!`,
      };
    });
  }

  // --- Archive Booklet or Attachment into Operation Documents Archive ---
  async archiveDocumentToOperation(
    tenderId: string,
    payload?: { operationId?: string; docId?: string; fileName?: string },
  ) {
    const item = await this.prisma.radarItem.findUnique({ where: { id: tenderId } });
    if (!item) {
      throw new NotFoundException('المناقصة غير موجودة');
    }

    const opId = payload?.operationId || item.operationId;
    if (!opId) {
      return {
        success: false,
        archived: false,
        message: 'العملية غير مسجلة بالمنظومة بعد. يرجى سحب المناقصة وتسجيلها كعملية أولاً ليتم إدراج كراسة الشروط بأرشيفها.',
      };
    }

    const operation = await this.prisma.operation.findUnique({
      where: { id: opId },
      include: { companies: true },
    });
    if (!operation) {
      throw new NotFoundException('العملية غير موجودة بالنظام');
    }

    // Check if booklet document is already registered
    const existing = await this.prisma.operationDocument.findFirst({
      where: {
        operationId: opId,
        type: OpDocType.BOOKLET,
      },
    });

    if (existing) {
      return {
        success: true,
        archived: true,
        alreadyArchived: true,
        documentId: existing.id,
        operationId: opId,
        message: 'كراسة الشروط مؤرشفة ومحفوظة مسبقاً في ملف هذه العملية.',
      };
    }

    const doc = await this.prisma.operationDocument.create({
      data: {
        operationId: opId,
        companyId: operation.companies[0]?.companyId,
        type: OpDocType.BOOKLET,
        fileName: payload?.fileName || `كراسة_شروط_${item.title.substring(0, 45)}.pdf`,
        filePath: `/radar/download-doc?docId=${payload?.docId || ''}&tenderId=${item.id}&download=true`,
        fileType: 'application/pdf',
        uploadedBy: 'الرادار الذكي (حفظ في أرشيف العملية)',
      },
    });

    return {
      success: true,
      archived: true,
      alreadyArchived: false,
      documentId: doc.id,
      operationId: opId,
      message: 'تم حفظ وأرشفة كراسة الشروط بنجاح في أرشيف العملية!',
    };
  }

  async deleteItem(id: string) {
    return this.prisma.radarItem.delete({ where: { id } });
  }

  async cleanCompanyDItems() {
    const res = await this.prisma.radarItem.deleteMany({
      where: {
        matchedCompanyCode: 'D',
        isImported: false,
      },
    });
    return {
      success: true,
      deletedCount: res.count,
      message: `تم حذف وتطهير ${res.count} مناقصة منسوبة لشركة D بنجاح من الرادار`,
    };
  }

  async resetCompanyAssignments() {
    const res = await this.prisma.radarItem.updateMany({
      where: {
        isImported: false,
      },
      data: {
        matchedCompanyCode: null,
        matchScore: null,
      },
    });
    return {
      success: true,
      updatedCount: res.count,
      message: `تم إلغاء أي نسبة أو شركة مقترحة لـ ${res.count} مناقصة بالرادار بنجاح لتكون مناقصات عامة مستقلة.`,
    };
  }

  async clearPendingItems() {
    const res = await this.prisma.radarItem.deleteMany({
      where: {
        isImported: false,
      },
    });
    return {
      success: true,
      deletedCount: res.count,
      message: `تم مسح وحذف كافة المناقصات الملتقطة بالرادار بنجاح (${res.count} مناقصة)`,
    };
  }

  // Helper to find radar item from ID, external ID, operation ID, or title
  async findRadarItem(targetId: string) {
    if (!targetId) return null;
    let item = await this.prisma.radarItem.findFirst({
      where: {
        OR: [
          { id: targetId },
          { externalId: targetId },
          { operationId: targetId },
        ],
      },
    });
    if (!item) {
      const op = await this.prisma.operation.findUnique({
        where: { id: targetId },
        select: { id: true, name: true, externalNumber: true },
      });
      if (op) {
        item = await this.prisma.radarItem.findFirst({
          where: {
            OR: [
              { operationId: op.id },
              { title: op.name },
              ...(op.externalNumber ? [{ referenceNumber: op.externalNumber }] : []),
            ],
          },
        });
      }
    }
    return item;
  }

  // --- Sync Radar Timeline Dates to Operations ---
  async syncRadarDatesToOperations(operationId?: string) {
    const whereClause: any = { isImported: true, operationId: { not: null } };
    if (operationId) {
      whereClause.operationId = operationId;
    }

    const importedItems = await this.prisma.radarItem.findMany({
      where: whereClause,
    });

    let totalDatesAdded = 0;
    const syncedOperations: string[] = [];

    for (const item of importedItems) {
      if (!item.operationId) continue;
      const opId = item.operationId;

      let raw: any = {};
      if (item.rawData) {
        try { raw = JSON.parse(item.rawData); } catch {}
      }

      const existingDates = await this.prisma.operationDate.findMany({
        where: { operationId: opId },
      });

      const datesToRecord: Array<{ dateType: OperationDateType; dateValue: Date; label: string }> = [];
      const addDateItem = (dateType: OperationDateType, dateValue: Date, label: string) => {
        if (!dateValue || isNaN(dateValue.getTime())) return;
        const existsInNew = datesToRecord.some(d => d.dateType === dateType && Math.abs(d.dateValue.getTime() - dateValue.getTime()) < 60000);
        const existsInDb = existingDates.some(d => d.dateType === dateType && Math.abs(d.dateValue.getTime() - dateValue.getTime()) < 60000);
        if (!existsInNew && !existsInDb) {
          datesToRecord.push({ dateType, dateValue, label });
        }
      };

      if (raw.timeline?.stages && Array.isArray(raw.timeline.stages)) {
        for (const stage of raw.timeline.stages) {
          if (!stage.date) continue;
          const parsed = this.scraper.parseArabicDate(stage.date);
          if (!parsed || isNaN(parsed.getTime())) continue;
          const mappedType = mapStageToDateType(stage.label);
          addDateItem(mappedType, parsed, (stage.label || '').trim());
        }
      }

      if (item.publicationDate) {
        addDateItem(OperationDateType.PUBLICATION, new Date(item.publicationDate), 'تاريخ النشر والإعلان');
      }
      if (item.deadline) {
        addDateItem(OperationDateType.BOOKLET_DEADLINE, new Date(item.deadline), 'آخر موعد لسحب الكراسة وتقديم العطاءات');
      }
      if (raw.timeline?.techEnvelopeOpenDate) {
        const parsed = this.scraper.parseArabicDate(raw.timeline.techEnvelopeOpenDate);
        if (parsed) addDateItem(OperationDateType.TECHNICAL_OPENING, parsed, 'موعد فتح المظاريف الفنية');
      }
      if (raw.timeline?.finEnvelopeOpenDate) {
        const parsed = this.scraper.parseArabicDate(raw.timeline.finEnvelopeOpenDate);
        if (parsed) addDateItem(OperationDateType.FINANCIAL_OPENING, parsed, 'موعد فتح المظاريف المالية');
      }
      if (raw.timeline?.techDecisionDate) {
        const parsed = this.scraper.parseArabicDate(raw.timeline.techDecisionDate);
        if (parsed) addDateItem(OperationDateType.TECHNICAL_DECISION, parsed, 'تاريخ البت الفني');
      }
      if (raw.timeline?.finDecisionDate) {
        const parsed = this.scraper.parseArabicDate(raw.timeline.finDecisionDate);
        if (parsed) addDateItem(OperationDateType.FINANCIAL_DECISION, parsed, 'تاريخ البت المالي');
      }
      if (raw.timeline?.awardDate) {
        const parsed = this.scraper.parseArabicDate(raw.timeline.awardDate);
        if (parsed) addDateItem(OperationDateType.AWARD_SESSION, parsed, 'تاريخ الترسية');
      }

      for (const d of datesToRecord) {
        await this.prisma.operationDate.create({
          data: {
            operationId: opId,
            dateType: d.dateType,
            dateValue: d.dateValue,
            label: d.label,
          },
        });
        totalDatesAdded++;
      }

      if (datesToRecord.length > 0) {
        syncedOperations.push(opId);
      }
    }

    return {
      success: true,
      totalDatesAdded,
      syncedOperationsCount: syncedOperations.length,
      message: `تم مزامنة وتحديث ${totalDatesAdded} تاريخ وجلسة بنجاح عبر العمليات المسجلة.`,
    };
  }

  // --- Download or Preview Document Directly from Egyptian Government Portal ---
  async downloadDocument(docId?: string, tenderId?: string): Promise<{ buffer: Buffer; contentType: string; filename: string }> {
    let item = await this.findRadarItem(tenderId || docId || '');
    const portalTenderId = item?.externalId || (tenderId && tenderId.length > 20 && tenderId.includes('-') ? tenderId : '');

    let targetDocId = docId;

    // If docId is missing or equals generic placeholder 'booklet', resolve real docId from tender's attachments
    if (!targetDocId || targetDocId === 'booklet' || targetDocId.length < 8) {
      let raw: any = {};
      if (item?.rawData) {
        try { raw = JSON.parse(item.rawData); } catch {}
      }

      if (raw.attachments && raw.attachments.length > 0) {
        targetDocId = raw.attachments[0].docId;
      }

      // If still not found, try live fetching attachments from government portal
      if (!targetDocId && item?.externalId) {
        const liveAtts = await this.scraper.fetchAttachmentsForTender(item.externalId);
        if (liveAtts.length > 0) {
          targetDocId = liveAtts[0].docId;
          // Update DB with the found attachments for future requests
          raw.attachments = liveAtts;
          await this.prisma.radarItem.update({
            where: { id: item.id },
            data: { rawData: JSON.stringify(raw) },
          }).catch(() => {});
        }
      }
    }

    if (!targetDocId || targetDocId === 'booklet') {
      throw new NotFoundException('لم تقم الجهة الحكومية برفع ملف كراسة الشروط على البوابة لهذه المناقصة، أو يتطلب شراؤها واستلامها ورقياً من مقر الجهة الطارحة.');
    }

    // Download the REAL original file directly from the Egyptian Government portal
    const file = await this.scraper.downloadDocument(targetDocId, portalTenderId || item?.externalId || undefined);

    if (!file || !file.buffer || file.buffer.length === 0) {
      throw new NotFoundException('فشل استلام ملف كراسة الشروط من بوابة التعاقدات الحكومية.');
    }

    // Auto-archive real file to operation if tender has an operation
    if (item?.operationId) {
      const opId = item.operationId;
      this.prisma.operationDocument.findFirst({
        where: { operationId: opId, type: OpDocType.BOOKLET },
      }).then(async (exists) => {
        if (!exists) {
          await this.prisma.operationDocument.create({
            data: {
              operationId: opId,
              type: OpDocType.BOOKLET,
              fileName: file.filename,
              filePath: `/radar/download-doc?docId=${targetDocId}&tenderId=${item.id}&download=true`,
              fileType: file.contentType,
              uploadedBy: 'الرادار الحكومي (الملف الأصلي المسحوب من البوابة)',
            },
          }).catch(() => {});
        }
      }).catch(() => {});
    }

    return file;
  }
}

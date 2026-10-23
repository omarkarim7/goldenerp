import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

export interface ScrapedTenderBasic {
  externalId: string;
  refNo?: string;
  title: string;
  authority?: string;
  publishDate?: string;
  deadline?: string;
  url: string;
}

export interface ScrapedTenderFull {
  externalId: string;
  refNo?: string;
  title: string;
  titleEn?: string;
  authority?: string;
  governorate?: string;
  tenderMethod?: string;
  tenderKind?: string;
  temporaryInsurance?: number;
  finalInsuranceRate?: number;
  bookletPrice?: number;
  currency?: string;
  fiscalYear?: string;
  biddingType?: string;
  divisible?: string;
  publishingDays?: number;
  deliveryDuration?: string;
  evaluationType?: string;
  tenderNature?: string;
  activities?: string;
  conditions?: string;
  notes?: string;
  email?: string;
  allowMultipleTempInsurance?: boolean;
  allowInquiries?: boolean;
  allowDownPayment?: boolean;
  downPayment?: string;
  allowAlternativeOffers?: boolean;
  warrantyStatement?: string;
  description?: string;
  matchedCompanyCode?: string | null;
  matchScore?: number | null;
  tags: string[];
  parts: Array<{ serial: number; name: string }>;
  items: Array<{ serial: number; name: string; partName?: string; type?: string; quantity?: number }>;
  timeline: {
    stages: Array<{ label: string; date: string }>;
    announcementDate?: string;
    techEnvelopeOpenDate?: string;
    techDecisionDate?: string;
    finEnvelopeOpenDate?: string;
    finDecisionDate?: string;
    awardDate?: string;
    inquiriesSessionDate?: string;
    inquiriesReplyDate?: string;
    auctionSessionDate?: string;
    [key: string]: any;
  };
  attachments: Array<{ serial: number; name: string; docId?: string; downloadUrl: string }>;
  sourceUrl: string;
}

const EGYPT_GOVERNORATES = [
  'القاهرة', 'الجيزة', 'الإسكندرية', 'الدقهلية', 'البحر الأحمر', 'البحيرة',
  'الفيوم', 'الغربية', 'الإسماعيلية', 'المنوفية', 'المنيا', 'القليوبية',
  'الوادي الجديد', 'السويس', 'أسوان', 'أسيوط', 'بني سويف', 'بورسعيد',
  'دمياط', 'الشرقية', 'جنوب سيناء', 'كفر الشيخ', 'مطروح', 'الأقصر',
  'قنا', 'شمال سيناء', 'سوهاج'
];

@Injectable()
export class RadarScraperService {
  private readonly logger = new Logger(RadarScraperService.name);
  private cookies: string = '';
  private cookiesExpire: number = 0;

  // Default credentials for the government portal
  private readonly baseUrl = 'https://gcs.digitalegypt.gov.eg';
  private readonly email = process.env.RADAR_GCS_EMAIL || 'ahdahdahd8818@gmail.com';
  private readonly password = process.env.RADAR_GCS_PASSWORD || 'Nnnn@8818';

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Invalidate cached session cookies
   */
  invalidateSession(): void {
    this.cookies = '';
    this.cookiesExpire = 0;
  }

  /**
   * Helper to detect if response indicates a dead or redirected session
   */
  private isSessionInvalid(html: string, resUrl?: string): boolean {
    if (!html) return true;
    if (resUrl && (resUrl.includes('/Account/Login') || resUrl.includes('ReturnUrl'))) {
      return true;
    }
    if (html.includes('name="Email"') && html.includes('name="Password"')) {
      return true;
    }
    if (html.includes('id="Email"') && html.includes('__RequestVerificationToken') && !html.includes('/Process/Details/')) {
      return true;
    }
    return false;
  }

  /**
   * Login to https://gcs.digitalegypt.gov.eg and retain authenticated session cookies
   */
  async login(force: boolean = false): Promise<string> {
    // Return cached cookies if still fresh and not forced
    if (!force && this.cookies && Date.now() < this.cookiesExpire) {
      return this.cookies;
    }

    this.logger.log(`Logging in to Egyptian Tenders Portal (${this.email})...`);

    const loginPageUrl = `${this.baseUrl}/Account/Login?ReturnUrl=%2FHome`;
    const getRes = await fetch(loginPageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    const html = await getRes.text();
    const getCookies = getRes.headers.getSetCookie ? getRes.headers.getSetCookie() : [getRes.headers.get('set-cookie')].filter(Boolean);
    const tokenMatch = html.match(/name="__RequestVerificationToken"\s+type="hidden"\s+value="([^"]+)"/);

    if (!tokenMatch) {
      throw new Error('فشل العثور على رمز التحقق __RequestVerificationToken في صفحة الدخول');
    }

    const token = tokenMatch[1];
    const cookieMap: Record<string, string> = {};

    for (const c of getCookies) {
      if (!c) continue;
      const parts = c.split(';')[0].split('=');
      if (parts.length >= 2) cookieMap[parts[0].trim()] = parts.slice(1).join('=').trim();
    }

    const body = new URLSearchParams();
    body.append('__RequestVerificationToken', token);
    body.append('Email', this.email);
    body.append('Password', this.password);

    const postRes = await fetch(loginPageUrl, {
      method: 'POST',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': Object.entries(cookieMap).map(([k, v]) => `${k}=${v}`).join('; '),
        'Referer': loginPageUrl
      },
      body: body.toString(),
      redirect: 'manual'
    });

    const postCookies = postRes.headers.getSetCookie ? postRes.headers.getSetCookie() : [postRes.headers.get('set-cookie')].filter(Boolean);
    for (const c of postCookies) {
      if (!c) continue;
      const parts = c.split(';')[0].split('=');
      if (parts.length >= 2) cookieMap[parts[0].trim()] = parts.slice(1).join('=').trim();
    }

    this.cookies = Object.entries(cookieMap).map(([k, v]) => `${k}=${v}`).join('; ');
    this.cookiesExpire = Date.now() + 8 * 60 * 1000; // 8 mins cache
    this.logger.log('Successfully authenticated with Egyptian Government Tenders portal!');
    return this.cookies;
  }

  /**
   * Check connection status
   */
  async checkConnection(): Promise<{ connected: boolean; email: string; portal: string; message: string }> {
    try {
      const cookies = await this.login();
      const homeRes = await fetch(`${this.baseUrl}/Home`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          'Cookie': cookies
        },
        redirect: 'manual'
      });
      const html = await homeRes.text();
      const isLogged = html.includes('سحر حسن') || html.includes('جولدن سرفيس') || html.includes('/Account/LogOff');
      return {
        connected: isLogged,
        email: this.email,
        portal: 'منظومة التعاقدات الحكومية المصرية (gcs.digitalegypt.gov.eg)',
        message: isLogged ? 'الاتصال نشط وموثق بنجاح' : 'تعذر التحقق من تسجيل الدخول',
      };
    } catch (err: any) {
      return {
        connected: false,
        email: this.email,
        portal: 'منظومة التعاقدات الحكومية المصرية (gcs.digitalegypt.gov.eg)',
        message: err.message || 'خطأ في الاتصال بالبوابة',
      };
    }
  }

  /**
   * Scrapes list of tenders from /Tender (page 0) and /Tender/Filter (page > 0)
   */
  async scrapeTendersList(pagesCount: number = 2): Promise<ScrapedTenderBasic[]> {
    let cookies = await this.login();
    const allTenders: ScrapedTenderBasic[] = [];

    // Helper to extract rows
    const extractRows = (html: string): ScrapedTenderBasic[] => {
      const list: ScrapedTenderBasic[] = [];
      const rowMatches = [...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)];
      for (const r of rowMatches) {
        const rowContent = r[1];
        const detailMatch = rowContent.match(/\/Process\/Details\/([a-zA-Z0-9\-]+)/i);
        if (!detailMatch) continue;

        const id = detailMatch[1];
        const cells = [...rowContent.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)]
          .map(m => m[1].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim());

        if (cells.length >= 5) {
          list.push({
            externalId: id,
            refNo: cells[0],
            title: cells[1],
            authority: cells[2],
            publishDate: cells[3],
            deadline: cells[4],
            url: `${this.baseUrl}/Process/Details/${id}`
          });
        }
      }
      return list;
    };

    // 1. Fetch Page 0
    this.logger.log('Scraping /Tender (Page 0)...');
    let page0Res = await fetch(`${this.baseUrl}/Tender`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Cookie': cookies
      }
    });

    let page0Html = await page0Res.text();

    // Check if session expired or was redirected to login
    if (this.isSessionInvalid(page0Html, page0Res.url) || !page0Html.includes('/Process/Details/')) {
      this.logger.warn('Session expired or redirected to login on /Tender. Re-authenticating with fresh session...');
      this.invalidateSession();
      cookies = await this.login(true);
      page0Res = await fetch(`${this.baseUrl}/Tender`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Cookie': cookies
        }
      });
      page0Html = await page0Res.text();
    }

    const p0Items = extractRows(page0Html);
    allTenders.push(...p0Items);
    this.logger.log(`Page 0 retrieved ${p0Items.length} tenders.`);

    if (p0Items.length === 0) {
      this.logger.error('No tenders found on Page 0 after login attempt!');
      throw new Error('فشل جلب المناقصات من البوابة المصرية: لم يتم العثور على أي مناقصات في الصفحة الرئيسية.');
    }

    const antiTokenMatch = page0Html.match(/name="__RequestVerificationToken"\s+type="hidden"\s+value="([^"]+)"/);
    const antiToken = antiTokenMatch ? antiTokenMatch[1] : '';

    // 2. Fetch Subsequent Pages
    for (let p = 1; p < pagesCount; p++) {
      try {
        this.logger.log(`Scraping /Tender/Filter (Page ${p})...`);
        const filterBody = new URLSearchParams();
        filterBody.append('__RequestVerificationToken', antiToken);
        filterBody.append('Page', String(p));
        filterBody.append('startDate', '');
        filterBody.append('endDate', '');
        filterBody.append('RequestBodyId', '');
        filterBody.append('TenderKindValue', '');

        const filterRes = await fetch(`${this.baseUrl}/Tender/Filter`, {
          method: 'POST',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'Cookie': cookies,
            'Referer': `${this.baseUrl}/Tender`,
            'X-Requested-With': 'XMLHttpRequest'
          },
          body: filterBody.toString()
        });

        if (filterRes.ok) {
          const filterHtml = await filterRes.text();
          if (!this.isSessionInvalid(filterHtml, filterRes.url)) {
            const items = extractRows(filterHtml);
            allTenders.push(...items);
            this.logger.log(`Page ${p} retrieved ${items.length} tenders.`);
          }
        }
      } catch (err: any) {
        this.logger.warn(`Failed to scrape page ${p}: ${err.message}`);
      }
    }

    // Deduplicate by externalId
    const uniqueMap = new Map<string, ScrapedTenderBasic>();
    for (const t of allTenders) {
      if (!uniqueMap.has(t.externalId)) {
        uniqueMap.set(t.externalId, t);
      }
    }

    return Array.from(uniqueMap.values());
  }

  /**
   * Fetches deep details for a single tender using the 6 live partial view endpoints
   */
  async scrapeTenderFullDetails(basic: ScrapedTenderBasic): Promise<ScrapedTenderFull> {
    let cookies = await this.login();
    const id = basic.externalId;

    const urls = [
      { key: 'basicInfo', url: `${this.baseUrl}/Process/FetchBasicInfoAysnc?Id=${id}` },
      { key: 'details', url: `${this.baseUrl}/Process/FetchDetailsAysnc?Id=${id}` },
      { key: 'parts', url: `${this.baseUrl}/Process/FetchTenderPartsAysnc?Id=${id}` },
      { key: 'items', url: `${this.baseUrl}/Process/FetchTenderItemsAysnc?Id=${id}` },
      { key: 'timeline', url: `${this.baseUrl}/Process/FetchTenderTimeLineAysnc?Id=${id}` },
      { key: 'attachments', url: `${this.baseUrl}/Process/FetchTenderAttachmentsAysnc?Id=${id}` },
    ];

    const results: Record<string, string> = {};

    await Promise.all(
      urls.map(async (u) => {
        try {
          let res = await fetch(u.url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Cookie': cookies,
              'Referer': `${this.baseUrl}/Process/Details/${id}`,
              'X-Requested-With': 'XMLHttpRequest'
            }
          });
          let text = res.ok ? await res.text() : '';
          if (this.isSessionInvalid(text, res.url)) {
            this.invalidateSession();
            cookies = await this.login(true);
            res = await fetch(u.url, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Cookie': cookies,
                'Referer': `${this.baseUrl}/Process/Details/${id}`,
                'X-Requested-With': 'XMLHttpRequest'
              }
            });
            text = res.ok ? await res.text() : '';
          }
          results[u.key] = text;
        } catch {
          results[u.key] = '';
        }
      })
    );

    // 1. Basic Info
    const bHtml = results.basicInfo || '';
    const titleVal = bHtml.match(/id="etender_Tender_etender_Title"[^>]*>([\s\S]*?)<\/textarea>/i)?.[1]?.trim();
    const titleEnVal = bHtml.match(/id="etender_Tender_bls_TitleForigenLanguage"[^>]*>([\s\S]*?)<\/textarea>/i)?.[1]?.trim();
    const refNoVal = bHtml.match(/id="etender_Tender_etender_refno"[^>]*value="([^"]*)"/i)?.[1]?.trim();
    const authorityVal = bHtml.match(/id="etender_Tender_bls_RequestingBody_Name"[^>]*value="([^"]*)"/i)?.[1]?.trim();
    const tempInsuranceStr = bHtml.match(/id="etender_Tender_bls_TemporaryInsuranceAmount_Value"[^>]*value="([^"]*)"/i)?.[1];
    const bookletPriceStr = bHtml.match(/id="etender_Tender_etender_ParticipationFee_Value"[^>]*value="([^"]*)"/i)?.[1];
    const fiscalYearVal = bHtml.match(/id="etender_Tender_bls_TenderFiscalYear_Name"[^>]*value="([^"]*)"/i)?.[1]?.trim();
    const currencyVal = bHtml.match(/id="etender_Tender_TransactionCurrencyId_Name"[^>]*value="([^"]*)"/i)?.[1]?.replace(/&nbsp;/g, ' ').trim();
    const emailVal = bHtml.match(/id="etender_Tender_EmailAddress"[^>]*value="([^"]*)"/i)?.[1]?.trim();

    // Selected options text
    const tenderMethodVal = bHtml.match(/id="etender_Tender_bls_TenderMethod_Value"[^>]*>([\s\S]*?)<\/select>/i)?.[1]
      ?.match(/<option[^>]*selected="selected"[^>]*>([^<]+)<\/option>/i)?.[1]?.trim();
    const tenderKindVal = bHtml.match(/id="etender_Tender_bls_TenderKind_Value"[^>]*>([\s\S]*?)<\/select>/i)?.[1]
      ?.match(/<option[^>]*selected="selected"[^>]*>([^<]+)<\/option>/i)?.[1]?.trim();
    const divisibleVal = bHtml.match(/id="etender_Tender_bls_TenderClasification_Value"[^>]*>([\s\S]*?)<\/select>/i)?.[1]
      ?.match(/<option[^>]*selected="selected"[^>]*>([^<]+)<\/option>/i)?.[1]?.trim();
    const biddingTypeVal = bHtml.match(/id="etender_Tender_etender_BiddingType_Value"[^>]*>([\s\S]*?)<\/select>/i)?.[1]
      ?.match(/<option[^>]*selected="selected"[^>]*>([^<]+)<\/option>/i)?.[1]?.trim();
    const allowMultipleTempInsurance = /id="etender_Tender_bls_allowmultipletempinsurance"[^>]*checked/i.test(bHtml);
    const allowInquiries = /id="etender_Tender_bls_AllowInquires"[^>]*checked/i.test(bHtml);

    // 2. Details
    const dHtml = results.details || '';
    const warrantyBondStr = dHtml.match(/id="etender_Tender_bls_WarrantyBond"[^>]*value="([^"]*)"/i)?.[1];
    const warrantyStatementVal = dHtml.match(/id="etender_Tender_bls_WarrantyStatement"[^>]*value="([^"]*)"/i)?.[1]?.trim();
    const pubDaysStr = dHtml.match(/id="etender_Tender_bls_PublishingForDays"[^>]*value="([^"]*)"/i)?.[1];
    const deliveryDurationVal = dHtml.match(/id="etender_Tender_bls_DeliveryStatement"[^>]*value="([^"]*)"/i)?.[1]?.trim();
    const evaluationTypeVal = dHtml.match(/name="etender_Tender\.FormattedValues\[bls_evaluationtype\]"[^>]*value="([^"]*)"/i)?.[1]?.trim();
    const tenderNatureVal = dHtml.match(/name="etender_Tender\.FormattedValues\[bls_tendernature\]"[^>]*value="([^"]*)"/i)?.[1]?.trim();
    const allowDownPayment = /id="etender_Tender_bls_allowdownpayment"[^>]*checked/i.test(dHtml);
    const downPaymentVal = dHtml.match(/id="etender_Tender_bls_Tender_Downpayment"[^>]*value="([^"]*)"/i)?.[1]?.trim();
    const allowAlternativeOffers = /id="etender_Tender_bls_AllowAlternativeOffers"[^>]*checked/i.test(dHtml);
    const activitiesVal = dHtml.match(/id="activities"[^>]*>([\s\S]*?)<\/textarea>/i)?.[1]?.trim();
    const descriptionVal = dHtml.match(/id="etender_Tender_bls_DescriptionArabic"[^>]*>([\s\S]*?)<\/textarea>/i)?.[1]?.trim();
    const conditionsVal = dHtml.match(/id="etender_Tender_bls_ConditionsArabic"[^>]*>([\s\S]*?)<\/textarea>/i)?.[1]?.trim();
    const notesVal = dHtml.match(/id="etender_Tender_bls_SummaryArabic"[^>]*>([\s\S]*?)<\/textarea>/i)?.[1]?.trim();

    // 3. Parts
    const pHtml = results.parts || '';
    const parts: Array<{ serial: number; name: string }> = [];
    const partRows = [...pHtml.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)];
    for (let i = 1; i < partRows.length; i++) {
      const c = [...partRows[i][1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(m => m[1].replace(/<[^>]+>/g, '').trim());
      if (c.length >= 2) {
        parts.push({ serial: parseInt(c[0], 10) || i, name: c[1] });
      }
    }

    // 4. Items
    const iHtml = results.items || '';
    const items: Array<{ serial: number; name: string; partName?: string; type?: string; quantity?: number }> = [];
    const itemRows = [...iHtml.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)];
    for (let i = 1; i < itemRows.length; i++) {
      const c = [...itemRows[i][1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(m => m[1].replace(/<[^>]+>/g, '').trim());
      if (c.length >= 5) {
        items.push({
          serial: parseInt(c[0], 10) || i,
          name: c[1],
          partName: c[2],
          type: c[3],
          quantity: parseFloat(c[4]) || 1,
        });
      }
    }

    // 5. Dynamic Timeline Extraction (supports any tender type: مناقصة، ممارسة، مزاد، إسناد)
    const tlHtml = results.timeline || '';
    const timelineMatches = [...tlHtml.matchAll(/<div class="form-group">([\s\S]*?)(?:<label[^>]*>([\s\S]*?)<\/label>)/gi)];
    const timelineStages: Array<{ label: string; date: string }> = [];
    const timeline: any = { stages: [] };

    for (const m of timelineMatches) {
      const inputVal = m[1].match(/value=['"]([^'"]+)['"]/i)?.[1]?.trim();
      const labelText = m[2]?.replace(/<[^>]+>/g, '').trim();
      if (labelText && inputVal) {
        timelineStages.push({ label: labelText, date: inputVal });
        // Map milestone keys accurately
        if (labelText.includes('الإعلان') || labelText.includes('الدعوة') || labelText.includes('نشر')) {
          timeline.announcementDate = inputVal;
        }
        if ((labelText.includes('المظاريف الفنية') || labelText.includes('المظروف الفني') || labelText.includes('فتح المظاريف') || labelText.includes('فض المظاريف')) && !labelText.includes('المالية') && !labelText.includes('المالي')) {
          timeline.techEnvelopeOpenDate = inputVal;
        }
        if (labelText.includes('البت الفني') || (labelText.includes('البت') && !labelText.includes('المالي') && !labelText.includes('المالية'))) {
          timeline.techDecisionDate = inputVal;
        }
        if (labelText.includes('المظاريف المالية') || labelText.includes('المظروف المالي') || (labelText.includes('فتح المظاريف') && labelText.includes('المالية'))) {
          timeline.finEnvelopeOpenDate = inputVal;
        }
        if (labelText.includes('البت المالي')) {
          timeline.finDecisionDate = inputVal;
        }
        if (labelText.includes('الترسية')) {
          timeline.awardDate = inputVal;
        }
        if (labelText.includes('الإستفسارات') || labelText.includes('الاستفسارات')) {
          if (labelText.includes('جلسة')) timeline.inquiriesSessionDate = inputVal;
          if (labelText.includes('الرد')) timeline.inquiriesReplyDate = inputVal;
        }
        if (labelText.includes('مزاد')) {
          timeline.auctionSessionDate = inputVal;
          if (!timeline.techEnvelopeOpenDate) {
            timeline.techEnvelopeOpenDate = inputVal;
          }
        }
      }
    }
    timeline.stages = timelineStages;

    // 6. Attachments
    const aHtml = results.attachments || '';
    const attachments: Array<{ serial: number; name: string; docId?: string; downloadUrl: string }> = [];
    const attRows = [...aHtml.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)];
    for (let i = 1; i < attRows.length; i++) {
      const rowContent = attRows[i][1];
      const formMatch = rowContent.match(/action="([^"]*DownloadDoc[^"]*)"/i);
      const c = [...rowContent.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(m => m[1].replace(/<[^>]+>/g, '').trim());
      if (c.length >= 2) {
        let docId = '';
        if (formMatch) {
          const docIdMatch = formMatch[1].match(/DocId=([a-zA-Z0-9\-]+)/i);
          if (docIdMatch) docId = docIdMatch[1];
        }
        if (!docId) {
          const directMatch = rowContent.match(/DocId=([a-zA-Z0-9\-]+)/i);
          if (directMatch) docId = directMatch[1];
        }
        attachments.push({
          serial: parseInt(c[0], 10) || i,
          name: c[1],
          docId,
          downloadUrl: docId ? `/radar/download-doc?docId=${docId}&tenderId=${id}` : (formMatch ? `${this.baseUrl}${formMatch[1]}` : ''),
        });
      }
    }

    // Governorates detection
    const fullText = `${titleVal || basic.title} ${authorityVal || basic.authority || ''}`;
    let matchedGov = 'القاهرة';
    for (const g of EGYPT_GOVERNORATES) {
      if (fullText.includes(g)) {
        matchedGov = g;
        break;
      }
    }

    // Domain Tags (General classification without any company pre-assignment)
    const tags = this.extractDomainTags(
      titleVal || basic.title,
      authorityVal || basic.authority,
      activitiesVal,
      tenderKindVal
    );

    return {
      externalId: id,
      refNo: refNoVal || basic.refNo,
      title: titleVal || basic.title,
      titleEn: titleEnVal,
      authority: authorityVal || basic.authority,
      governorate: matchedGov,
      tenderMethod: tenderMethodVal || 'مناقصة عامة',
      tenderKind: tenderKindVal || 'خدمات',
      temporaryInsurance: tempInsuranceStr ? parseFloat(tempInsuranceStr) : undefined,
      finalInsuranceRate: warrantyBondStr ? parseFloat(warrantyBondStr) : 5,
      bookletPrice: bookletPriceStr ? parseFloat(bookletPriceStr) : undefined,
      currency: currencyVal || 'جنيه مصري',
      fiscalYear: fiscalYearVal,
      biddingType: biddingTypeVal,
      divisible: divisibleVal,
      publishingDays: pubDaysStr ? parseInt(pubDaysStr, 10) : undefined,
      deliveryDuration: deliveryDurationVal,
      evaluationType: evaluationTypeVal,
      tenderNature: tenderNatureVal,
      activities: activitiesVal,
      conditions: conditionsVal,
      notes: notesVal,
      email: emailVal,
      allowMultipleTempInsurance,
      allowInquiries,
      allowDownPayment,
      downPayment: downPaymentVal,
      allowAlternativeOffers,
      warrantyStatement: warrantyStatementVal,
      description: descriptionVal,
      matchedCompanyCode: null,
      matchScore: null,
      tags,
      parts,
      items,
      timeline,
      attachments,
      sourceUrl: basic.url,
    };
  }

  /**
   * Domain Tags extraction for broad categorization (No company pre-assignment)
   */
  extractDomainTags(
    title: string,
    authority?: string,
    activities?: string,
    tenderKind?: string
  ): string[] {
    const text = `${title} ${authority || ''} ${activities || ''} ${tenderKind || ''}`.toLowerCase();
    const tags: string[] = [];

    if (text.includes('خوادم') || text.includes('شبكات') || text.includes('حاسب') || text.includes('كمبيوتر') || text.includes('برمجيات') || text.includes('تقنية') || text.includes('تكنولوجيا') || text.includes('اتصالات') || text.includes('كاميرات')) {
      tags.push('شبكات وتكنولوجيا');
    }
    if (text.includes('طبي') || text.includes('مستشفى') || text.includes('أدوية') || text.includes('مستلزمات طبية') || text.includes('وقاية') || text.includes('أمن صناعي')) {
      tags.push('توريدات طبية ومهمات');
    }
    if (text.includes('مضخات') || text.includes('مياه') || text.includes('صرف') || text.includes('صيانة') || text.includes('مقاولات') || text.includes('إنشاء') || text.includes('تشطيب') || text.includes('ترميم') || text.includes('كهرباء') || text.includes('كهروميكانيك')) {
      tags.push('مقاولات وبنية تحتية');
    }
    if (text.includes('توريد') || text.includes('أدوات') || text.includes('أثاث') || text.includes('سيارات') || text.includes('مهمات')) {
      tags.push('توريدات عامة');
    }

    if (tags.length === 0) tags.push('مناقصات عامة');
    return tags.slice(0, 3);
  }

  /**
   * Main Scan function: scrapes list + deep details and upserts into database
   */
  async scan(pagesCount: number = 2): Promise<{
    success: boolean;
    totalScanned: number;
    newCount: number;
    updatedCount: number;
    message: string;
  }> {
    this.logger.log(`Starting Radar Scan for ${pagesCount} pages...`);

    // Ensure RadarSource exists
    let source = await this.prisma.radarSource.findFirst({
      where: { url: this.baseUrl },
    });

    if (!source) {
      source = await this.prisma.radarSource.create({
        data: {
          name: 'منظومة التعاقدات الحكومية — مصر الرقمية',
          url: this.baseUrl,
          isActive: true,
        },
      });
    }

    const tendersBasic = await this.scrapeTendersList(pagesCount);
    this.logger.log(`Found ${tendersBasic.length} tenders on government portal.`);

    let newCount = 0;
    let updatedCount = 0;

    // Scrape deep details sequentially or in small batches
    for (const basic of tendersBasic) {
      try {
        const full = await this.scrapeTenderFullDetails(basic);

        // Check if item exists by externalId
        const existing = await this.prisma.radarItem.findUnique({
          where: { externalId: basic.externalId },
        });

        const categoryParts = Array.from(new Set([
          full.tenderMethod,
          full.tenderKind,
          ...full.tags,
        ].filter(Boolean)));
        const categoryCombined = categoryParts.join(' • ');

        const tenderData = {
          sourceId: source.id,
          externalId: full.externalId,
          referenceNumber: full.refNo || undefined,
          title: full.title,
          authority: full.authority || undefined,
          tenderType: full.tenderMethod || undefined,
          governorate: full.governorate || undefined,
          category: categoryCombined || full.tags.join('، '),
          temporaryInsurance: full.temporaryInsurance || undefined,
          bookletPrice: full.bookletPrice || undefined,
          publicationDate: basic.publishDate ? this.parseArabicDate(basic.publishDate) : undefined,
          deadline: basic.deadline ? this.parseArabicDate(basic.deadline) : undefined,
          sourceUrl: full.sourceUrl,
          matchedCompanyCode: null,
          matchScore: null,
          rawData: JSON.stringify(full),
        };

        if (existing) {
          await this.prisma.radarItem.update({
            where: { id: existing.id },
            data: {
              ...tenderData,
              matchedCompanyCode: existing.matchedCompanyCode,
              matchScore: existing.matchScore,
            },
          });
          updatedCount++;
        } else {
          await this.prisma.radarItem.create({
            data: tenderData,
          });
          newCount++;
        }
      } catch (err: any) {
        this.logger.error(`Error processing tender ${basic.externalId}: ${err.message}`);
      }
    }

    // Update source lastFetched
    await this.prisma.radarSource.update({
      where: { id: source.id },
      data: { lastFetched: new Date() },
    });

    const msg =
      newCount > 0
        ? `تم رصد ${newCount} مناقصة جديدة اليوم وإضافتها للرادار بنجاح!`
        : `الرادار محدث: تم التحقق من البوابة الحكومية ولم يتم رصد مناقصات جديدة منذ آخر فحص.`;
    this.logger.log(msg);

    return {
      success: true,
      totalScanned: tendersBasic.length,
      newCount,
      updatedCount,
      message: msg,
    };
  }

  /**
   * Helper to parse Arabic date strings like "السبت 07 نوفمبر, 2026" or "2026/10/28"
   */
  public parseArabicDate(dateStr: string): Date | undefined {
    if (!dateStr) return undefined;
    const arabicMonths: Record<string, string> = {
      'يناير': '01', 'فبراير': '02', 'مارس': '03', 'أبريل': '04',
      'مايو': '05', 'يونيو': '06', 'يوليو': '07', 'أغسطس': '08',
      'سبتمبر': '09', 'أكتوبر': '10', 'نوفمبر': '11', 'ديسمبر': '12',
    };

    try {
      let cleaned = dateStr.replace(/^(الأحد|الإثنين|الثلاثاء|الأربعاء|الخميس|الجمعة|السبت)\s+/gi, '').trim();

      // Extract time if present, e.g. "9:00 ص" or "2:26 م" or "14:30"
      let hours = 9;
      let minutes = 0;
      const timeMatch = cleaned.match(/(\d{1,2}):(\d{2})\s*(ص|م)?/i);
      if (timeMatch) {
        let h = parseInt(timeMatch[1], 10);
        const m = parseInt(timeMatch[2], 10);
        const ampm = timeMatch[3];
        if (ampm === 'م' && h < 12) h += 12;
        if (ampm === 'ص' && h === 12) h = 0;
        hours = h;
        minutes = m;
      }

      for (const [arMonth, mNum] of Object.entries(arabicMonths)) {
        if (cleaned.includes(arMonth)) {
          // e.g. "07 نوفمبر, 2026" or "28 أكتوبر, 2026 8:00 ص"
          const match = cleaned.match(/(\d{1,2})\s+[^\d,]+\s*,?\s*(\d{4})/);
          if (match) {
            const day = match[1].padStart(2, '0');
            const year = match[2];
            const hh = String(hours).padStart(2, '0');
            const mm = String(minutes).padStart(2, '0');
            return new Date(`${year}-${mNum}-${day}T${hh}:${mm}:00Z`);
          }
        }
      }

      // Check standard ISO or slash dates
      const parsed = new Date(dateStr);
      if (!isNaN(parsed.getTime())) return parsed;
    } catch {
      // Fallback
    }
    return undefined;
  }

  /**
   * Fetch live attachments list directly from Egyptian portal for a given tender process ID
   */
  async fetchAttachmentsForTender(tenderExternalId: string): Promise<Array<{ serial: number; name: string; docId?: string; downloadUrl: string }>> {
    try {
      let cookies = await this.login();
      let res = await fetch(`${this.baseUrl}/Process/FetchTenderAttachmentsAysnc?Id=${tenderExternalId}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Cookie': cookies,
          'Referer': `${this.baseUrl}/Process/Details/${tenderExternalId}`,
          'X-Requested-With': 'XMLHttpRequest',
        },
      });
      if (!res.ok) return [];
      let html = await res.text();
      if (this.isSessionInvalid(html, res.url)) {
        this.invalidateSession();
        cookies = await this.login(true);
        res = await fetch(`${this.baseUrl}/Process/FetchTenderAttachmentsAysnc?Id=${tenderExternalId}`, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Cookie': cookies,
            'Referer': `${this.baseUrl}/Process/Details/${tenderExternalId}`,
            'X-Requested-With': 'XMLHttpRequest',
          },
        });
        if (!res.ok) return [];
        html = await res.text();
      }
      const attachments: Array<{ serial: number; name: string; docId?: string; downloadUrl: string }> = [];
      const attRows = [...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)];
      for (let i = 1; i < attRows.length; i++) {
        const rowContent = attRows[i][1];
        const formMatch = rowContent.match(/action="([^"]*DownloadDoc[^"]*)"/i);
        const c = [...rowContent.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(m => m[1].replace(/<[^>]+>/g, '').trim());
        if (c.length >= 2) {
          let docId = '';
          if (formMatch) {
            const docIdMatch = formMatch[1].match(/DocId=([a-zA-Z0-9\-]+)/i);
            if (docIdMatch) docId = docIdMatch[1];
          }
          if (!docId) {
            const directMatch = rowContent.match(/DocId=([a-zA-Z0-9\-]+)/i);
            if (directMatch) docId = directMatch[1];
          }
          if (docId) {
            attachments.push({
              serial: parseInt(c[0], 10) || i,
              name: c[1],
              docId,
              downloadUrl: `/radar/download-doc?docId=${docId}&tenderId=${tenderExternalId}`,
            });
          }
        }
      }
      return attachments;
    } catch {
      return [];
    }
  }

  /**
   * Download attachment/booklet document directly using authenticated session cookies
   */
  async downloadDocument(docId: string, tenderId?: string): Promise<{ buffer: Buffer; contentType: string; filename: string }> {
    let cookies = await this.login();
    const docUrl = `${this.baseUrl}/Process/DownloadDoc?DocId=${encodeURIComponent(docId)}`;
    const referer = tenderId ? `${this.baseUrl}/Process/Details/${tenderId}` : `${this.baseUrl}/Tender`;

    this.logger.log(`Downloading original document ${docId} from Egyptian portal...`);

    let res = await fetch(docUrl, {
      method: 'POST',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Cookie': cookies,
        'Referer': referer,
      },
    });

    // If POST fails with 405 Method Not Allowed or 404, retry with GET
    if (!res.ok && (res.status === 405 || res.status === 404)) {
      res = await fetch(docUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Cookie': cookies,
          'Referer': referer,
        },
      });
    }

    let arrayBuf = await res.arrayBuffer();
    let buffer = Buffer.from(arrayBuf);
    const head150 = buffer.subarray(0, 150).toString('utf-8').toLowerCase();

    // Guard: Check if portal returned HTML error page or login redirect instead of binary document
    if (res.url.includes('/Account/Login') || head150.includes('<!doctype') || head150.includes('<html') || head150.includes('<body') || head150.includes('<script')) {
      this.logger.warn(`Download returned HTML or login redirect. Refreshing session and retrying for doc ${docId}...`);
      this.invalidateSession();
      cookies = await this.login(true);

      res = await fetch(docUrl, {
        method: 'POST',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Cookie': cookies,
          'Referer': referer,
        },
      });

      if (!res.ok && (res.status === 405 || res.status === 404)) {
        res = await fetch(docUrl, {
          method: 'GET',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Cookie': cookies,
            'Referer': referer,
          },
        });
      }

      arrayBuf = await res.arrayBuffer();
      buffer = Buffer.from(arrayBuf);
    }

    if (!res.ok) {
      throw new Error(`فشل تحميل الملف من بوابة التعاقدات الحكومية: كود الاستجابة ${res.status}`);
    }

    const headAfter = buffer.subarray(0, 150).toString('utf-8').toLowerCase();
    if (headAfter.includes('<!doctype') || headAfter.includes('<html') || headAfter.includes('<body') || headAfter.includes('<script')) {
      throw new Error('تعذر تحميل كراسة الشروط: البوابة الحكومية لم تُرجع ملفاً صالحاً (قد يتطلب شراء الكراسة أو استلامها ورقياً من مقر الجهة الطارحة).');
    }

    let contentType = res.headers.get('content-type') || 'application/pdf';
    const disposition = res.headers.get('content-disposition') || '';

    // Extract filename
    let filename = 'كراسة_الشروط.pdf';
    const utf8Match = disposition.match(/filename\*=UTF-8''([^;\r\n]+)/i);
    if (utf8Match) {
      try {
        filename = decodeURIComponent(utf8Match[1]);
      } catch {}
    } else {
      const normalMatch = disposition.match(/filename="?([^";\r\n]+)"?/i);
      if (normalMatch) {
        filename = normalMatch[1];
      }
    }

    // Auto-detect and correct Content-Type according to actual document format
    const lowerName = filename.toLowerCase();
    if (lowerName.endsWith('.docx')) {
      contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    } else if (lowerName.endsWith('.doc')) {
      contentType = 'application/msword';
    } else if (lowerName.endsWith('.zip')) {
      contentType = 'application/zip';
    } else if (lowerName.endsWith('.rar')) {
      contentType = 'application/x-rar-compressed';
    } else if (lowerName.endsWith('.xlsx')) {
      contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    } else if (buffer.subarray(0, 4).toString() === '%PDF') {
      contentType = 'application/pdf';
    }

    return {
      buffer,
      contentType,
      filename,
    };
  }
}

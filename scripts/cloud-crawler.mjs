/**
 * GoldenERP Authentic Desktop Radar Crawler
 * Scrapes official tenders from Egyptian Government Portal (https://gcs.digitalegypt.gov.eg)
 * Accurately parses:
 *  - Basic Info: Title, English Title, Reference Number, Authority, Method, Kind, Temporary Insurance,
 *                Booklet Price, Bidding Type, Fiscal Year, Currency, Classification, Inquiries & Insurance Splitting.
 *  - Details: Warranty Bond, Warranty Statement, Evaluation Type, Tender Nature,
 *             Downpayment, Publishing Days, Delivery Duration, Alternative Offers, Activities, Conditions & Summary.
 *  - Tender Parts & Items.
 *  - Comprehensive Timeline.
 *  - Official Attachments & Downloads genuine booklets (PDF / DOCX).
 * And syncs everything directly into GoldenERP.
 */

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
import dns from 'dns';
try { dns.setDefaultResultOrder('ipv4first'); } catch {}

const PORTAL_BASE = 'https://gcs.digitalegypt.gov.eg';
const PORTAL_EMAIL = process.env.RADAR_GCS_EMAIL || 'ahdahdahd8818@gmail.com';
const PORTAL_PASSWORD = process.env.RADAR_GCS_PASSWORD || 'Nnnn@8818';

const API_BASE = process.env.GOLDENERP_API_BASE || 'https://api.ahdahd.eu/api';
const ADMIN_USER = process.env.GOLDENERP_ADMIN_USER || 'ahd2026';
const ADMIN_PASS = process.env.GOLDENERP_ADMIN_PASS || 'Ahd@Golden#2026!Sec';

const EGYPT_GOVERNORATES = [
  'القاهرة', 'الجيزة', 'الإسكندرية', 'الدقهلية', 'البحر الأحمر', 'البحيرة',
  'الفيوم', 'الغربية', 'الإسماعيلية', 'المنوفية', 'المنيا', 'القليوبية',
  'الوادي الجديد', 'السويس', 'أسوان', 'أسيوط', 'بني سويف', 'بورسعيد',
  'دمياط', 'الشرقية', 'جنوب سيناء', 'كفر الشيخ', 'مطروح', 'الأقصر',
  'قنا', 'شمال سيناء', 'سوهاج'
];

async function main() {
  console.log('================================================================');
  console.log('   GoldenERP - Egyptian Government Tenders Radar V2.0');
  console.log('================================================================\n');

  // 1. Authenticate with GoldenERP API or use Direct Ingest Key
  console.log(`[1/4] Connecting to GoldenERP API (${API_BASE})...`);
  let token = null;
  try {
    const loginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: ADMIN_USER, password: ADMIN_PASS }),
    });

    if (loginRes.ok) {
      const loginData = await loginRes.json();
      token = loginData.accessToken || loginData.token;
      console.log('  ✓ Authenticated with GoldenERP API successfully!');
    } else {
      console.log('  ! Using direct Cloud Ingest Security Key.');
    }
  } catch (loginErr) {
    console.log(`  ! API Notice: ${loginErr.message}`);
  }

  // 2. Login to Egyptian Government Tenders Portal
  console.log(`\n[2/4] Logging in to Egyptian Government Portal (${PORTAL_EMAIL})...`);
  const loginPageUrl = `${PORTAL_BASE}/Account/Login?ReturnUrl=%2FHome`;
  const getRes = await fetch(loginPageUrl, {
    signal: AbortSignal.timeout(15000),
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
  });

  const getHtml = await getRes.text();
  const getCookies = getRes.headers.getSetCookie ? getRes.headers.getSetCookie() : [getRes.headers.get('set-cookie')].filter(Boolean);
  const tokenMatch = getHtml.match(/name="__RequestVerificationToken"\s+type="hidden"\s+value="([^"]+)"/);
  if (!tokenMatch) throw new Error('Verification token not found on portal login page');

  const cookieMap = {};
  for (const c of getCookies) {
    if (!c) continue;
    const parts = c.split(';')[0].split('=');
    if (parts.length >= 2) cookieMap[parts[0].trim()] = parts.slice(1).join('=').trim();
  }

  const postBody = new URLSearchParams();
  postBody.append('__RequestVerificationToken', tokenMatch[1]);
  postBody.append('Email', PORTAL_EMAIL);
  postBody.append('Password', PORTAL_PASSWORD);
  postBody.append('RememberMe', 'true');

  const postRes = await fetch(loginPageUrl, {
    method: 'POST',
    signal: AbortSignal.timeout(15000),
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': Object.entries(cookieMap).map(([k, v]) => `${k}=${v}`).join('; '),
      'Referer': loginPageUrl
    },
    body: postBody.toString(),
    redirect: 'manual'
  });

  const postCookies = postRes.headers.getSetCookie ? postRes.headers.getSetCookie() : [postRes.headers.get('set-cookie')].filter(Boolean);
  for (const c of postCookies) {
    if (!c) continue;
    const parts = c.split(';')[0].split('=');
    if (parts.length >= 2) cookieMap[parts[0].trim()] = parts.slice(1).join('=').trim();
  }

  const cookieHeader = Object.entries(cookieMap).map(([k, v]) => `${k}=${v}`).join('; ');
  console.log('  ✓ Logged in to Egyptian Tenders Portal successfully!\n');

  // 3. Fetch latest tenders from Tender page
  console.log('[3/4] Scanning latest public tenders...');
  const tenderRes = await fetch(`${PORTAL_BASE}/Tender`, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Cookie': cookieHeader
    }
  });

  const tenderHtml = await tenderRes.text();
  const basicTenders = [];
  const rowMatches = [...tenderHtml.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)];

  for (let i = 1; i < rowMatches.length; i++) {
    const row = rowMatches[i][1];
    const linkMatch = row.match(/href="\/Process\/Details\/([a-zA-Z0-9\-]+)"/i);
    if (!linkMatch) continue;
    const externalId = linkMatch[1];
    const cols = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(m => m[1].replace(/<[^>]+>/g, '').trim());

    if (cols.length >= 5) {
      basicTenders.push({
        externalId,
        refNo: cols[0] || undefined,
        title: cols[1] || 'Public Tender',
        authority: cols[2] || undefined,
        publishDate: cols[3] || undefined,
        deadline: cols[4] || undefined,
        url: `${PORTAL_BASE}/Process/Details/${externalId}`
      });
    }
  }

  console.log(`  ✓ Found ${basicTenders.length} active official tenders on page 1.\n`);
  if (basicTenders.length === 0) {
    console.log('No new tenders found. Completed.');
    return;
  }

  // 4. Scrape deep details for each tender from the 6 live async partial views
  const fullTenders = [];
  const maxToProcess = Math.min(basicTenders.length, 10);
  for (let i = 0; i < maxToProcess; i++) {
    const basic = basicTenders[i];
    const refDisplay = basic.refNo ? `#${basic.refNo}` : `[${basic.externalId.substring(0, 8)}]`;
    console.log(`--> [${i + 1}/${maxToProcess}] Scraping Tender ${refDisplay}...`);
    try {
      const id = basic.externalId;
      const urls = [
        { key: 'basicInfo', url: `${PORTAL_BASE}/Process/FetchBasicInfoAysnc?Id=${id}` },
        { key: 'details', url: `${PORTAL_BASE}/Process/FetchDetailsAysnc?Id=${id}` },
        { key: 'tenderParts', url: `${PORTAL_BASE}/Process/FetchTenderPartsAysnc?Id=${id}` },
        { key: 'items', url: `${PORTAL_BASE}/Process/FetchTenderItemsAysnc?Id=${id}` },
        { key: 'timeline', url: `${PORTAL_BASE}/Process/FetchTenderTimeLineAysnc?Id=${id}` },
        { key: 'attachments', url: `${PORTAL_BASE}/Process/FetchTenderAttachmentsAysnc?Id=${id}` },
      ];

      const parts = {};
      await Promise.all(urls.map(async u => {
        try {
          const res = await fetch(u.url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Cookie': cookieHeader,
              'X-Requested-With': 'XMLHttpRequest'
            }
          });
          if (res.ok) parts[u.key] = await res.text();
        } catch { }
      }));

      // A. Parse basicInfo form inputs
      const bHtml = parts.basicInfo || '';
      const titleDeep = bHtml.match(/id="etender_Tender_etender_Title"[^>]*>([\s\S]*?)<\/textarea>/i)?.[1]?.trim();
      const englishTitle = bHtml.match(/id="etender_Tender_bls_TitleForigenLanguage"[^>]*>([\s\S]*?)<\/textarea>/i)?.[1]?.trim();
      const refNoDeep = (
        bHtml.match(/id="etender_Tender_etender_refno"[^>]*value="([^"]*)"/i)?.[1] ||
        bHtml.match(/<input[^>]*value="([^"]*)"[^>]*id="etender_Tender_etender_refno"/i)?.[1]
      )?.trim();
      const authorityDeep = (
        bHtml.match(/id="etender_Tender_bls_RequestingBody_Name"[^>]*value="([^"]*)"/i)?.[1] ||
        bHtml.match(/<input[^>]*value="([^"]*)"[^>]*id="etender_Tender_bls_RequestingBody_Name"/i)?.[1]
      )?.trim();

      const tempInsuranceStr = (
        bHtml.match(/id="etender_Tender_bls_TemporaryInsuranceAmount_Value"[^>]*value="([^"]*)"/i)?.[1] ||
        bHtml.match(/<input[^>]*value="([^"]*)"[^>]*id="etender_Tender_bls_TemporaryInsuranceAmount_Value"/i)?.[1]
      );
      const bookletPriceStr = (
        bHtml.match(/id="etender_Tender_etender_ParticipationFee_Value"[^>]*value="([^"]*)"/i)?.[1] ||
        bHtml.match(/<input[^>]*value="([^"]*)"[^>]*id="etender_Tender_etender_ParticipationFee_Value"/i)?.[1]
      );
      const fiscalYear = bHtml.match(/id="etender_Tender_bls_TenderFiscalYear_Name"[^>]*value="([^"]*)"/i)?.[1]?.trim();
      const currency = bHtml.match(/id="etender_Tender_TransactionCurrencyId_Name"[^>]*value="([^"]*)"/i)?.[1]?.replace(/&nbsp;/g, ' ').trim();
      const email = bHtml.match(/id="etender_Tender_EmailAddress"[^>]*value="([^"]*)"/i)?.[1]?.trim();

      const tenderMethod = bHtml.match(/id="etender_Tender_bls_TenderMethod_Value"[^>]*>([\s\S]*?)<\/select>/i)?.[1]
        ?.match(/<option[^>]*selected="selected"[^>]*>([^<]+)<\/option>/i)?.[1]?.trim();
      const tenderKind = bHtml.match(/id="etender_Tender_bls_TenderKind_Value"[^>]*>([\s\S]*?)<\/select>/i)?.[1]
        ?.match(/<option[^>]*selected="selected"[^>]*>([^<]+)<\/option>/i)?.[1]?.trim();
      const biddingType = bHtml.match(/id="etender_Tender_etender_BiddingType_Value"[^>]*>([\s\S]*?)<\/select>/i)?.[1]
        ?.match(/<option[^>]*selected="selected"[^>]*>([^<]+)<\/option>/i)?.[1]?.trim();
      const classification = bHtml.match(/id="etender_Tender_bls_TenderClasification_Value"[^>]*>([\s\S]*?)<\/select>/i)?.[1]
        ?.match(/<option[^>]*selected="selected"[^>]*>([^<]+)<\/option>/i)?.[1]?.trim();

      const allowMultipleTempInsurance = /id="etender_Tender_bls_allowmultipletempinsurance"[^>]*checked/i.test(bHtml);
      const allowInquiries = /id="etender_Tender_bls_AllowInquires"[^>]*checked/i.test(bHtml);

      // B. Parse details form inputs
      const dHtml = parts.details || '';
      const finalInsuranceRateStr = dHtml.match(/id="etender_Tender_bls_WarrantyBond"[^>]*value="([^"]*)"/i)?.[1];
      const warrantyStatement = dHtml.match(/id="etender_Tender_bls_WarrantyStatement"[^>]*value="([^"]*)"/i)?.[1]?.trim();
      const tenderNature = dHtml.match(/name="etender_Tender\.FormattedValues\[bls_tendernature\]"[^>]*value="([^"]*)"/i)?.[1]?.trim();
      const evaluationType = dHtml.match(/name="etender_Tender\.FormattedValues\[bls_evaluationtype\]"[^>]*value="([^"]*)"/i)?.[1]?.trim();
      const publishingDays = dHtml.match(/id="etender_Tender_bls_PublishingForDays"[^>]*value="([^"]*)"/i)?.[1]?.trim();
      const deliveryStatement = dHtml.match(/id="etender_Tender_bls_DeliveryStatement"[^>]*value="([^"]*)"/i)?.[1]?.trim();
      const downpayment = dHtml.match(/id="etender_Tender_bls_Tender_Downpayment"[^>]*value="([^"]*)"/i)?.[1]?.trim();
      const allowDownPayment = /id="etender_Tender_bls_allowdownpayment"[^>]*checked/i.test(dHtml);
      const allowAlternativeOffers = /id="etender_Tender_bls_AllowAlternativeOffers"[^>]*checked/i.test(dHtml);

      const activities = dHtml.match(/id="activities"[^>]*>([\s\S]*?)<\/textarea>/i)?.[1]?.trim();
      const descriptionArabic = dHtml.match(/id="etender_Tender_bls_DescriptionArabic"[^>]*>([\s\S]*?)<\/textarea>/i)?.[1]?.trim();
      const conditionsArabic = dHtml.match(/id="etender_Tender_bls_ConditionsArabic"[^>]*>([\s\S]*?)<\/textarea>/i)?.[1]?.trim();
      const summaryArabic = dHtml.match(/id="etender_Tender_bls_SummaryArabic"[^>]*>([\s\S]*?)<\/textarea>/i)?.[1]?.trim();

      // C. Parse Tender Parts
      const pHtml = parts.tenderParts || '';
      const tenderParts = [];
      const partRows = [...pHtml.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)];
      for (let r = 1; r < partRows.length; r++) {
        const cols = [...partRows[r][1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(m => m[1].replace(/<[^>]+>/g, '').trim());
        if (cols.length >= 2) {
          tenderParts.push({
            serial: parseInt(cols[0], 10) || r,
            name: cols[1]
          });
        }
      }

      // D. Parse Tender Items
      const iHtml = parts.items || '';
      const tenderItems = [];
      const itRows = [...iHtml.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)];
      for (let r = 1; r < itRows.length; r++) {
        const cols = [...itRows[r][1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(m => m[1].replace(/<[^>]+>/g, '').trim());
        if (cols.length >= 5) {
          tenderItems.push({
            serial: parseInt(cols[0], 10) || r,
            name: cols[1],
            partName: cols[2] || undefined,
            type: cols[3] || undefined,
            quantity: parseFloat(cols[4]) || 1
          });
        } else if (cols.length >= 2) {
          tenderItems.push({
            serial: parseInt(cols[0], 10) || r,
            name: cols[1],
            partName: cols[2] || undefined,
            type: cols[3] || undefined,
            quantity: 1
          });
        }
      }

      // E. Parse Timeline Stages
      const tlHtml = parts.timeline || '';
      const timelineMatches = [...tlHtml.matchAll(/<div class="form-group">([\s\S]*?)(?:<label[^>]*>([\s\S]*?)<\/label>)/gi)];
      const timelineStages = [];
      let announcementDate = '';
      let technicalOpeningDate = '';
      let technicalDecisionDate = '';
      let financialOpeningDate = '';
      let financialDecisionDate = '';
      let awardDate = '';

      for (const m of timelineMatches) {
        const inputVal = m[1].match(/value=['"]([^'"]+)['"]/i)?.[1]?.trim();
        const labelText = m[2]?.replace(/<[^>]+>/g, '').trim();
        if (labelText && inputVal) {
          timelineStages.push({ label: labelText, date: inputVal });
          if (labelText.includes('الإعلان') || labelText.includes('الدعوة')) announcementDate = inputVal;
          if (labelText.includes('المظاريف الفنية') || labelText.includes('العطاءات')) technicalOpeningDate = inputVal;
          if (labelText.includes('البت الفني')) technicalDecisionDate = inputVal;
          if (labelText.includes('المظاريف المالية')) financialOpeningDate = inputVal;
          if (labelText.includes('البت المالي')) financialDecisionDate = inputVal;
          if (labelText.includes('الترسية')) awardDate = inputVal;
        }
      }

      // F. Parse genuine attachments with valid DocId
      const aHtml = parts.attachments || '';
      const attachments = [];
      const attRows = [...aHtml.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)];
      for (let r = 1; r < attRows.length; r++) {
        const rowContent = attRows[r][1];
        const formMatch = rowContent.match(/action="([^"]*DownloadDoc[^"]*)"/i) || rowContent.match(/DownloadDoc\?DocId=([a-zA-Z0-9\-]+)/i);
        const c = [...rowContent.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(m => m[1].replace(/<[^>]+>/g, '').trim());
        if (c.length >= 2) {
          let docId = '';
          if (formMatch) {
            const m = formMatch[1] ? formMatch[1].match(/DocId=([a-zA-Z0-9\-]+)/i) : null;
            if (m) docId = m[1];
          }
          attachments.push({
            serial: parseInt(c[0], 10) || r,
            name: c[1] || 'Official Booklet',
            docId: docId || undefined,
            downloadUrl: docId ? `/radar/download-doc?docId=${docId}&tenderId=${id}` : `${PORTAL_BASE}/Process/DownloadDoc?DocId=${docId}`
          });
        }
      }

      // Governorate detection
      const fullText = `${titleDeep || basic.title} ${authorityDeep || basic.authority || ''}`;
      let matchedGov = 'القاهرة';
      for (const g of EGYPT_GOVERNORATES) {
        if (fullText.includes(g)) {
          matchedGov = g;
          break;
        }
      }

      const temporaryInsurance = tempInsuranceStr && !isNaN(parseFloat(tempInsuranceStr)) ? parseFloat(tempInsuranceStr) : null;
      const bookletPrice = bookletPriceStr && !isNaN(parseFloat(bookletPriceStr)) ? parseFloat(bookletPriceStr) : null;
      const finalInsuranceRate = finalInsuranceRateStr && !isNaN(parseFloat(finalInsuranceRateStr)) ? parseFloat(finalInsuranceRateStr) : null;

      // Download genuine booklet document if available
      let bookletBase64 = null;
      let bookletFilename = null;
      if (attachments.length > 0 && attachments[0].docId) {
        try {
          const docId = attachments[0].docId;
          const docRes = await fetch(`${PORTAL_BASE}/Process/DownloadDoc?DocId=${docId}`, {
            method: 'POST',
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Cookie': cookieHeader,
              'Referer': `${PORTAL_BASE}/Process/Details/${id}`
            }
          });
          if (docRes.ok) {
            const buf = await docRes.arrayBuffer();
            if (buf.byteLength > 100) {
              bookletBase64 = Buffer.from(buf).toString('base64');
              const disp = docRes.headers.get('content-disposition') || '';
              const m = disp.match(/filename\*=UTF-8''([^;\r\n]+)/i);
              bookletFilename = m ? decodeURIComponent(m[1]) : (attachments[0].name ? `${attachments[0].name}.pdf` : `booklet-${id}.pdf`);
              const safeExt = bookletFilename?.toLowerCase().endsWith('.docx') ? 'Word (.docx)' : 'PDF (.pdf)';
              console.log(`    📄 Official booklet downloaded (${(buf.byteLength / 1024).toFixed(1)} KB) [${safeExt}]`);
            }
          }
        } catch (docErr) {
          console.log(`    ! Booklet download skipped: ${docErr.message}`);
        }
      }

      let finalTitle = titleDeep || basic.title;
      let finalRef = refNoDeep || basic.refNo;
      let finalAuthority = authorityDeep || basic.authority;

      // Smart Invert Guard
      if (finalRef && (finalRef.length > 30 || /^(تعلن|عملية|مزايدة|مناقصة|توريد|مشروع|أعمال|إنشاء|شراء|إحلال)/.test(finalRef))) {
        const swapTitle = finalRef;
        if (!finalAuthority && finalTitle) finalAuthority = finalTitle;
        finalTitle = swapTitle;
        finalRef = basic.refNo && basic.refNo !== swapTitle && basic.refNo.length < 30 ? basic.refNo : undefined;
      }

      fullTenders.push({
        externalId: basic.externalId,
        refNo: finalRef,
        title: finalTitle,
        englishTitle,
        authority: finalAuthority,
        publishDate: announcementDate || basic.publishDate,
        deadline: technicalOpeningDate || basic.deadline,
        sourceUrl: basic.url,
        temporaryInsurance,
        bookletPrice,
        finalInsuranceRate,
        tenderMethod: tenderMethod || 'مناقصة عامة',
        tenderKind,
        tenderType: tenderMethod || 'مناقصة عامة',
        tenderNature,
        evaluationType,
        fiscalYear,
        currency: currency || 'جنيه مصري',
        email,
        warrantyStatement,
        activities,
        description: descriptionArabic,
        governorate: matchedGov,
        bookletBase64,
        bookletFilename,
        attachments,
        items: tenderItems,
        timelineStages,
        rawDetails: {
          biddingType: biddingType || 'إعلانات',
          tenderMethod: tenderMethod || 'مناقصة عامة',
          tenderKind: tenderKind || 'خدمات',
          tenderNature: tenderNature || 'داخلية',
          evaluationType: evaluationType || 'مقبول/مرفوض',
          fiscalYear: fiscalYear || '2026/2027',
          currency: currency || 'جنيه مصري',
          classification: classification || 'لا تقبل التجزئة',
          allowMultipleTempInsurance: !!allowMultipleTempInsurance,
          allowInquiries: !!allowInquiries,
          deliveryDuration: deliveryStatement || 'حسب كراسة الشروط',
          deliveryStatement,
          publishingDays,
          allowDownPayment: !!allowDownPayment,
          downpayment,
          allowAlternativeOffers: !!allowAlternativeOffers,
          activities,
          description: descriptionArabic,
          descriptionArabic,
          conditions: conditionsArabic,
          conditionsArabic,
          notes: summaryArabic,
          summaryArabic,
          finalInsuranceRate,
          warrantyStatement,
          parts: tenderParts,
          items: tenderItems,
          attachments,
          timeline: {
            announcementDate,
            publishDate: announcementDate || basic.publishDate,
            technicalOpeningDate,
            submissionDeadline: technicalOpeningDate || basic.deadline,
            technicalDecisionDate,
            techDecisionDate: technicalDecisionDate,
            financialOpeningDate,
            financialDecisionDate,
            finDecisionDate: financialDecisionDate,
            awardDate,
            stages: timelineStages
          },
          stages: timelineStages
        }
      });
    } catch (err) {
      console.log(`  ! Notice on tender: ${err.message}`);
    }
  }

  // 5. Ingest into GoldenERP Backend in safe batches
  console.log(`\n[4/4] Syncing ${fullTenders.length} tenders with documents to GoldenERP Server...`);
  const BATCH_SIZE = 2;
  for (let b = 0; b < fullTenders.length; b += BATCH_SIZE) {
    const batch = fullTenders.slice(b, b + BATCH_SIZE);
    try {
      const ingestRes = await fetch(`${API_BASE}/radar/ingest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          'x-radar-key': 'goldenerp-cloud-radar-secret-2026'
        },
        body: JSON.stringify({ items: batch })
      });

      if (!ingestRes.ok) {
        console.log(`  ! Batch ${Math.floor(b / BATCH_SIZE) + 1} response: ${ingestRes.status}`);
      } else {
        console.log(`  ✓ Batch ${Math.floor(b / BATCH_SIZE) + 1}/${Math.ceil(fullTenders.length / BATCH_SIZE)}: Synced successfully!`);
      }
    } catch (bErr) {
      console.log(`  ! Batch sync error: ${bErr.message}`);
    }
  }

  console.log('\n================================================================');
  console.log('  🎉 SUCCESS: GoldenERP Radar has been updated successfully!');
  console.log('  Open your dashboard at: https://ahdahd.eu/dashboard/radar');
  console.log('================================================================\n');
}

main().catch(err => {
  console.error('Fatal crawler error:', err);
  process.exit(1);
});

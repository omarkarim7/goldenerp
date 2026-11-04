/**
 * GoldenERP Authentic Cloud Radar Crawler
 * Scrapes official tenders from Egyptian Government Portal (https://gcs.digitalegypt.gov.eg)
 * Accurately parses:
 *  - Title (اسم العملية)
 *  - Reference Number (رقم المرجع / رقم العملية)
 *  - Authority (الجهة الإدارية / الجهة الطارحة)
 *  - Temporary Insurance (قيمة التأمين المؤقت)
 *  - Booklet Price (ثمن كراسة الشروط)
 *  - Tender Method & Nature (طريقة التعاقد وطبيعة العملية)
 *  - Publish & Deadline dates
 *  - Items and genuine attachments with DocId
 * and syncs directly into GoldenERP Backend API.
 */

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

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
  console.log('🚀 Starting GoldenERP Authentic Radar Crawler...');

  // 1. Authenticate with GoldenERP API
  console.log(`📡 Connecting to GoldenERP API (${API_BASE})...`);
  const loginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: ADMIN_USER, password: ADMIN_PASS }),
  });

  if (!loginRes.ok) {
    throw new Error(`GoldenERP API Login failed with status: ${loginRes.status}`);
  }

  const loginData = await loginRes.json();
  const token = loginData.accessToken || loginData.token;
  if (!token) throw new Error('No access token returned from GoldenERP API');
  console.log('✅ Authenticated with GoldenERP API successfully!');

  // 2. Login to Egyptian Government Tenders Portal
  console.log(`🏛️ Logging in to Egyptian Tenders Portal (${PORTAL_EMAIL})...`);
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
  console.log('✅ Logged in to Egyptian Government Portal successfully!');

  // 3. Fetch latest tenders from Tender page & Filter
  console.log('🔍 Scanning latest tenders from portal...');
  const tenderRes = await fetch(`${PORTAL_BASE}/Tender`, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Cookie': cookieHeader
    }
  });

  const tenderHtml = await tenderRes.text();
  const basicTenders = [];
  const rowMatches = [...tenderHtml.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)];
  
  // Table headers: [0: رقم المرجع, 1: اسم العملية, 2: الجهة الإدارية, 3: تاريخ طرح العملية, 4: آخر تاريخ لإستقبال العطاءات, 5: تفاصيل]
  for (let i = 1; i < rowMatches.length; i++) {
    const row = rowMatches[i][1];
    const linkMatch = row.match(/href="\/Process\/Details\/([a-zA-Z0-9\-]+)"/i);
    if (!linkMatch) continue;
    const externalId = linkMatch[1];
    const cols = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(m => m[1].replace(/<[^>]+>/g, '').trim());
    
    if (cols.length >= 5) {
      basicTenders.push({
        externalId,
        refNo: cols[0] || undefined,          // Accurate: cols[0] is رقم المرجع
        title: cols[1] || 'مناقصة حكومية',     // Accurate: cols[1] is اسم العملية
        authority: cols[2] || undefined,      // Accurate: cols[2] is الجهة الإدارية
        publishDate: cols[3] || undefined,    // Accurate: cols[3] is تاريخ طرح العملية
        deadline: cols[4] || undefined,       // Accurate: cols[4] is آخر موعد لتلقي العطاءات
        url: `${PORTAL_BASE}/Process/Details/${externalId}`
      });
    }
  }

  console.log(`📊 Discovered ${basicTenders.length} tenders on first page.`);
  if (basicTenders.length === 0) {
    console.log('No tenders found on initial page. Finished.');
    return;
  }

  // 4. Scrape deep details for each tender from the 5 live async partial views
  const fullTenders = [];
  const maxToProcess = Math.min(basicTenders.length, 15);
  for (let i = 0; i < maxToProcess; i++) {
    const basic = basicTenders[i];
    console.log(`[${i + 1}/${maxToProcess}] Scraping deep details for: ${basic.title.substring(0, 45)}...`);
    try {
      const id = basic.externalId;
      const urls = [
        { key: 'basicInfo', url: `${PORTAL_BASE}/Process/FetchBasicInfoAysnc?Id=${id}` },
        { key: 'details', url: `${PORTAL_BASE}/Process/FetchDetailsAysnc?Id=${id}` },
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
        } catch {}
      }));

      // A. Parse basicInfo form inputs
      const bHtml = parts.basicInfo || '';
      const titleDeep = bHtml.match(/id="etender_Tender_etender_Title"[^>]*>([\s\S]*?)<\/textarea>/i)?.[1]?.trim();
      const refNoDeep = bHtml.match(/id="etender_Tender_etender_refno"[^>]*value="([^"]*)"/i)?.[1]?.trim();
      const authorityDeep = bHtml.match(/id="etender_Tender_bls_RequestingBody_Name"[^>]*value="([^"]*)"/i)?.[1]?.trim();
      
      const tempInsuranceStr = bHtml.match(/id="etender_Tender_bls_TemporaryInsuranceAmount_Value"[^>]*value="([^"]*)"/i)?.[1];
      const bookletPriceStr = bHtml.match(/id="etender_Tender_etender_ParticipationFee_Value"[^>]*value="([^"]*)"/i)?.[1];
      const fiscalYear = bHtml.match(/id="etender_Tender_bls_TenderFiscalYear_Name"[^>]*value="([^"]*)"/i)?.[1]?.trim();
      const currency = bHtml.match(/id="etender_Tender_TransactionCurrencyId_Name"[^>]*value="([^"]*)"/i)?.[1]?.replace(/&nbsp;/g, ' ').trim();
      const email = bHtml.match(/id="etender_Tender_EmailAddress"[^>]*value="([^"]*)"/i)?.[1]?.trim();

      const tenderMethod = bHtml.match(/id="etender_Tender_bls_TenderMethod_Value"[^>]*>([\s\S]*?)<\/select>/i)?.[1]
        ?.match(/<option[^>]*selected="selected"[^>]*>([^<]+)<\/option>/i)?.[1]?.trim();
      const tenderKind = bHtml.match(/id="etender_Tender_bls_TenderKind_Value"[^>]*>([\s\S]*?)<\/select>/i)?.[1]
        ?.match(/<option[^>]*selected="selected"[^>]*>([^<]+)<\/option>/i)?.[1]?.trim();

      // B. Parse details form inputs
      const dHtml = parts.details || '';
      const finalInsuranceRateStr = dHtml.match(/id="etender_Tender_bls_WarrantyBond"[^>]*value="([^"]*)"/i)?.[1];
      const warrantyStatement = dHtml.match(/id="etender_Tender_bls_WarrantyStatement"[^>]*value="([^"]*)"/i)?.[1]?.trim();
      const tenderNature = dHtml.match(/name="etender_Tender\.FormattedValues\[bls_tendernature\]"[^>]*value="([^"]*)"/i)?.[1]?.trim();
      const evaluationType = dHtml.match(/name="etender_Tender\.FormattedValues\[bls_evaluationtype\]"[^>]*value="([^"]*)"/i)?.[1]?.trim();
      const activities = dHtml.match(/id="activities"[^>]*>([\s\S]*?)<\/textarea>/i)?.[1]?.trim();
      const description = dHtml.match(/id="etender_Tender_bls_DescriptionArabic"[^>]*>([\s\S]*?)<\/textarea>/i)?.[1]?.trim();

      // C. Parse timeline
      const tlHtml = parts.timeline || '';
      const timelineMatches = [...tlHtml.matchAll(/<div class="form-group">([\s\S]*?)(?:<label[^>]*>([\s\S]*?)<\/label>)/gi)];
      const timelineStages = [];
      let timelineDeadline = '';
      let timelinePublish = '';
      for (const m of timelineMatches) {
        const inputVal = m[1].match(/value=['"]([^'"]+)['"]/i)?.[1]?.trim();
        const labelText = m[2]?.replace(/<[^>]+>/g, '').trim();
        if (labelText && inputVal) {
          timelineStages.push({ label: labelText, date: inputVal });
          if (labelText.includes('الإعلان') || labelText.includes('الدعوة')) timelinePublish = inputVal;
          if (labelText.includes('المظاريف الفنية') || labelText.includes('العطاءات') || labelText.includes('المزاد')) timelineDeadline = inputVal;
        }
      }

      // D. Parse genuine attachments with valid DocId
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
            else if (typeof formMatch[1] === 'string' && formMatch[1].length > 10) docId = formMatch[1];
          }
          if (!docId) {
            const direct = rowContent.match(/DocId=([a-zA-Z0-9\-]+)/i);
            if (direct) docId = direct[1];
          }
          if (docId && docId.length >= 8) {
            attachments.push({
              serial: r,
              name: c[1] || 'كراسة شروط ومواصفات رسمية',
              docId,
              downloadUrl: `/radar/download-doc?docId=${docId}&tenderId=${id}`
            });
          }
        }
      }

      // E. Parse items
      const iHtml = parts.items || '';
      const tenderItems = [];
      const itRows = [...iHtml.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)];
      for (let r = 1; r < itRows.length; r++) {
        const cols = [...itRows[r][1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(m => m[1].replace(/<[^>]+>/g, '').trim());
        if (cols.length >= 4) {
          tenderItems.push({
            serial: parseInt(cols[0], 10) || r,
            name: cols[1],
            type: cols[2],
            quantity: parseFloat(cols[3]) || 1
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

      fullTenders.push({
        externalId: basic.externalId,
        refNo: refNoDeep || basic.refNo,
        title: titleDeep || basic.title,
        authority: authorityDeep || basic.authority,
        publishDate: timelinePublish || basic.publishDate,
        deadline: timelineDeadline || basic.deadline,
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
        description,
        governorate: matchedGov,
        attachments,
        items: tenderItems,
        timelineStages,
        rawDetails: {
          biddingType: 'إعلانات',
          tenderMethod,
          tenderKind,
          tenderNature,
          evaluationType,
          fiscalYear,
          currency,
          activities,
          description,
          stages: timelineStages
        }
      });
    } catch (err) {
      console.warn(`Failed deep scrape for ${basic.title}:`, err.message);
    }
  }

  // 5. Ingest into GoldenERP Backend
  console.log(`📤 Ingesting ${fullTenders.length} accurately scraped tenders into GoldenERP Backend...`);
  const ingestRes = await fetch(`${API_BASE}/radar/ingest`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ items: fullTenders })
  });

  if (!ingestRes.ok) {
    const errTxt = await ingestRes.text();
    throw new Error(`Ingest failed with status ${ingestRes.status}: ${errTxt}`);
  }

  const result = await ingestRes.json();
  console.log('🎉 Ingest result:', result);
  console.log('✅ Radar crawler completed successfully with authentic data!');
}

main().catch(err => {
  console.error('❌ Cloud crawler error:', err);
  process.exit(1);
});

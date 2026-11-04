/**
 * Cloud Radar Crawler for GoldenERP
 * Runs autonomously in GitHub Actions (or any cloud runner) 24/7 for FREE.
 * Scrapes latest official tenders from https://gcs.digitalegypt.gov.eg
 * and pushes them directly to GoldenERP backend API on Hostinger.
 */

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const PORTAL_BASE = 'https://gcs.digitalegypt.gov.eg';
const PORTAL_EMAIL = process.env.RADAR_GCS_EMAIL || 'ahdahdahd8818@gmail.com';
const PORTAL_PASSWORD = process.env.RADAR_GCS_PASSWORD || 'Nnnn@8818';

const API_BASE = process.env.GOLDENERP_API_BASE || 'https://api.ahdahd.eu/api';
const ADMIN_USER = process.env.GOLDENERP_ADMIN_USER || 'ahd2026';
const ADMIN_PASS = process.env.GOLDENERP_ADMIN_PASS || 'Ahd@Golden#2026!Sec';

async function main() {
  console.log('🚀 Starting GoldenERP Cloud Radar Crawler...');

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
  const antiTokenMatch = tenderHtml.match(/name="__RequestVerificationToken"\s+type="hidden"\s+value="([^"]+)"/);
  const antiToken = antiTokenMatch ? antiTokenMatch[1] : '';

  const basicTenders = [];
  const rowMatches = [...tenderHtml.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)];
  for (let i = 1; i < rowMatches.length; i++) {
    const row = rowMatches[i][1];
    const linkMatch = row.match(/href="\/Process\/Details\/([a-zA-Z0-9\-]+)"/i);
    if (!linkMatch) continue;
    const externalId = linkMatch[1];
    const cols = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(m => m[1].replace(/<[^>]+>/g, '').trim());
    if (cols.length >= 4) {
      basicTenders.push({
        externalId,
        refNo: cols[1] || undefined,
        title: cols[2] || 'مناقصة حكومية',
        authority: cols[3] || undefined,
        publishDate: cols[4] || undefined,
        deadline: cols[5] || undefined,
        url: `${PORTAL_BASE}/Process/Details/${externalId}`
      });
    }
  }

  console.log(`📊 Discovered ${basicTenders.length} tenders on first page.`);
  if (basicTenders.length === 0) {
    console.log('No tenders found on initial page. Finished.');
    return;
  }

  // 4. Scrape deep details for the tenders
  const fullTenders = [];
  const maxToProcess = Math.min(basicTenders.length, 15);
  for (let i = 0; i < maxToProcess; i++) {
    const basic = basicTenders[i];
    console.log(`[${i + 1}/${maxToProcess}] Scraping tender: ${basic.title.substring(0, 40)}...`);
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

      // Parse attachments
      const aHtml = parts.attachments || '';
      const attachments = [];
      const attRows = [...aHtml.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)];
      for (let r = 1; r < attRows.length; r++) {
        const rowContent = attRows[r][1];
        const formMatch = rowContent.match(/action="([^"]*DownloadDoc[^"]*)"/i);
        const c = [...rowContent.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(m => m[1].replace(/<[^>]+>/g, '').trim());
        if (c.length >= 2) {
          let docId = '';
          if (formMatch) {
            const m = formMatch[1].match(/DocId=([a-zA-Z0-9\-]+)/i);
            if (m) docId = m[1];
          }
          if (docId && docId.length >= 8) {
            attachments.push({
              serial: r,
              name: c[1] || 'كراسة شروط ومواصفات',
              docId,
              downloadUrl: `/radar/download-doc?docId=${docId}&tenderId=${id}`
            });
          }
        }
      }

      // Parse items
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

      fullTenders.push({
        externalId: basic.externalId,
        refNo: basic.refNo,
        title: basic.title,
        authority: basic.authority,
        publishDate: basic.publishDate,
        deadline: basic.deadline,
        sourceUrl: basic.url,
        attachments,
        items: tenderItems,
        rawDetails: {
          attachments,
          items: tenderItems
        }
      });
    } catch (err) {
      console.warn(`Could not fetch details for tender ${basic.externalId}: ${err.message}`);
    }
  }

  // 5. Ingest into GoldenERP API
  console.log(`📤 Ingesting ${fullTenders.length} scraped tenders into GoldenERP Backend...`);
  const ingestRes = await fetch(`${API_BASE}/radar/ingest`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ items: fullTenders })
  });

  const ingestData = await ingestRes.json();
  console.log('🎉 Ingest result:', ingestData);
  console.log('✅ Cloud crawler completed successfully!');
}

main().catch(err => {
  console.error('❌ Cloud crawler failed:', err);
  process.exit(1);
});

import { PrismaClient } from '@prisma/client';
import { RadarScraperService } from '../src/radar/radar-scraper.service.js';

async function main() {
  const prisma = new PrismaClient();
  const s = new RadarScraperService(prisma as any);
  const cookies = await s.login();

  const list = await s.scrapeTendersList(1);
  console.log('Got tenders:', list.length);

  for (const t of list.slice(0, 4)) {
    console.log(`\n========================================`);
    console.log(`Tender: #${t.refNo} - ${t.title}`);
    console.log(`ID: ${t.externalId}`);
    const tlRes = await fetch(`https://gcs.digitalegypt.gov.eg/Process/FetchTenderTimeLineAysnc?Id=${t.externalId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        Cookie: cookies,
        'X-Requested-With': 'XMLHttpRequest',
      },
    });
    const html = await tlRes.text();

    // Match input and label within each form-group
    const matches = [...html.matchAll(/<div class="form-group">([\s\S]*?)(?:<label[^>]*>([\s\S]*?)<\/label>)/gi)];
    console.log(`Found ${matches.length} stage matches:`);
    for (const m of matches) {
      const inputVal = m[1].match(/value=['"]([^'"]+)['"]/i)?.[1]?.trim();
      const labelText = m[2]?.replace(/<[^>]+>/g, '').trim();
      console.log(`  Stage: [${labelText}] => [${inputVal}]`);
    }
  }

  await prisma.$disconnect();
}

main();

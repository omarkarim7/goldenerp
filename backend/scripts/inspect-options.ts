import { PrismaClient } from '@prisma/client';
import { RadarScraperService } from '../src/radar/radar-scraper.service.js';

async function main() {
  const prisma = new PrismaClient();
  const s = new RadarScraperService(prisma as any);
  const cookies = await s.login();

  const res = await fetch('https://gcs.digitalegypt.gov.eg/Tender', {
    headers: { 'User-Agent': 'Mozilla/5.0', Cookie: cookies },
  });
  const html = await res.text();

  const selects = [...html.matchAll(/<select[^>]*name=["']([^"']+)["'][^>]*>([\s\S]*?)<\/select>/gi)];
  for (const sel of selects) {
    console.log('\n========================================');
    console.log('SELECT NAME:', sel[1]);
    const opts = [...sel[2].matchAll(/<option[^>]*value=["']([^"']*)["'][^>]*>([^<]+)<\/option>/gi)];
    console.log('Count:', opts.length);
    for (const opt of opts.slice(0, 15)) {
      console.log('   opt:', opt[1], '=>', opt[2].trim());
    }
  }

  // Also let's inspect the first 10 tenders and their methods, kinds, classifications, and timelines!
  const list = await s.scrapeTendersList(1);
  console.log('\n========================================');
  console.log('INSPECTING ACTUAL TENDERS DETAILS:');
  for (const t of list) {
    const full = await s.scrapeTenderFullDetails(t);
    console.log(`\nRef: #${full.refNo} | ExternalId: ${full.externalId}`);
    console.log(`Title: ${full.title}`);
    console.log(`TenderMethod (طريقة الطرح): ${full.tenderMethod}`);
    console.log(`TenderKind (نوع العملية): ${full.tenderKind}`);
    console.log(`TenderNature (طبيعة الطرح): ${full.tenderNature}`);
    console.log(`BiddingType: ${full.biddingType}`);
    console.log(`Stages count: ${full.timeline?.stages?.length}`);
    if (full.timeline?.stages) {
      console.log('Stages:', full.timeline.stages.map(s => `${s.label} (${s.date})`).join(' | '));
    }
  }

  await prisma.$disconnect();
}

main();

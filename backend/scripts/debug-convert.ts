import { PrismaClient } from '@prisma/client';
import { RadarService } from '../src/radar/radar.service.js';
import { RadarScraperService } from '../src/radar/radar-scraper.service.js';
import { CompaniesService } from '../src/companies/companies.service.js';

const prisma = new PrismaClient();

async function main() {
  const scraper = new RadarScraperService(prisma as any);
  const companies = new CompaniesService(prisma as any);
  const radar = new RadarService(prisma as any, scraper, companies);

  const unimported = await prisma.radarItem.findFirst({
    where: { isImported: false },
  });

  if (!unimported) {
    console.log('No unimported items found!');
    return;
  }

  console.log('Found unimported item:', {
    id: unimported.id,
    title: unimported.title,
    matchedCompanyCode: unimported.matchedCompanyCode,
    tenderType: unimported.tenderType,
  });

  try {
    const res = await radar.convertToOperation(unimported.id, { companyCode: 'A' });
    console.log('SUCCESS RESULT:', res);
  } catch (err: any) {
    console.error('ERROR_CAUGHT:', err);
  }
}

main().finally(() => prisma.$disconnect());

import { PrismaClient } from '@prisma/client';
import { RadarService } from '../src/radar/radar.service.js';
import { RadarScraperService } from '../src/radar/radar-scraper.service.js';
import { CompaniesService } from '../src/companies/companies.service.js';

const prisma = new PrismaClient();

async function main() {
  const scraper = new RadarScraperService(prisma as any);
  const companies = new CompaniesService(prisma as any);
  const radar = new RadarService(prisma as any, scraper, companies);

  const id = 'cmv8odpy600059jtcpy5ll1dn';
  const userId = 'cmv8mi50b000u9j4k7no4rwee';
  console.log('Testing convert for item:', id, 'with userId:', userId);

  try {
    const res = await radar.convertToOperation(id, { companyCode: 'A' }, userId);
    console.log('CONVERT RESULT:', res);
  } catch (err: any) {
    console.error('ERROR MESSAGE:', err.message);
    console.error('ERROR STACK:', err.stack);
  }
}

main().finally(() => prisma.$disconnect());

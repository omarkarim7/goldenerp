import { PrismaClient } from '@prisma/client';
import { RadarScraperService } from '../src/radar/radar-scraper.service.js';

async function main() {
  console.log('===========================================================');
  console.log('  رادار التعاقدات الحكومية — GoldenERP Radar CLI Scraper');
  console.log('  المصدر: https://gcs.digitalegypt.gov.eg');
  console.log('===========================================================\n');

  const prisma = new PrismaClient();
  const scraper = new RadarScraperService(prisma as any);

  try {
    const pagesCount = process.argv[2] ? parseInt(process.argv[2], 10) : 2;
    console.log(`بدء الاتصال وفحص البوابة الحكومية (عدد الصفحات: ${pagesCount})...\n`);

    const result = await scraper.scan(pagesCount);

    console.log('\n-----------------------------------------------------------');
    console.log('✓ نتيجة الفحص المباشر:');
    console.log(`- إجمالي المناقصات المسحوبة: ${result.totalScanned}`);
    console.log(`- مناقصات جديدة أضيفت: ${result.newCount}`);
    console.log(`- مناقصات تم تحديث بياناتها: ${result.updatedCount}`);
    console.log(`- الرسالة: ${result.message}`);
    console.log('-----------------------------------------------------------\n');
  } catch (error: any) {
    console.error('❌ حدث خطأ أثناء تشغيل الفحص:', error.message || error);
  } finally {
    await prisma.$disconnect();
  }
}

main();

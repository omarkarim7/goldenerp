import fs from 'fs';
import path from 'path';
import JSZip from '../frontend/node_modules/jszip/lib/index.js';

async function createToolZip() {
  const zip = new JSZip();
  const dir = 'frontend/public/downloads';
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  zip.file('تحديث_الرادار_الحكومي.bat', fs.readFileSync('تحديث_الرادار_الحكومي.bat'));
  zip.file('scripts/cloud-crawler.mjs', fs.readFileSync('scripts/cloud-crawler.mjs'));
  zip.file('scripts/radar-local-bridge.mjs', fs.readFileSync('scripts/radar-local-bridge.mjs'));

  const readme = `================================================================
  GoldenERP - أداة فحص رادار التعاقدات الحكومية المصرية
================================================================

طريقة الاستخدام السريع:
1. تأكد من وجود برنامج Node.js على جهازك (إذا لم يكن مثبتاً، حمله مجاناً من https://nodejs.org).
2. اضغط مرتين على ملف: "تحديث_الرادار_الحكومي.bat"
3. اختر [1] لفحص وسحب المناقصات فوراً خلال 15 ثانية وتحديث موقعك ahdahd.eu.
   أو اختر [2] لتشغيل خادم الربط، وحينها يمكنك الضغط على زر "تشغيل فحص الرادار" مباشرة من موقع ahdahd.eu!

للدعم الفني:
فريق تطوير GoldenERP
================================================================`;

  zip.file('تعليمات_التشغيل.txt', readme.trim());

  const buf = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  fs.writeFileSync(path.join(dir, 'goldenerp-radar-tool.zip'), buf);
  console.log('Created goldenerp-radar-tool.zip, size:', (buf.length / 1024).toFixed(1), 'KB');
}

createToolZip();

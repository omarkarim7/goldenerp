import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const rootDir = process.cwd();
const frontendDir = path.join(rootDir, 'frontend');
const stagingDir = path.join(rootDir, 'temp_frontend_stage');
const outputZip = path.join(rootDir, 'goldenerp-frontend.zip');
const outputTar = path.join(rootDir, 'goldenerp-frontend.tar.gz');

console.log('📦 Starting clean frontend packaging for Hostinger Web Apps...');

if (fs.existsSync(stagingDir)) fs.rmSync(stagingDir, { recursive: true, force: true });
if (fs.existsSync(outputZip)) fs.unlinkSync(outputZip);
if (fs.existsSync(outputTar)) fs.unlinkSync(outputTar);

fs.mkdirSync(stagingDir, { recursive: true });

const itemsToCopy = [
  'src',
  'public',
  'package.json',
  'package-lock.json',
  'next.config.js',
  'next.config.ts',
  'postcss.config.mjs',
  'tsconfig.json',
  'components.json'
];

for (const item of itemsToCopy) {
  const src = path.join(frontendDir, item);
  const dest = path.join(stagingDir, item);
  if (fs.existsSync(src)) {
    const stat = fs.statSync(src);
    if (stat.isDirectory()) {
      fs.cpSync(src, dest, { recursive: true });
      console.log(`  📂 Copied directory: ${item}`);
    } else {
      fs.copyFileSync(src, dest);
      console.log(`  📄 Copied file: ${item}`);
    }
  }
}

// Copy compiled .next directory (excluding .next/cache to keep release package light and clean)
const nextSrc = path.join(frontendDir, '.next');
const nextDest = path.join(stagingDir, '.next');

if (fs.existsSync(nextSrc)) {
  console.log('  📂 Copying pre-built .next production bundle (excluding webpack cache)...');
  const copyWithoutCache = (src, dest) => {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    const entries = fs.readdirSync(src, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === 'cache') continue;
      const s = path.join(src, entry.name);
      const d = path.join(dest, entry.name);
      if (entry.isDirectory()) {
        copyWithoutCache(s, d);
      } else {
        fs.copyFileSync(s, d);
      }
    }
  };
  copyWithoutCache(nextSrc, nextDest);
  console.log('  ✅ Copied .next bundle (server, static css, chunks, manifests)');

  // For standalone runners (Node.js Web Apps): inject static and public into .next/standalone
  const standaloneDir = path.join(nextDest, 'standalone');
  if (fs.existsSync(standaloneDir)) {
    const standalonePublic = path.join(standaloneDir, 'public');
    const standaloneStatic = path.join(standaloneDir, '.next', 'static');
    const pubSrc = path.join(stagingDir, 'public');
    const staticSrc = path.join(nextDest, 'static');

    if (fs.existsSync(pubSrc)) fs.cpSync(pubSrc, standalonePublic, { recursive: true });
    if (fs.existsSync(staticSrc)) fs.cpSync(staticSrc, standaloneStatic, { recursive: true });
    console.log('  ✨ Injected static CSS and public assets into .next/standalone');
  }
}

// Copy .env with NEXT_PUBLIC_API_URL=https://api.ahdahd.eu
const envContent = `NEXT_PUBLIC_API_URL=https://api.ahdahd.eu\n`;
fs.writeFileSync(path.join(stagingDir, '.env'), envContent);
fs.writeFileSync(path.join(stagingDir, '.env.production'), envContent);
console.log('  🔒 Configured NEXT_PUBLIC_API_URL=https://api.ahdahd.eu');

// Create zip & tar.gz using tar.exe
console.log('🗜️ Compressing frontend archives with tar.exe...');
execSync(`tar.exe -a -cf "${outputZip}" -C "${stagingDir}" .`, { stdio: 'inherit' });
execSync(`tar.exe -czf "${outputTar}" -C "${stagingDir}" .`, { stdio: 'inherit' });

fs.rmSync(stagingDir, { recursive: true, force: true });

const zipStat = fs.statSync(outputZip);
console.log(`✅ Success! Packages created:`);
console.log(`   - ${outputZip} (${(zipStat.size / 1024).toFixed(1)} KB)`);
console.log(`   - ${outputTar}`);


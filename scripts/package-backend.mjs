import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const rootDir = process.cwd();
const backendDir = path.join(rootDir, 'backend');
const stagingDir = path.join(rootDir, 'temp_backend_stage');
const outputZip = path.join(rootDir, 'goldenerp-backend.zip');
const outputTar = path.join(rootDir, 'goldenerp-backend.tar.gz');

console.log('📦 Starting clean backend packaging for Hostinger Web Apps...');

// Clean existing
if (fs.existsSync(stagingDir)) fs.rmSync(stagingDir, { recursive: true, force: true });
if (fs.existsSync(outputZip)) fs.unlinkSync(outputZip);
if (fs.existsSync(outputTar)) fs.unlinkSync(outputTar);

fs.mkdirSync(stagingDir, { recursive: true });

// Files and folders to copy
const itemsToCopy = [
  'dist',
  'prisma',
  'src',
  'package.json',
  'package-lock.json',
  'tsconfig.json',
  'tsconfig.build.json',
  'nest-cli.json'
];

for (const item of itemsToCopy) {
  const src = path.join(backendDir, item);
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

// Copy .env.production as .env
const envProdSrc = path.join(backendDir, '.env.production');
const envDest = path.join(stagingDir, '.env');
fs.copyFileSync(envProdSrc, envDest);
console.log('  🔒 Injected production .env with Hostinger MySQL credentials');

// Create zip & tar.gz using tar.exe to preserve exact Linux POSIX permissions (755/644)
console.log('🗜️ Compressing archives with tar.exe (preserving POSIX permissions)...');
execSync(`tar.exe -a -cf "${outputZip}" -C "${stagingDir}" .`, { stdio: 'inherit' });
execSync(`tar.exe -czf "${outputTar}" -C "${stagingDir}" .`, { stdio: 'inherit' });

// Clean staging dir
fs.rmSync(stagingDir, { recursive: true, force: true });

const zipStat = fs.statSync(outputZip);
console.log(`✅ Success! Packages created:`);
console.log(`   - ${outputZip} (${(zipStat.size / 1024).toFixed(1)} KB)`);
console.log(`   - ${outputTar}`);

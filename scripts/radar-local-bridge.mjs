/**
 * GoldenERP Local Radar Bridge Server
 * Runs locally on user's machine in Egypt (127.0.0.1:4545).
 * Enables 1-click radar crawling directly from ahdahd.eu web interface.
 * Zero external dependencies (uses native Node.js http and fetch).
 */

import http from 'http';
import dns from 'dns';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

try { dns.setDefaultResultOrder('ipv4first'); } catch {}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 4545;
const HOST = '127.0.0.1';

let isScanning = false;
let lastLog = [];

function setCors(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-radar-key');
  res.setHeader('Access-Control-Allow-Private-Network', 'true');
}

const server = http.createServer((req, res) => {
  setCors(req, res);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  // Health / Ping check
  if (url.pathname === '/ping' || url.pathname === '/api/ping') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      ready: true,
      service: 'GoldenERP Local Radar Bridge',
      version: '2.0.0',
      isScanning,
      timestamp: new Date().toISOString(),
    }));
    return;
  }

  // Trigger live scan from Egyptian IP
  if ((url.pathname === '/scan' || url.pathname === '/api/scan') && req.method === 'POST') {
    if (isScanning) {
      res.writeHead(429, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: false,
        message: 'جاري فحص البوابة بالفعل حالياً، يرجى الانتظار بضع ثوانٍ.',
        isScanning: true,
      }));
      return;
    }

    isScanning = true;
    lastLog = [];

    const crawlerScript = path.join(__dirname, 'cloud-crawler.mjs');
    console.log(`[Radar Bridge] Launching crawler: ${crawlerScript}`);

    const child = spawn('node', [crawlerScript], {
      cwd: path.dirname(__dirname),
      env: {
        ...process.env,
        GOLDENERP_API_BASE: 'https://api.ahdahd.eu/api',
      },
    });

    child.stdout.on('data', (d) => {
      const msg = d.toString();
      process.stdout.write(msg);
      lastLog.push(msg);
    });

    child.stderr.on('data', (d) => {
      const msg = d.toString();
      process.stderr.write(msg);
      lastLog.push(msg);
    });

    child.on('close', (code) => {
      isScanning = false;
      console.log(`[Radar Bridge] Crawler finished with exit code ${code}`);
      res.writeHead(code === 0 ? 200 : 500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: code === 0,
        message: code === 0
          ? '✓ تم سحب أحدث العمليات وكراسات الشروط من بوابة التعاقدات وتحديث السيستم بنجاح!'
          : '⚠️ انتهت محاولة الفحص مع بعض الملاحظات.',
        exitCode: code,
        log: lastLog.slice(-10).join(''),
      }));
    });

    child.on('error', (err) => {
      isScanning = false;
      console.error('[Radar Bridge] Failed to spawn crawler:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: false,
        message: `فشل تشغيل الزاحف: ${err.message}`,
      }));
    });

    return;
  }

  // Last log endpoint
  if (url.pathname === '/logs') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      isScanning,
      logs: lastLog,
    }));
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Endpoint not found' }));
});

server.listen(PORT, HOST, () => {
  console.log('================================================================');
  console.log(`  🚀 GoldenERP Local Radar Bridge is running on http://${HOST}:${PORT}`);
  console.log('  📡 Ready to receive scan triggers from ahdahd.eu dashboard!');
  console.log('================================================================');
});

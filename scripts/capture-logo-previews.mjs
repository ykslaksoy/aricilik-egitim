#!/usr/bin/env node
/** Capture logo-sec option cards as PNG previews */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const HTML = process.env.LOGO_SEC_URL || 'http://127.0.0.1:8765/logo-sec.html';
const OUT_DIR = process.argv[2] || path.join(ROOT, '../cursor/stores/bc-248f96a3-12e3-4cef-a380-95c4c5b5ecb1/media');

fs.mkdirSync(OUT_DIR, { recursive: true });

const puppeteer = await import('puppeteer');

const browser = await puppeteer.default.launch({
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox']
});

const page = await browser.newPage();
await page.setViewport({ width: 520, height: 900, deviceScaleFactor: 2 });

for (let i = 1; i <= 10; i++) {
  await page.goto(HTML + '#logo-' + i, { waitUntil: 'networkidle0', timeout: 30000 });
  await page.waitForSelector('#logo-' + i, { timeout: 10000 });
  const el = await page.$('#logo-' + i);
  if (!el) {
    console.warn('Missing #logo-' + i);
    continue;
  }
  const out = path.join(OUT_DIR, 'logo-sec-' + String(i).padStart(2, '0') + '.png');
  await el.screenshot({ path: out, type: 'png' });
  console.log('Wrote', out);
}

await browser.close();

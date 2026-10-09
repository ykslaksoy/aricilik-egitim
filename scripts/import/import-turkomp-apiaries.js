#!/usr/bin/env node
/**
 * Turkomp / Tarım Bakanlığı arıcılık haritası — CSV şablonundan yerel JSON üretir.
 * Kullanım: node scripts/import/import-turkomp-apiaries.js [girdi.csv] [çıktı.json]
 */

const fs = require('fs');
const path = require('path');

const inPath =
  process.argv[2] ||
  path.join(__dirname, '../../data/seed/turkomp-apiaries.template.csv');
const outPath =
  process.argv[3] || path.join(__dirname, '../../data/seed/turkomp-apiaries.imported.json');

function parseCsv(text) {
  const lines = String(text).trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const cols = line.split(',');
    const row = {};
    headers.forEach((h, i) => {
      row[h] = (cols[i] || '').trim();
    });
    return row;
  });
}

const rows = parseCsv(fs.readFileSync(inPath, 'utf8'));
const apiaries = rows
  .filter((r) => r.lat && r.lon)
  .map((r, i) => ({
    id: `turkomp_${i + 1}`,
    name: r.apiary_name || r.name || `Arılık ${i + 1}`,
    il: r.il || '',
    ilce: r.ilce || '',
    koy: r.koy || '',
    lat: Number(r.lat),
    lon: Number(r.lon),
    registreNo: r.registre_no || '',
    notlar: r.notlar || '',
    source: 'turkomp_manual_import',
  }));

const out = {
  importedAt: new Date().toISOString(),
  sourceFile: path.basename(inPath),
  count: apiaries.length,
  apiaries,
};

fs.writeFileSync(outPath, JSON.stringify(out, null, 2), 'utf8');
console.log(`Wrote ${apiaries.length} apiaries → ${outPath}`);

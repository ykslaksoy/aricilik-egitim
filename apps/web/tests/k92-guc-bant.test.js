/* koloni-92: koloni gücü bantları her yerde güncel (0 = Yaşama sınırı altı, Çok zayıf 1–19 …); eski «0–19» yok; /favicon.ico var. */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const W = path.join(__dirname, '..') + path.sep;
const files = [];
(function walk(d) { for (const n of fs.readdirSync(d)) { const p = path.join(d, n); if (fs.statSync(p).isDirectory()) { if (!['tests', 'vendor', 'node_modules', '.vercel'].includes(n) && !n.startsWith('.')) walk(p); } else if (/\.(html|js)$/.test(n)) files.push(p); } })(W);
files.forEach((f) => { assert.ok(!/0\s?[–-]\s?19\b/.test(fs.readFileSync(f, 'utf8').replace(/10\s?[–-]\s?19/g, '')), 'eski bant: ' + path.basename(f)); });
const kv = fs.readFileSync(W + 'kovanlar.html', 'utf8');
/* k93: bantlar güncellendi (7 seviye) — ayrıntı tests/k93-guc-7.test.js */
assert.ok(kv.includes('Birleştirilmeli 0–44 (yaşama sınırının altı), Çok zayıf 45–59, Zayıf 60–69, Normal 70–79, Güçlü 80–89, Çok güçlü 90–100'));
assert.ok(fs.readFileSync(W + 'kovan-ara.js', 'utf8').includes('records.STRENGTH_LEVELS'));
assert.ok(fs.statSync(W + 'favicon.ico').size > 0 && fs.readFileSync(W + 'pwa.js', 'utf8').includes("rel: 'icon', href: '/favicon.ico'"));
assert.ok(fs.readFileSync(W + 'sw.js', 'utf8').includes('"/favicon.ico"'), 'SW listesinde favicon');
console.log('k92-guc-bant ok');

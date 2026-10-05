/* k97: ince durum şeridi + iPhone12 shell (?shot=1) + Kapsam sağ kestirmeler */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const nav = fs.readFileSync(path.join(root, 'nav.js'), 'utf8');
assert.ok(nav.includes('ensureStatusStrip') && nav.includes('sa-sb-batt-pct'));
assert.ok(nav.includes('isShotMode') && nav.includes('sa-shot'));
assert.ok(nav.includes('body.shot .status-bar,html.sa-shot .status-bar{display:flex!important') || nav.includes('.phone>.status-bar{display:none!important;}'));
assert.ok(nav.includes('.phone>.phone-notch,.phone>.home-indicator{display:none'));
assert.ok(nav.includes('k97 iPhone12 shell shot'));
const bk = fs.readFileSync(path.join(root, 'bk-kabuk.css'), 'utf8');
assert.ok(bk.includes('body.shot .phone') && bk.includes('flex-direction: column'));
assert.ok(bk.includes('display: flex !important'));
const bj = fs.readFileSync(path.join(root, 'bk-kabuk.js'), 'utf8');
assert.ok(bj.includes('sa-sb-batt-pct') && bj.includes('sa-sb-sig'));
const kv = fs.readFileSync(path.join(root, 'kovanlar.html'), 'utf8');
assert.ok(kv.includes('Elle tart') && kv.includes('topEnd: topEndV') && kv.includes('ksElleTart'));
assert.ok(kv.includes('Koloni gücü') || kv.includes(">Güç</a>"));
const pages = {
  'gorevler.html': '＋ Görev',
  'saglik.html': 'Detay',
  'uyarilar.html': 'Oğul',
  'goc.html': 'Yeni',
  'ekipman.html': 'Form',
  'bugun.html': 'Uyarı',
  'cihazlar.html': 'Bağlantı',
  'bakim-plan.html': 'Bakım',
  'stok.html': 'Alım'
};
Object.keys(pages).forEach(function (f) {
  const t = fs.readFileSync(path.join(root, f), 'utf8');
  assert.ok(t.includes('ks-end-chip') && t.includes(pages[f]), f + ' shortcut ' + pages[f]);
});
console.log('k97-status-strip ok');

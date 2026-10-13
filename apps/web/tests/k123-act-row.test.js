/* k123: Kapsam kartında [◀ Geri][ana eylem] (Muayene deseni) + Safari'de çerçeve görünen alanı doldurur */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const nav = fs.readFileSync(path.join(root, 'nav.js'), 'utf8');
['bakim-akis.html', 'kovanlar.html?tarti', 'kovanlar.html?koloni', 'kovanlar.html', 'gorevler.html', 'saglik.html', 'uyarilar.html?ogul', 'uyarilar.html', 'cihazlar.html', 'stok.html', 'bakim-plan.html'].forEach(function (k) {
  assert.ok(nav.includes("'" + k + "': {"), 'act row config ' + k);
});
assert.ok(!/'ana\.html': \{ t:|'bakim\.html': \{ t:/.test(nav), 'locked pages have no act row');
assert.ok(nav.includes('function ensureActRow') && nav.includes('scheduleActRow();'), 'act row mounted');
assert.ok(nav.includes('\\u25C0') && nav.includes('.sa-act-row>.sa-act-btn'), 'Geri styled as action with ◀');
assert.ok(nav.includes('.phone.phone{top:4px!important;left:4px!important;right:4px!important;bottom:4px!important'), 'frame fills Safari visible area');
assert.ok(!/visualViewport\.height/.test(nav), 'no visualViewport height');
console.log('k123 ok');

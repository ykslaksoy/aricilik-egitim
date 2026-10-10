/* k95: ‹ Geri + iPhone alt menü sabitleme + Muayene kovan kutuları tıklanabilir */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const nav = fs.readFileSync(path.join(root, 'nav.js'), 'utf8');
assert.ok(nav.includes('ensureBack') && nav.includes('sa-back') && nav.includes('goBack'));
assert.ok(nav.includes('ks-scope-nav-in-card'));
assert.ok(nav.includes('max-width:520px') && nav.includes('position:fixed') && nav.includes('safe-area-inset-bottom'));
assert.ok(nav.includes("BACK_SKIP") && nav.includes("'ana.html'") && nav.includes("'bakim.html'"));
assert.ok(nav.includes("'koloni-ek.html'") && nav.includes('kovanlar.html?view=koloni'));
assert.ok(nav.includes("from === 'ana'") && nav.includes("from === 'bakim'"));
const ak = fs.readFileSync(path.join(root, 'bakim-akis.html'), 'utf8');
assert.ok(ak.includes('href="bakim-akis.html?id=') && ak.includes("e.preventDefault(); start("));
assert.ok(!/<article class="tile/.test(ak), 'Muayene kutuları <a> olmalı');
const bk = fs.readFileSync(path.join(root, 'bk-kabuk.css'), 'utf8');
assert.ok(bk.includes('max-width:520px') && bk.includes('100dvh'));
console.log('k95-geri-nav ok');

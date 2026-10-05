/* k98: gercek telefonda sahte durum seridi yok; Ana kilitli (serit yok haric ?shot=1); pil uydurma yok */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const nav = fs.readFileSync(path.join(root, 'nav.js'), 'utf8');
assert.ok(nav.includes('.phone>.status-bar{display:none!important;}'));
assert.ok(nav.includes('body.shot .status-bar,html.sa-shot .status-bar{display:flex!important'));
assert.ok(nav.includes('function isAnaPage'));
assert.ok(nav.includes('if (isAnaPage() && !isShotMode()) return'));
assert.ok(nav.includes('sa-page-ana'));
assert.ok(nav.includes('if (isPhoneMobile() && !isShotMode()) return'));
assert.ok(!nav.includes('navigator.getBattery'), 'getBattery invent yok');
const bk = fs.readFileSync(path.join(root, 'bk-kabuk.css'), 'utf8');
assert.ok(bk.includes('status-bar') && bk.includes('display: none'));
console.log('k98-no-fake-status-phone ok');

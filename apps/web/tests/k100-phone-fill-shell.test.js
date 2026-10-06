/* k100: dinamik kabuk — telefon visualViewport doldur; resize/orientation/vv; postage-stamp yok */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const nav = fs.readFileSync(path.join(root, 'nav.js'), 'utf8');
assert.ok(nav.includes('fitIphone12Shell'), 'fit fn');
assert.ok(nav.includes('isPhoneMobile()'), 'phone branch');
assert.ok(nav.includes('html.sa-phone-mobile .phone') && nav.includes('position:fixed!important'), 'phone fills viewport (k101 fixed inset)');
assert.ok(nav.includes('html.sa-phone-mobile .phone'), 'phone CSS fill');
assert.ok(nav.includes("visualViewport.addEventListener('resize'"), 'vv resize recalcs');
assert.ok(nav.includes('orientationchange'), 'orientation');
assert.ok(nav.includes('requestAnimationFrame'), 'raf debounce');
assert.ok(nav.includes('scale > 2.5') || nav.includes('scale('), 'desktop continuous scale');
const bk = fs.readFileSync(path.join(root, 'bk-kabuk.css'), 'utf8');
assert.ok(bk.includes('k100: dar ekran'), 'bk k100');
assert.ok(bk.includes('position: fixed !important'), 'bk fill');
console.log('k100-phone-fill-shell ok');

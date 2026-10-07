/* k100/k104: dinamik kabuk — cerceve + stage; resize/orientation/vv */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const nav = fs.readFileSync(path.join(root, 'nav.js'), 'utf8');
assert.ok(nav.includes('fitIphone12Shell'), 'fit fn');
assert.ok(nav.includes('layoutPhoneStage') && nav.includes('border-radius:44px!important'), 'framed phone stage (k104)');
assert.ok(nav.includes('saPhoneStage'), 'stage wrapper');
assert.ok(nav.includes("visualViewport.addEventListener('resize'"), 'vv resize recalcs');
assert.ok(nav.includes('orientationchange'), 'orientation');
assert.ok(nav.includes('requestAnimationFrame'), 'raf debounce');
assert.ok(nav.includes('scale > 2.5') || nav.includes('scale('), 'continuous scale');
const bk = fs.readFileSync(path.join(path.join(__dirname, '..'), 'bk-kabuk.css'), 'utf8');
assert.ok(bk.includes('k104:'), 'bk k104');
console.log('k100-phone-fill-shell ok');

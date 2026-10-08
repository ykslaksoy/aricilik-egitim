/* k105: saat + Hardal + alt menu — tek kaydirma (.phone), .screen ic scroll yok */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const nav = fs.readFileSync(path.join(root, 'nav.js'), 'utf8');
const ana = fs.readFileSync(path.join(root, 'ana.html'), 'utf8');
assert.ok(nav.includes('html.sa-iphone12 .phone') && nav.includes('overflow-y:auto!important'), 'phone scrolls');
assert.ok(nav.includes('.phone>.screen') && nav.includes('overflow:visible!important'), 'screen not inner scroll');
assert.ok(ana.includes('overflow-y: auto') && ana.includes('flex-shrink: 0'), 'ana unified scroll');
console.log('k105-unified-scroll ok');

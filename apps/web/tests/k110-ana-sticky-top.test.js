/* k110: Ana üst şerit + hava kaydırırken sticky */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const nav = fs.readFileSync(path.join(root, 'nav.js'), 'utf8');
const ana = fs.readFileSync(path.join(root, 'ana.html'), 'utf8');

assert.ok(nav.includes('function ensureAnaStickyTop') && nav.includes('--sa-ana-brand-top'), 'k110 sticky helper');
assert.ok(nav.includes('html.sa-page-ana .brand-strip') && nav.includes('position:sticky'), 'brand sticky');
assert.ok(nav.includes('#weatherStrip') && nav.includes('--sa-ana-weather-top'), 'weather sticky');
assert.ok(nav.includes('sa-page-ana.sa-phone-mobile .phone>.status-bar') || nav.includes('sa-phone-mobile.sa-page-ana .phone>.status-bar'), 'Ana mobile status visible');
assert.ok(ana.includes('koloni-111'), 'ana cache bust');
console.log('k110-ana-sticky-top ok');

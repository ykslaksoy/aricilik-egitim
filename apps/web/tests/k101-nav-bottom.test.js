/* k101: alt menu her zaman ekran dibinde — telefon kabugu fixed inset:0 (vv.height yok); Ana hava karti kuculmez */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const nav = fs.readFileSync(path.join(root, 'nav.js'), 'utf8');
const fit = nav.slice(nav.indexOf('function fitIphone12Shell'), nav.indexOf('function ensureStatusStrip')).replace(/\/\*[\s\S]*?\*\//g, '');
assert.ok(!/global\.visualViewport|vv\.height/.test(fit), 'fit must not size from visualViewport (pinch-zoom/klavye)');
assert.ok(/innerHeight/.test(fit), 'layout viewport');
assert.ok(!nav.includes("visualViewport.addEventListener('scroll'"), 'no vv scroll listener');
assert.ok(nav.includes('position:fixed!important') && nav.includes('top:0!important;left:0!important;right:0!important;bottom:0!important;'), 'phone fixed inset 0');
assert.ok(nav.includes('.phone>.screen>*{flex-shrink:0!important;}'), 'screen children no shrink');
assert.ok(nav.includes('.phone>.screen>#weatherStrip') && nav.includes('min-height:min-content!important'), 'Ana weather keeps content height');
assert.ok(nav.includes('.phone>nav.tabbar{position:relative!important'), 'tabbar flex sibling at bottom');
const bk = fs.readFileSync(path.join(root, 'bk-kabuk.css'), 'utf8');
assert.ok(bk.includes('k101:') && bk.includes('position: fixed !important; top: 0 !important'), 'bk fixed');
const dr = fs.readFileSync(path.join(root, 'device-runtime.js'), 'utf8');
assert.ok(dr.includes('LOCKED 2026-09-23'), 'locked Ana safe layout untouched');
console.log('k101-nav-bottom ok');

/* k103: masaüstü — saat/alt menu cerceve icinde; ok ile sayfa kaydirma; stage boyutu scale ile */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const nav = fs.readFileSync(path.join(root, 'nav.js'), 'utf8');
assert.ok(nav.includes('saPhoneStage'), 'phone stage wrapper');
assert.ok(nav.includes('ensureShellPan'), 'pan controls');
assert.ok(nav.includes('sa-shell-desktop'), 'desktop shell class');
assert.ok(nav.includes('overflow-y:auto!important'), 'page scroll');
assert.ok(nav.includes('sa-shell-desktop'), 'desktop shell class');
assert.ok(nav.includes('k104'), 'unified frame');
assert.ok(nav.includes('ArrowUp'), 'keyboard pan');
assert.ok(nav.includes('.phone>.status-bar') && nav.includes('position:relative!important'), 'status bar in frame');
assert.ok(nav.includes('.phone>nav.tabbar') && nav.includes('position:relative!important'), 'tabbar in frame');
console.log('k103-shell-pan ok');

/* k110: mobil Safari — telefon genisligi doldurur (vh ile kucultme yok) */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const nav = fs.readFileSync(path.join(root, 'nav.js'), 'utf8');
assert.ok(nav.includes('computeShellScale'), 'scale helper');
assert.ok(nav.includes('shellFillWidth'), 'fill width mode');
assert.ok(nav.includes('sa-phone-fill'), 'fill CSS class');
assert.ok(nav.includes('vw / 390') && nav.includes('shellFillWidth(vw)'), 'width-first on mobile');
assert.ok(nav.includes('superari-shell-ready'), 'refit after bk-kabuk');
console.log('k106-phone-fill-width ok');

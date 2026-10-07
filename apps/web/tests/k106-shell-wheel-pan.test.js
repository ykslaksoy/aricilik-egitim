/* k106: saat / alt menu / kenar — tekerlek ve surukle ile sayfa kaydirma */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const nav = fs.readFileSync(path.join(root, 'nav.js'), 'utf8');
assert.ok(nav.includes('ensureShellWheel'), 'wheel hook');
assert.ok(nav.includes('screenCanScroll'), 'screen then page chain');
assert.ok(nav.includes('isShellChromeTarget'), 'chrome targets');
assert.ok(nav.includes('pointerdown'), 'drag pan on chrome');
assert.ok(nav.includes('cursor:grab'), 'grab cursor on status/tabbar');
console.log('k106-shell-wheel-pan ok');

/* k115: eski önbellekli kapsam.js (navChipsForView yok) Kovanlar/Tartı'yı boşaltmasın; Ana üst kısmı kayar */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const kv = fs.readFileSync(path.join(root, 'kovanlar.html'), 'utf8');
const ks = fs.readFileSync(path.join(root, 'ks-sayfa.js'), 'utf8');
const nav = fs.readFileSync(path.join(root, 'nav.js'), 'utf8');
assert.ok(!/[^?] (KS|KV)\.navChipsForView\(/.test(kv.replace(/(KS|KV)\.navChipsForView \? (KS|KV)\.navChipsForView\(/g, '')), 'kovanlar guarded');
assert.ok(ks.includes('!KS.navChipsForView ?'), 'ks-sayfa guarded');
assert.ok(nav.includes('k115: Ana') && nav.includes('#weatherStrip{position:relative!important;top:auto!important;}'), 'Ana top scrolls');
console.log('k115 ok');

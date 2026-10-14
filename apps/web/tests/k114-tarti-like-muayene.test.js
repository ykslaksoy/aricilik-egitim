/* k114: Kapsam basligi tek satir (secici satir ici, ayri Bakim cip satiri yok), Tarti 5 istatistik + kutucukta mini dugme yok */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const ks = fs.readFileSync(path.join(root, 'kapsam.js'), 'utf8');
const kv = fs.readFileSync(path.join(root, 'kovanlar.html'), 'utf8');
const nav = fs.readFileSync(path.join(root, 'nav.js'), 'utf8');
assert.ok(ks.includes('bk-scope-sel-inline') && ks.includes('split.back ? navChipLink(split.back)'), 'inline selector + card Geri pill');
assert.ok(nav.includes('.bk-scope-title-row>.bk-scope-sel-inline'), 'inline selector css');
assert.ok(kv.includes("'Ort. kg'") && kv.includes("l: '7 günde'") && !kv.includes('Tartılan (7 gün)'), 'tarti 5 short stats');
assert.ok(kv.includes('tile-act') && kv.includes('data-te-tart') && kv.includes('Elle tart'), 'tarti tiles: Tart / Elle tart');
assert.ok(kv.includes('tartiLastStatVal'), 'Son tartım uses last record');
console.log('k114 ok');

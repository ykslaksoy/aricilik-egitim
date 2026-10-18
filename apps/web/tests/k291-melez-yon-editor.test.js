/* koloni-291/292: yönlü melez — melezYon; kilitli tablo aynı; panel18 */
const assert = require('assert'), vm = require('vm'), fs = require('fs'), path = require('path');
const st = {}; const ls = { getItem: k => k in st ? st[k] : null, setItem: (k, v) => { st[k] = String(v) }, removeItem: k => { delete st[k] } };
const w = { localStorage: ls, addEventListener() {}, removeEventListener() {}, dispatchEvent() {}, CustomEvent: function () {}, Event: function () {}, console };
w.window = w; w.self = w; vm.createContext(w);
const web = path.join(__dirname, '..'), yon = path.join(web, '..', 'yonetici');
const src = fs.readFileSync(path.join(web, 'demo-data.js'), 'utf8'); vm.runInContext(src, w);
const C = w.SuperAriDemo.colony, R = w.SuperAriDemo.records;
const MK = 'Muğla ana × Kafkas baba', EK = 'Efe ana × Kafkas baba';
assert.strictEqual(C.genetikScore(MK).g, 45);
assert.strictEqual(C.genetikScore(EK).g, 30);
assert.strictEqual(Object.keys(C.GENETIK_MELEZ).length, 16);
var merged = C.melezYonMerge({ items: { mugla_kafkas: { genetik: 40, ozet: 'test özellik' } } });
w.SuperAriDemo.colony.ogulSkorSet({ melezYon: merged });
assert.strictEqual(C.genetikScore(MK).g, 40);
assert.strictEqual(R.crossInfo(MK).ozet, 'test özellik');
const p18 = fs.readFileSync(path.join(yon, 'panel18.js'), 'utf8');
['s-melez-yon', 'Arı genetikleri', 'melezYon', 'Hırçınlık'].forEach(t => assert.ok(p18.includes(t), t));
console.log('k291 ok');

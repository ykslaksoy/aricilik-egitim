/* k280: Cimil 1..25, Yanıkdağ 26..45 tek seferlik kovan no göçü (tüm yerel depolar + bulut anahtar eşlemesi) */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const src = fs.readFileSync(path.join(__dirname, '..', 'demo-data.js'), 'utf8');
assert.ok(src.includes("if (apiaryId === 'a5') return 0;") && src.includes("if (apiaryId === 'a4') return 25;"), 'idBlockFor');
function makeLS(init) {
  const m = new Map(Object.entries(init));
  return { get length() { return m.size; }, key: (i) => Array.from(m.keys())[i], getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), _m: m };
}
const U5 = '25e4092a-609e-4290-a256-d07d3a123958', U4 = '1c9a65b3-e187-42a3-a925-15b3080edc2d';
const aps = [{ id: 'a1', name: 'Kayaköy Ana Arılık' }, { id: 'a4', name: 'Yanıkdağ Baluğundüzü Arılığı' }, { id: 'a5', name: 'Cimil Yaylası Arılığı' }];
const hives = [{ id: 101, name: 'Kovan 101', apiaryId: 'a1' }];
for (let i = 0; i < 25; i++) hives.push({ id: 4080 + i, name: 'Kovan ' + (4080 + i), apiaryId: 'a5' });
for (let i = 0; i < 20; i++) hives.push({ id: 6218 + i, name: 'Kovan ' + (6218 + i), apiaryId: 'a4' });
const ls = makeLS({
  'superari.workMode': 'live',
  'superari.ariliklar.v1': JSON.stringify(aps),
  'superari.kovanlar.v1': JSON.stringify(hives),
  'superari.gorevler.v1': JSON.stringify([{ id: 't1', hiveId: 4080 }, { id: 't2', hiveId: 101 }, { id: 't3', hiveIds: [6218, '4104'] }]),
  'superari.tartiElle.v1': JSON.stringify({ 4081: [{ kg: 30 }], 101: [] }),
  'superari.bulut.state.v1': JSON.stringify({ keys: { 'hives:4080': U5 + ':4080', 'hives:6237': U4 + ':6237', 'hives:101': 'x:101' }, snap: { [U5 + ':4080']: { s: { key: U5 + ':4080' } } } })
});
const sandbox = { window: {}, localStorage: ls, document: { currentScript: null, addEventListener() {} }, console, setTimeout, clearTimeout };
sandbox.window.localStorage = ls; sandbox.globalThis = sandbox;
try { vm.runInNewContext(src, sandbox); } catch (e) { /* tarayıcı API eksikleri göçten sonra */ }
const H = JSON.parse(ls.getItem('superari.kovanlar.v1'));
const c = H.filter((h) => h.apiaryId === 'a5').map((h) => h.id), y = H.filter((h) => h.apiaryId === 'a4').map((h) => h.id);
assert.deepStrictEqual(c, Array.from({ length: 25 }, (_, i) => i + 1), 'Cimil 1..25');
assert.deepStrictEqual(y, Array.from({ length: 20 }, (_, i) => i + 26), 'Yanıkdağ 26..45');
assert.strictEqual(H.find((h) => h.id === 1).name, 'Kovan 1');
assert.strictEqual(H.find((h) => h.apiaryId === 'a1').id, 101, 'Kayaköy aynı');
const T = JSON.parse(ls.getItem('superari.gorevler.v1'));
assert.strictEqual(T[0].hiveId, 1); assert.strictEqual(T[1].hiveId, 101); assert.deepStrictEqual(T[2].hiveIds, [26, '25']);
assert.ok(JSON.parse(ls.getItem('superari.tartiElle.v1'))['2'], 'map anahtarı');
const S = JSON.parse(ls.getItem('superari.bulut.state.v1'));
assert.strictEqual(S.keys['hives:1'], U5 + ':1'); assert.strictEqual(S.keys['hives:45'], U4 + ':45'); assert.ok(!S.keys['hives:4080']);
assert.strictEqual(S.snap[U5 + ':4080'].s.key, U5 + ':4080', 'snap eski anahtar (silme işareti eski satıra)');
assert.strictEqual(ls.getItem('superari.kovanNoGoc.k280'), '1');
console.log('k280-kovan-no-goc ok');

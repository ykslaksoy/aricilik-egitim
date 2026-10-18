/* k283: Yeni tarayıcıda tek seferlik ana arı «tohumu» Canlı'da eksik ana yılı / sakinlik / oğul eğilimi / işaret UYDURMAZ (Tekman 100 kovan). Demo'da örnek veri sürer. */
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), path = require('path'), vm = require('vm');
const src = fs.readFileSync(path.join(__dirname, '..', 'demo-data.js'), 'utf8');
function makeLS(init) {
  const m = new Map(Object.entries(init));
  return { get length() { return m.size; }, key: (i) => Array.from(m.keys())[i], getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), _m: m };
}
function boot(init) {
  const ls = makeLS(init);
  const sb = { window: {}, localStorage: ls, document: { currentScript: null, addEventListener() {} }, console, setTimeout, clearTimeout };
  sb.window.localStorage = ls; sb.globalThis = sb;
  try { vm.runInNewContext(src, sb); } catch (e) { /* tarayıcı API eksikleri */ }
  const D = sb.window.SuperAriDemo || sb.SuperAriDemo;
  return { ls, D };
}
const aps = [{ id: 'a6', name: 'Tekman Arılığı' }, { id: 'a1', name: 'Kayaköy Ana Arılık' }];
const tek = []; for (let i = 46; i <= 100; i++) tek.push({ id: i, name: 'Kovan ' + i, apiaryId: 'a6', hiveType: 'langstroth_10' });
const real = { id: 101, name: 'Kovan 101', apiaryId: 'a1', queenYear: 2023, calmness: 2, swarmTendency: 'Yüksek', queenMarked: false, hiveType: 'langstroth_10' };
test('k283: Canlı yeni tarayıcı — Tekman kovanlarına ana yılı vb. uydurulmaz, gerçek kayıt aynen kalır', () => {
  const { ls, D } = boot({ 'superari.workMode': 'live', 'superari.ariliklar.v1': JSON.stringify(aps), 'superari.kovanlar.v1': JSON.stringify(tek.concat([real])) });
  assert.ok(D && D.loadHives, 'SuperAriDemo yüklendi');
  const H = D.loadHives();
  const T = H.filter((h) => h.apiaryId === 'a6');
  assert.strictEqual(T.length, 55);
  T.forEach((h) => {
    assert.ok(h.queenYear == null, 'queenYear uydurulmamalı: ' + h.id);
    assert.ok(h.calmness == null, 'calmness uydurulmamalı: ' + h.id);
    assert.ok(h.swarmTendency == null, 'swarmTendency uydurulmamalı: ' + h.id);
    assert.ok(h.queenMarked == null, 'queenMarked uydurulmamalı: ' + h.id);
    assert.strictEqual(D.colony.queenAge(h), null, 'yaş bilinmiyor');
  });
  const R = H.find((h) => h.id === 101);
  assert.strictEqual(R.queenYear, 2023); assert.strictEqual(R.calmness, 2); assert.strictEqual(R.swarmTendency, 'Yüksek'); assert.strictEqual(R.queenMarked, false);
  const saved = JSON.parse(ls.getItem('superari.kovanlar.v1')).filter((h) => h.apiaryId === 'a6');
  assert.ok(saved.every((h) => h.queenYear == null && h.calmness == null), 'depoya da yazılmaz');
});
test('k283: Demo modunda örnek ana verisi sürer (açıkça demo)', () => {
  const demoT = tek.map((h) => Object.assign({}, h));
  const { D } = boot({ 'superari.workMode': 'demo', 'superari.ariliklar.demo.v1': JSON.stringify(aps), 'superari.kovanlar.demo.v1': JSON.stringify(demoT) });
  const H = D.loadHives().filter((h) => h.apiaryId === 'a6');
  assert.ok(H.some((h) => h.queenYear != null), 'demo örnek yılı');
});

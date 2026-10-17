/* koloni-249: uçuş etiketi mevsime duyarlı + saat saat (günlük en yüksek değil) */
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), path = require('path'), vm = require('vm');
const W = path.join(__dirname, '..'), Y = path.join(__dirname, '../../yonetici');
const r = f => fs.readFileSync(path.join(W, f), 'utf8');
function el() { return new Proxy(function () {}, { get: (t, k) => k === 'classList' ? { toggle() {}, add() {}, remove() {} } : (k === 'querySelector' ? () => null : (k === 'querySelectorAll' ? () => [] : (k === 'innerHTML' || k === 'textContent' ? '' : el()))), set: () => true, apply: () => el() }); }
function ctx() {
  const store = {}, ls = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
  const c = { console, Date, Math, JSON, Number, String, Object, Array, RegExp, isFinite, Promise, URLSearchParams, setInterval() {}, setTimeout() {}, localStorage: ls,
    location: { search: '?apiary=a2', hash: '', href: '' }, history: { replaceState() {} }, navigator: { userAgent: '' }, fetch: () => new Promise(() => {}),
    document: { getElementById: () => el(), addEventListener() {}, querySelector: () => null, querySelectorAll: () => [], body: el(), createElement: () => el(), referrer: '' }, addEventListener() {}, dispatchEvent() {}, CustomEvent: function () {} };
  c.window = c; c.self = c; vm.createContext(c); vm.runInContext(r('demo-data.js'), c);
  vm.runInContext(r('hava-sayfa.js').replace(/\}\)\(\);\s*$/, ';window.__k249 = { flight: flight, sezon: sezon, FL: FL };})();'), c);
  return c;
}
test('k249: Tortum (yayla) uçuş mevsimi Ekim ortasında kapalı, Temmuz açık; yönetici elle dönemi geçerli', () => {
  const c = ctx(), C = c.SuperAriDemo.colony;
  assert.strictEqual(C.ucusSezon('a2', '2026-10-18').acik, false);
  assert.strictEqual(C.ucusSezon('a2', '2026-07-01').acik, true);
  const m = C.ogulSkorMerge({ ucusSezon: { a2: { from: '05-01', to: '10-30' }, bad: { from: '10-01', to: '05-01' } }, sensor: { ucusSezonYaylaBas: 999 } });
  assert.deepStrictEqual(Object.keys(m.ucusSezon), ['a2']);
  assert.strictEqual(m.sensor.ucusSezonYaylaBas, 415, 'geçersiz AAGG varsayılana döner');
  assert.strictEqual(C.mdNum(920), '09-20'); assert.strictEqual(C.mdNum(1332), null);
});
test('k249: mevsim dışında sıcak kuru gün «uygun» değil → temizlik uçuşu; yağmurlu gün → uçuş yok', () => {
  const c = ctx(), F = c.__k249;
  const hs = t => [10, 11, 12, 13, 14].map(h => ({ t: '2026-10-25T' + h + ':00', temp: t, mm: 0, pr: 10, wind: 6, rad: 600, day: 1 }));
  assert.strictEqual(F.flight({ date: '2026-10-25', hi: 17, lo: 4, mm: 0, pr: 14, wind: 6, hs: hs(17) }), 'tmz');
  assert.strictEqual(F.flight({ date: '2026-10-18', hi: 14, lo: 8, mm: 3.7, pr: 63, wind: 14, hs: hs(13) }), 'yok');
  assert.strictEqual(F.flight({ date: '2026-10-21', hi: 7, lo: 1, mm: 0, pr: 0, wind: 5, hs: hs(7) }), 'yok', '9 °C altı: uçuş yok (Burrill & Dietz 1981)');
  assert.strictEqual(F.FL.tmz, 'Temizlik uçuşu olabilir'); assert.strictEqual(F.FL.yok, 'Uçuş yok');
});
test('k249: mevsimde saat saat — olasılık tek başına ve öğleden sonra rüzgar zirvesi tüm günü «Uygun değil» yapmaz', () => {
  const c = ctx(), F = c.__k249;
  const day = (h, o) => Object.assign({ t: '2026-07-10T' + h + ':00', temp: 22, mm: 0, pr: 10, wind: 8, rad: 650, day: 1 }, o || {});
  const hs = [9, 10, 11, 12, 13, 14, 15, 16].map(h => day(h, h >= 15 ? { wind: 40 } : null));
  /* eski kural: günlük olasılık %65 ≥ %60 → «Uygun değil»; günlük en yüksek rüzgar 40 > 30 → «Uygun değil» */
  assert.strictEqual(F.flight({ date: '2026-07-10', hi: 23, lo: 12, mm: 0.2, pr: 65, wind: 40, hs }), 'ok');
  /* bulutlu (ışınım düşük) 13 °C: uygun saat yok, kısmen saat var → Kısmen (Vicens & Bosch 2000: ~300 W/m²) */
  const bulut = [10, 11, 12, 13].map(h => day(h, { temp: 13, rad: 150 }));
  assert.strictEqual(F.flight({ date: '2026-07-10', hi: 13, lo: 6, mm: 0, pr: 10, wind: 8, hs: bulut }), 'part');
  /* gece saatleri sayılmaz */
  const gece = [0, 1, 2, 3].map(h => day(h, { day: 0 }));
  assert.strictEqual(F.flight({ date: '2026-07-10', hi: 23, lo: 12, mm: 0, pr: 0, wind: 5, hs: gece }), 'no');
});
test('k249: yönetici ayarları, bayat önbellek, ortak dosyalar, sürüm', () => {
  const h = r('hava-sayfa.js'), p = fs.readFileSync(path.join(Y, 'panel10.js'), 'utf8'), pj = fs.readFileSync(path.join(Y, 'panel.js'), 'utf8');
  for (const k of ['ucusTemizlikC', 'ucusIsinimW', 'ucusSaatMin', 'ucusSezonYaylaBas', 'ucusSezonYaylaSon', 'ucusSezonYuksekSon']) assert.ok(p.includes("'s', '" + k + "'"), k);
  assert.ok(pj.includes('Arılık uçuş mevsimi') && pj.includes('o.ucusSezon'));
  assert.ok(h.includes('function fresh(d)') && h.includes('is_day,shortwave_radiation'));
  assert.ok(/okH = sezon\(/.test(h), 'saatlik 🐝 aynı ölçüt');
  assert.strictEqual(r('demo-data.js'), fs.readFileSync(path.join(Y, 'demo-data.js'), 'utf8'));
  assert.ok(Number(String(JSON.parse(r('version.json')).version).replace(/^koloni-/, '')) >= 249);
});

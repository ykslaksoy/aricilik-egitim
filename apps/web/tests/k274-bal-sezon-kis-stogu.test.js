/* koloni-274: sezonu kapanmış arılıkta kovandaki bal hasat edilmez → «Kovanda kalan (kış stoğu)»; yalnız sezondaki arılık (Kayaköy, çam balı 30 Kas) «Kovanda şimdi» */
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), path = require('path'), vm = require('vm');
const W = path.join(__dirname, '..'), Y = path.join(__dirname, '../../yonetici');
const r = f => fs.readFileSync(path.join(W, f), 'utf8');
function ctx(iso) {
  const FIX = Date.parse(iso + 'T12:00:00');
  class FD extends Date { constructor(...a) { if (a.length) super(...a); else super(FIX); } static now() { return FIX; } }
  const store = {}, ls = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
  const c = { console, Date: FD, Math, JSON, Number, String, Object, Array, RegExp, isFinite, Promise, URLSearchParams, setInterval() {}, setTimeout() {}, localStorage: ls,
    location: { search: '', hash: '', href: '' }, history: { replaceState() {} }, navigator: { userAgent: '' }, fetch: () => new Promise(() => {}),
    document: { getElementById: () => null, addEventListener() {}, querySelector: () => null, querySelectorAll: () => [], referrer: '' }, addEventListener() {}, dispatchEvent() {}, CustomEvent: function () {} };
  c.window = c; c.self = c; vm.createContext(c);
  vm.runInContext(r('demo-data.js'), c); vm.runInContext(r('bal-hedef.js'), c); vm.runInContext(r('tarti-dosemeler.js'), c);
  c.SuperAriBalAgirlik = { hiveHoneyNow: () => ({ netKg: 30, source: 'ornek' }) };
  return c;
}
test('k274: hasatSezonu — 18 Eki: Kayaköy (Muğla, çam balı) açık, yayla/ılıman arılıklar kapalı; 1 Ara Kayaköy de kapalı', () => {
  const B = ctx('2026-10-18').SuperAriBalHedef;
  assert.strictEqual(B.hasatSezonu('a1', '2026-10-18').acik, true);
  ['a2', 'a3', 'a4', 'a5'].forEach(id => assert.strictEqual(B.hasatSezonu(id, '2026-10-18').acik, false, id));
  assert.strictEqual(B.hasatSezonu('a1', '2026-12-01').acik, false);
});
test('k274: arılık başına elle dönem (yönetici) sezonu uzatır', () => {
  const c = ctx('2026-10-18');
  c.SuperAriDemo.colony.ogulSkorSet({ ucusSezon: { a2: { from: '04-15', to: '10-31' } } });
  assert.strictEqual(c.SuperAriBalHedef.hasatSezonu('a2', '2026-10-18').acik, true);
});
test('k274: Tartı döşemeleri — Bal (tahmin) yalnız sezondaki arılıklar; Hedef/Hasada hazır kış stoğunu saymaz', () => {
  const c = ctx('2026-10-18'), D = c.SuperAriDemo, TD = c.SuperAriTartiDoseme;
  const hs = D.loadHives().filter(h => h.colonyState !== 'sonuk');
  const nA1 = hs.filter(h => String(h.apiaryId) === 'a1').length, nKs = hs.length - nA1;
  assert.ok(nA1 > 0 && nKs > 0);
  const RT = TD.compute(hs), S = RT.sum;
  assert.strictEqual(S.nSz, nA1); assert.strictEqual(S.wKs, nKs);
  assert.strictEqual(S.balSz, Math.round(nA1 * 30 * 10) / 10);
  const t = {}; TD.tiles(RT).forEach(x => { t[x.key] = x; });
  /* koloni-278: alt yazı kapsam («sezonda X/N kovan tartılı»), «sezondaki arılıklar» ekran okuyucu metninde */
  assert.match(t.bal.sub, /^sezonda \d+\/\d+ kovan tartılı/); assert.match(t.bal.aria, /sezondaki arılıklar/); assert.match(t.bal.aria, /tartılı/);
  assert.strictEqual(t.bal.badge, '~' + (nA1 * 30).toLocaleString('tr-TR') + ' kg');
  const kis = hs.find(h => String(h.apiaryId) === 'a2');
  assert.strictEqual(RT.per[String(kis.id)].kisStogu, true);
  assert.ok(!RT.per[String(kis.id)].cats.hasat && !RT.per[String(kis.id)].cats.hedef, 'kış stoğu hasada hazır / hedefte sayılmaz');
  assert.match(TD.hiveBadge(RT.per[String(kis.id)]), /kış stoğu/);
  /* yalnız sezonu kapalı kapsam */
  const RK = TD.compute(hs.filter(h => String(h.apiaryId) === 'a2')), tk = {}; TD.tiles(RK).forEach(x => { tk[x.key] = x; });
  assert.match(tk.bal.sub, /kış stoğu/); assert.strictEqual(tk.hasat.badge, 'Sezon kapandı'); assert.strictEqual(tk.hedef.empty, true);
});
test('k274: rapor-bal Bal özeti — sezon kapalı «Kovanda kalan (kış stoğu)», genel toplamda sezondaki ve kış stoğu ayrı', () => {
  const s = r('rapor-bal.html');
  assert.match(s, /BH\.hasatSezonu\(a\.id\)/);
  assert.match(s, /cell\('Kovanda şimdi', /);
  assert.match(s, /cell\('Kovanda kalan \(kış stoğu\)'/);
  assert.match(s, /'Kovanda şimdi \(sezonda\)'/);
  assert.match(s, /hasat edilmez/);
});
test('k274: bal-hedef.js web ve yönetici aynı', () => {
  assert.strictEqual(r('bal-hedef.js'), fs.readFileSync(path.join(Y, 'bal-hedef.js'), 'utf8'));
});

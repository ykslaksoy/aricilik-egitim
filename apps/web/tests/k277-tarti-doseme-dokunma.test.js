/* koloni-277: Tartı döşemeleri — «Veri yok» döşemesi de dokununca seçilir, eşleşme yoksa kısa not; başlık ve döşemeler aynı tartım kaynağı (elle + cihaz);
   kullanıcıya eşik gösterilmez; bölgesi bilinmeyen arılık «Sezon kapandı» değil «Veri yok». */
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), path = require('path'), vm = require('vm');
const W = path.join(__dirname, '..');
const r = f => fs.readFileSync(path.join(W, f), 'utf8');
function ctx(iso, live) {
  const FIX = Date.parse(iso + 'T12:00:00');
  class FD extends Date { constructor(...a) { if (a.length) super(...a); else super(FIX); } static now() { return FIX; } }
  const store = {}, ls = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
  if (live) store['superari.workMode'] = 'live';
  const c = { console, Date: FD, Math, JSON, Number, String, Object, Array, RegExp, isFinite, Promise, URLSearchParams, setInterval() {}, setTimeout() {}, localStorage: ls,
    location: { search: '', hash: '', href: '' }, history: { replaceState() {} }, navigator: { userAgent: '' }, fetch: () => new Promise(() => {}),
    document: { getElementById: () => null, addEventListener() {}, querySelector: () => null, querySelectorAll: () => [], referrer: '' }, addEventListener() {}, dispatchEvent() {}, CustomEvent: function () {} };
  c.window = c; c.self = c; vm.createContext(c);
  vm.runInContext(r('demo-data.js'), c); vm.runInContext(r('bal-hedef.js'), c); vm.runInContext(r('tarti-dosemeler.js'), c);
  return c;
}
const html = r('kovanlar.html');
test('k277: «Veri yok» (tc-empty) döşemesine dokunma artık yok sayılmıyor', () => {
  const i = html.indexOf("ce.addEventListener('click'"), blk = html.slice(i, i + 600);
  assert.ok(i > 0); assert.doesNotMatch(blk, /tc-empty'\)\) return/);
  assert.doesNotMatch(html, /t\.key === tartiCat && !t\.empty/);
  assert.match(html, /Bu durumda kovan yok/);
  assert.match(html, /tc-none[^>]*min-height:44px/);
});
test('k277: başlık «önce tartısız» değil, tartılı sayısı (döşemelerle aynı kaynak)', () => {
  assert.doesNotMatch(html, /' kovan · önce tartısız'/);
  assert.match(html, /TD\.weighedCount\(RT\)/);
});
test('k277: canlıda elle tartım kaydı başlıkta ve Kış stoğu döşemesinde sayılır', () => {
  const c = ctx('2026-10-18', true), TD = c.SuperAriTartiDoseme;
  const recs = { 7: { kg: 40, at: '2026-10-17T10:00', source: 'elle' } };
  c.SuperAriTarti = { latest: id => recs[id] || null, series: () => [], scaleDevice: () => null };
  c.SuperAriBalAgirlik = { hiveHoneyNow: h => recs[h.id] ? { netKg: 18, source: 'elle', at: recs[h.id].at } : { none: true } };
  const hs = [{ id: 7, apiaryId: 'a4' }, { id: 8, apiaryId: 'a4' }];
  const RT = TD.compute(hs); assert.strictEqual(TD.weighedCount(RT), 1);
  const t = {}; TD.tiles(RT).forEach(x => { t[x.key] = x; });
  assert.notStrictEqual(t.kis.badge, 'Veri yok');
});
test('k277: döşeme alt yazılarında eşik (kg, ≥) yok', () => {
  const c = ctx('2026-10-18'), D = c.SuperAriDemo, TD = c.SuperAriTartiDoseme;
  c.SuperAriBalAgirlik = { hiveHoneyNow: () => ({ netKg: 30, source: 'ornek' }) };
  const RT = TD.compute(D.loadHives().filter(h => h.colonyState !== 'sonuk'));
  TD.tiles(RT).forEach(x => { if (x.key !== 'bal') assert.doesNotMatch(x.sub, /≥|kg/, x.key + ': ' + x.sub); });
});
test('k277: bölgesi bilinmeyen arılık «Sezon kapandı» değil «Veri yok»', () => {
  const c = ctx('2026-10-18', true), D = c.SuperAriDemo, TD = c.SuperAriTartiDoseme;
  D.apiaryById = id => (id === 'x1' ? { id: 'x1', name: 'Yeni Arılık' } : id === 'x2' ? { id: 'x2', name: 'Kayaköy', il: 'Muğla' } : null);
  assert.strictEqual(c.SuperAriBalHedef.hasatSezonu('x1').bilinmiyor, true);
  c.SuperAriTarti = { latest: () => null, series: () => [], scaleDevice: () => null };
  c.SuperAriBalAgirlik = { hiveHoneyNow: () => ({ none: true }) };
  const t = {}; TD.tiles(TD.compute([{ id: 1, apiaryId: 'x1' }])).forEach(x => { t[x.key] = x; });
  assert.strictEqual(t.hedef.badge, 'Veri yok'); assert.strictEqual(t.hasat.badge, 'Veri yok');
});

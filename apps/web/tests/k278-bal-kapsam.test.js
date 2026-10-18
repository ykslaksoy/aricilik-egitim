/* koloni-278: Bal (tahmin) / Hedef kapsam («X/N kovan tartılı»), az tartım notu (eşik kullanıcıya gösterilmez),
   Hedef % yalnız tartılı kovanların hedefi, Kış stoğu sayı gösterir, Bal seçiliyken kovan rozeti net bal. */
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), path = require('path'), vm = require('vm');
const W = path.join(__dirname, '..');
const r = f => fs.readFileSync(path.join(W, f), 'utf8');
function ctx(iso) {
  const FIX = Date.parse(iso + 'T12:00:00');
  class FD extends Date { constructor(...a) { if (a.length) super(...a); else super(FIX); } static now() { return FIX; } }
  const store = { 'superari.workMode': 'live' }, ls = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
  const c = { console, Date: FD, Math, JSON, Number, String, Object, Array, RegExp, isFinite, Promise, URLSearchParams, setInterval() {}, setTimeout() {}, localStorage: ls,
    location: { search: '', hash: '', href: '' }, history: { replaceState() {} }, navigator: { userAgent: '' }, fetch: () => new Promise(() => {}),
    document: { getElementById: () => null, addEventListener() {}, querySelector: () => null, querySelectorAll: () => [], referrer: '' }, addEventListener() {}, dispatchEvent() {}, CustomEvent: function () {} };
  c.window = c; c.self = c; vm.createContext(c);
  vm.runInContext(r('demo-data.js'), c); vm.runInContext(r('bal-hedef.js'), c); vm.runInContext(r('tarti-dosemeler.js'), c);
  return c;
}
function kayakoy(nW, net) {
  const c = ctx('2026-10-18'), TD = c.SuperAriTartiDoseme;
  c.SuperAriDemo.apiaryById = id => ({ id, name: 'Kayaköy Ana Arılık', il: 'Muğla' });
  c.SuperAriBalHedef.hasatSezonu = () => ({ acik: true });
  c.SuperAriBalHedef.arilikHedef = () => ({ perHiveKg: 15.4 });
  const hs = Array.from({ length: 42 }, (_, i) => ({ id: 101 + i, apiaryId: 'a1' }));
  c.SuperAriTarti = { latest: id => (id < 101 + nW ? { kg: 42, at: '2026-10-18T10:00', source: 'elle' } : null), series: () => [], scaleDevice: () => null };
  c.SuperAriBalAgirlik = { hiveHoneyNow: h => (h.id < 101 + nW ? { netKg: net, source: 'elle', at: '2026-10-18T10:00' } : { none: true }) };
  const RT = TD.compute(hs), t = {}; TD.tiles(RT).forEach(x => { t[x.key] = x; });
  return { c, TD, RT, t };
}
test('k278: 1/42 tartılı → Bal kapsam + az tartım, eşik görünmez', () => {
  const { t } = kayakoy(1, 23.5);
  assert.strictEqual(t.bal.badge, '~24 kg');
  assert.match(t.bal.sub, /^1\/42 kovan tartılı · az\u00a0tartım$/);
  assert.doesNotMatch(t.bal.sub + t.hedef.sub, /%|≥|50/);
});
test('k278: Hedef alt yazı X/N kovan, % yalnız tartılı kovanların hedefi', () => {
  const { t } = kayakoy(1, 23.5);
  assert.strictEqual(t.hedef.badge, '%' + Math.round(23.5 / 15.4 * 100));
  assert.match(t.hedef.sub, /^1\/42 kovan · az\u00a0tartım$/);
  const b = kayakoy(30, 10).t;
  assert.strictEqual(b.hedef.badge, '%65'); assert.strictEqual(b.hedef.sub, '30/42 kovan · 0\u00a0hedefte');
  assert.strictEqual(b.bal.sub, '30/42 kovan tartılı');
});
test('k278: Kış stoğu sayı gösterir (✓ değil); Hasada hazır 0 kovan', () => {
  const { t } = kayakoy(1, 23.5);
  assert.strictEqual(t.kis.badge, '0 kovan'); assert.strictEqual(t.kis.sub, 'stok yetersiz');
  assert.strictEqual(t.hasat.badge, '0 kovan');
  assert.strictEqual(kayakoy(3, 12).t.kis.badge, '3 kovan');
  assert.strictEqual(kayakoy(0, 0).t.kis.badge, 'Veri yok');
});
test('k278: Bal seçiliyken liste tartılı kovanlar, rozet net bal', () => {
  const { RT, TD } = kayakoy(1, 23.5);
  assert.deepStrictEqual(Object.keys(RT.per).filter(k => RT.per[k].cats.bal), ['101']);
  assert.strictEqual(TD.hiveNetBadge(RT.per['101']), '~23,5 kg');
  const html = r('kovanlar.html');
  assert.match(html, /tartiCat === 'bal' && TD && TD\.hiveNetBadge/);
  assert.match(html, /'brüt ' \+ x\.gross/);
});
test('k278: eşik yönetici ayarında (uzman tahmini), varsayılan 50; iki bal-hedef.js aynı', () => {
  const c = ctx('2026-10-18');
  assert.strictEqual(c.SuperAriBalHedef.DEF.kapsamAzYuzde, 50);
  assert.strictEqual(c.SuperAriBalHedef.merge({ kapsamAzYuzde: 30 }).kapsamAzYuzde, 30);
  assert.strictEqual(r('bal-hedef.js'), fs.readFileSync(path.join(W, '../yonetici/bal-hedef.js'), 'utf8'));
  const p = fs.readFileSync(path.join(W, '../yonetici/panel16.js'), 'utf8');
  assert.match(p, /kapsamAzYuzde/); assert.match(p, /yalnız o kovanların/);
});

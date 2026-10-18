/* koloni-279: Oğul sayfası — mevsim dışındaki kovan yalnız «Mevsim dışı»nda sayılır (Düşük / Orta'da ayrıca sayılmaz; Yüksek / Kritik kendi düzeyinde);
   Muğla (sıcak bölge) Ekim'de oğul mevsimi dışı (çam balı bal akımı oğul mevsimi değil); bölge bilinmiyorsa «Veri yok»; kaynaklar yalnız yönetici. */
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), path = require('path'), vm = require('vm');
const W = path.join(__dirname, '..');
const r = f => fs.readFileSync(path.join(W, f), 'utf8');
function ctx(iso) {
  const FIX = Date.parse(iso + 'T12:00:00');
  class FD extends Date { constructor(...a) { if (a.length) super(...a); else super(FIX); } static now() { return FIX; } }
  const store = {}, ls = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
  const c = { console, Date: FD, Math, JSON, Number, String, Object, Array, RegExp, isFinite, Promise, URLSearchParams, setInterval() {}, setTimeout() {}, localStorage: ls,
    location: { search: '', hash: '', href: '' }, history: { replaceState() {} }, navigator: { userAgent: '' }, fetch: () => new Promise(() => {}),
    document: { getElementById: () => null, addEventListener() {}, querySelector: () => null, querySelectorAll: () => [], referrer: '' }, addEventListener() {}, dispatchEvent() {}, CustomEvent: function () {} };
  c.window = c; c.self = c; vm.createContext(c);
  vm.runInContext(r('demo-data.js'), c);
  return c;
}
test('k279: swarmBucket — mevsim dışı Düşük/Orta yalnız «mevsimdisi», Yüksek/Kritik kendi düzeyinde, bölge bilinmiyorsa ayrılmaz', () => {
  const B = ctx('2026-10-18').SuperAriDemo.colony.swarmBucket;
  const dis = { phase: 'disi' };
  assert.strictEqual(B({ key: 'orta', season: dis }), 'mevsimdisi');
  assert.strictEqual(B({ key: 'dusuk', season: dis }), 'mevsimdisi');
  assert.strictEqual(B({ key: 'yuksek', season: dis }), 'yuksek');
  assert.strictEqual(B({ key: 'kritik', season: dis }), 'kritik');
  assert.strictEqual(B({ key: 'orta', season: { phase: 'zirve' } }), 'orta');
  assert.strictEqual(B({ key: 'orta', season: { phase: 'disi', bilinmiyor: true } }), 'orta');
});
test('k279: Muğla (sıcak) 18 Ekim oğul mevsimi dışı; döşemeler ayrık (toplam = kovan sayısı)', () => {
  const D = ctx('2026-10-18').SuperAriDemo, C = D.colony;
  const s = C.swarmSeason('a1', '2026-10-18');
  assert.strictEqual(s.profile, 'sicak'); assert.strictEqual(s.phase, 'disi'); assert.ok(!s.bilinmiyor);
  assert.strictEqual(C.swarmSeason('a1', '2026-04-10').phase, 'zirve');
  const hs = D.loadHives().filter(h => String(h.apiaryId) === 'a1'); assert.ok(hs.length > 0);
  const cnt = {}; hs.forEach(h => { const b = C.swarmBucket(C.swarm(h)); cnt[b] = (cnt[b] || 0) + 1; });
  assert.ok(!cnt.dusuk && !cnt.orta, 'mevsim dışı kovan Düşük / Orta’da sayılmaz');
  assert.strictEqual(Object.values(cnt).reduce((a, b) => a + b, 0), hs.length);
});
test('k279: bölgesi bilinmeyen arılık → mevsim «Veri yok»', () => {
  const C = ctx('2026-10-18').SuperAriDemo.colony;
  assert.strictEqual(C.swarmSeason('yok-arilik-x', '2026-10-18').bilinmiyor, true);
});
test('k279: oğul sayfası döşemeleri r.b ile sayar; kaynaklar kullanıcı sayfasında yok, yöneticide var', () => {
  const U = r('uyarilar.html');
  assert.match(U, /cnt\[r\.b\]/); assert.match(U, /nMd = cnt\.mevsimdisi/); assert.match(U, /return r\.b === want;/);
  assert.match(U, /Veri yok \(bölge bilinmiyor\)/);
  assert.doesNotMatch(U, /TÜRKPATENT|Tiemann|uzman tahmini/);
  assert.match(r('ana.html'), /swarmBucket\(a\)[^;]*;\s*if \(bk === 'orta'\)/);
  const P = fs.readFileSync(path.join(W, '..', 'yonetici', 'panel.js'), 'utf8');
  assert.match(P, /Otomatik pencereler uzman tahmini/); assert.match(P, /Tiemann &amp; Brückner 1993/);
  assert.strictEqual(r('demo-data.js'), fs.readFileSync(path.join(W, '..', 'yonetici', 'demo-data.js'), 'utf8'));
  const M = fs.readFileSync(path.join(W, '..', '..', 'supabase', 'migrations', '20261018200000_k279_ogul_mevsim_disi.sql'), 'utf8');
  assert.match(M, /uzman tahmini/); assert.match(M, /yapilacaklar/);
});

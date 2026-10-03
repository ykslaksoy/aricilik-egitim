/* Fiyat / Mevcut alanı boşaltılınca geri dönüş (koloni-67):
 * - satır ₺ alanı boş → sizin fiyatınız silinir, önerilen (kaynak ortalaması) fiyat
 * - açık talepte tahmini fiyat boş → talebin kayıttaki (anlık görüntü) tahmini fiyatı; ödenen fiyatlar korunur
 * - Mevcut boş → 0
 * - stok.html: boş + change VE blur (focusout) işlenir */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const W = path.join(__dirname, '..') + path.sep;
const MODS = ['demo-data.js', 'ilac-katalog.js', 'bakim-plan.js', 'stok-talep.js'];
const RealDate = Date;
function load(iso) {
  const FIX = new RealDate(iso + 'T12:00:00+03:00').getTime();
  class FakeDate extends RealDate { constructor(...a) { if (a.length) super(...a); else super(FIX); } static now() { return FIX; } }
  globalThis.Date = FakeDate;
  const mem = {};
  globalThis.window = globalThis;
  globalThis.localStorage = { getItem: (k) => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: (k) => { delete mem[k]; }, key: (i) => Object.keys(mem)[i], get length() { return Object.keys(mem).length; } };
  globalThis.document = { addEventListener() {}, querySelector() { return null; }, querySelectorAll() { return []; }, createElement() { return { style: {}, setAttribute() {}, appendChild() {} }; }, documentElement: { style: {} }, readyState: 'complete', body: null };
  globalThis.addEventListener = () => {}; globalThis.dispatchEvent = () => {};
  globalThis.location = { href: 'http://x/stok.html', search: '', pathname: '/stok.html', hash: '' };
  globalThis.navigator = { onLine: true };
  ['SuperAriDemo', 'SuperAriIlac', 'SuperAriPlan', 'SuperAriTalep'].forEach((k) => { delete globalThis[k]; });
  MODS.forEach((f) => { delete require.cache[require.resolve(W + f)]; require(W + f); });
  return globalThis.SuperAriTalep;
}


const T = load('2026-10-03');
const REFD = { updated: '2026-10-03', currency: 'TRY', items: [
  { key: 'seker', name: 'Şeker', unit: 'kg', ref: 40, min: 36, max: 45, n: 5, sources: [] },
  { key: 'nitril', name: 'Nitril', unit: 'paket', ref: 250, min: 200, max: 300, n: 4, sources: [] }] };

T.withRef(REFD, () => {
  /* 1) satır fiyatı: kendi fiyatı → boş → kaynak ortalaması */
  T.setPrice('seker', '75');
  let p = T.priceFor('seker');
  assert.strictEqual(p.src, 'user'); assert.strictEqual(p.v, 75);
  T.setPrice('seker', '');
  p = T.priceFor('seker');
  assert.strictEqual(T.userPrice('seker'), null, 'sizin fiyatınız silindi');
  assert.strictEqual(p.src, 'ref'); assert.strictEqual(p.v, 40, 'önerilen fiyata döndü');
  assert.strictEqual(p.ref.n, 5);

  /* 2) açık talep: tahmini fiyat değiştir → boşalt → kayıttaki tahmini fiyat */
  const rq = T.build('a2');
  const t0 = T.saveTalep(rq, 'Tortum');
  const i = t0.lines.findIndex((l) => l.key === 'seker');
  assert.ok(i >= 0);
  const est = t0.lines[i].price, cost0 = t0.lines[i].cost, total0 = t0.total;
  assert.strictEqual(est, 40); assert.strictEqual(t0.lines[i].priceSrc, 'ref');
  /* önce kısmi alım: ödenen fiyat 47 */
  T.recordPurchase(t0.id, [{ i, q: 10, p: 47 }], { stock: false, savePrice: false });
  let t1 = T.setTalepLinePrice(t0.id, i, '55');
  assert.strictEqual(t1.lines[i].price, 55); assert.strictEqual(t1.lines[i].priceSrc, 'user');
  assert.ok(t1.total > total0);
  t1 = T.setTalepLinePrice(t0.id, i, '60'); /* ikinci düzenleme: geri dönüş noktası ilk anlık görüntü kalır */
  const t2 = T.clearTalepLinePrice(t0.id, i);
  assert.ok(t2, 'geri alındı');
  const l2 = t2.lines[i];
  assert.strictEqual(l2.price, est, 'kayıttaki tahmini fiyat');
  assert.strictEqual(l2.priceSrc, 'ref');
  assert.strictEqual(l2.cost, cost0);
  assert.strictEqual(t2.total, total0, 'toplam geri geldi');
  assert.ok(!('est0' in l2));
  assert.strictEqual(T.userPrice('seker'), null, 'talep düzenlemesinin yazdığı sizin fiyatınız da geri alındı');
  assert.strictEqual(T.priceFor('seker').v, 40);
  assert.strictEqual(l2.got.p, 47, 'ödenen fiyat korunur');
  assert.strictEqual(l2.got.q, 10);
  assert.strictEqual(T.clearTalepLinePrice(t0.id, i), null, 'değişiklik yoksa işlem yok');
  /* iptal edilmiş talepte değişmez */
  T.setTalepLinePrice(t0.id, i, '70'); T.cancelTalep(t0.id);
  assert.strictEqual(T.clearTalepLinePrice(t0.id, i), null);
});

/* 3) Mevcut boş → 0 */
assert.strictEqual(T.setMevcut('seker', '12,5'), 12.5);
assert.strictEqual(T.setMevcut('seker', ''), 0);
assert.ok(!('seker' in T.mevcut()));
assert.strictEqual(T.setMevcut('alkol', '0'), 0);

/* 4) arayüz: boş alan change VE blur ile işlenir */
const html = fs.readFileSync(W + 'stok.html', 'utf8');
const fo = html.slice(html.indexOf("addEventListener('focusout'"), html.indexOf("addEventListener('focusout'") + 1200);
assert.ok(fo.length > 100, 'focusout dinleyicisi var');
['[data-pf]', '[data-tpf]', '[data-mev]', 'data-est'].forEach((s) => assert.ok(fo.includes(s), 'focusout ' + s + ' işler'));
const spf = html.slice(html.indexOf('function savePriceField'), html.indexOf('function savePriceField') + 900);
assert.ok(/if \(!raw\) \{[^}]*if \(had\)/.test(spf) && !/else return; \}/.test(spf.split('else {')[0]), 'boş fiyat: kendi fiyatı yoksa da yeniden çizilir');
assert.ok(/data-est="/.test(html), 'ödenen fiyat alanı tahmini fiyatı taşır');
globalThis.Date = RealDate;
console.log('stok-talep-fiyat-bos: geçti');

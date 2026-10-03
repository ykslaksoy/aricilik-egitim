/* fiyat-live.js (istemci) + api/fiyat.js (ayrıştırma, ref hesabı) — ağsız. */
const assert = require('assert');
const vm = require('vm');
const fs = require('fs');
const path = require('path');

const api = require(path.join(__dirname, '..', '..', '..', 'api', 'fiyat.js'));
const BASE = require(path.join(__dirname, '..', 'data', 'fiyat-ref.json'));

// ref hesabı dosyadakiyle birebir (aykırı 2,5× yalnız 3+ kaynakta, 4+ kırpılmış ortalama, 2–3 medyan, 1 → o fiyat «Tek kaynak», 0 → null)
for (const it of BASE.items) {
  const c = api.recompute(JSON.parse(JSON.stringify(it)));
  assert.deepStrictEqual([c.ref, c.n, c.min, c.max], [it.ref, it.n, it.min, it.max], it.key);
}
// koloni-69: tek kaynak da referans olur; aykırı ayıklama yalnız 3+ kaynakta
const rc = (vals, note) => api.recompute({ note, sources: vals.map((v, i) => ({ name: 'S' + i, unitPrice: v })) });
let r1 = rc([22.5]);
assert.deepStrictEqual([r1.ref, r1.n, r1.min, r1.max], [22.5, 1, 22.5, 22.5]);
assert.ok(/^Tek kaynak: S0/.test(r1.note));
assert.strictEqual(rc([22.5], 'Tek kaynak: özel not').note, 'Tek kaynak: özel not', 'elle yazılmış tek kaynak notu korunur');
assert.strictEqual(rc([5, 6], 'Tek kaynak: eski').note, undefined, 'kaynak artınca tek kaynak notu kalkar');
assert.strictEqual(rc([5, 6], 'başka not').note, 'başka not');
let r2 = rc([10, 100]);
assert.deepStrictEqual([r2.ref, r2.n], [55, 2]); assert.ok(r2.sources.every((x) => !x.outlier), '2 kaynakta aykırı ayıklanmaz');
let r3 = rc([10, 11, 100]);
assert.deepStrictEqual([r3.ref, r3.n], [10.5, 2]); assert.ok(r3.sources[2].outlier, '3 kaynakta aykırı ayıklanır');
assert.deepStrictEqual([rc([]).ref, rc([]).n], [null, 0]);
assert.deepStrictEqual([rc([0]).ref, rc([0]).sources[0].outlier], [null, true], 'geçersiz fiyat sayılmaz');
// dosya: flumetrin (Bayvarol 450/20, stokta yok) ve amitraz (Rulamit) tek kaynak; tau-fluvalinat ve timol ruhsatlı ürün olmadığı için kaynaksız (ruhsatsız Mavrilk / Bee Strips / BeeShields alınmaz); kumafos kaynaksız
const BY = Object.fromEntries(BASE.items.map((i) => [i.key, i]));
assert.deepStrictEqual([BY.serit_flumetrin.ref, BY.serit_flumetrin.n], [22.5, 1]);
assert.ok(/^Tek kaynak/.test(BY.serit_flumetrin.note) && /stokta yok/.test(BY.serit_flumetrin.sources[0].name));
for (const k of ['serit_taufluvalinat', 'timol']) {
  assert.deepStrictEqual([BY[k].ref, BY[k].n, BY[k].sources.length], [null, 0, 0], k + ' ruhsatlı kaynak yok');
  assert.ok(/ruhsat/.test(BY[k].note) && /hbs\.tarbil/.test(BY[k].note), k + ' notu Bakanlık listesine dayanır');
}
// varroa ilacı anahtarlarında ruhsatsız ürün adı geçmez
const RUHSATSIZ = /mavrilk|bee ?strips|esmolin|timolin|beeshields|thymo\b|combinox|arwen|tnt ?82|bolvit|sniper/i;
['serit_amitraz', 'serit_flumetrin', 'serit_taufluvalinat', 'serit_koumafos', 'timol'].forEach((k) => BY[k].sources.forEach((s) => assert.ok(!RUHSATSIZ.test(s.name), k + ': ' + s.name)));
// amitraz: ruhsatlı Rulamit (Aslan Petek 130 TL, Teknovet poşeti 10 şerit varsayımı) → 13 ₺/şerit, tek kaynak
assert.deepStrictEqual([BY.serit_amitraz.ref, BY.serit_amitraz.n], [13, 1]);
assert.ok(/^Tek kaynak/.test(BY.serit_amitraz.note) && /varsay/.test(BY.serit_amitraz.note) && /Teknovet/.test(BY.serit_amitraz.note));
assert.ok(/aslanpetek\.com\/rulamit/.test(BY.serit_amitraz.sources[0].url) && /10 şerit/.test(BY.serit_amitraz.sources[0].pack));
// okzalik / formik: ruhsatlı ürün yok, dökme asit fiyatı (not kaynak sayısı artsa da kalır)
for (const k of ['okzalik', 'formik']) { assert.strictEqual(BY[k].note, 'ruhsatlı ürün yok · dökme asit fiyatı'); assert.ok(BY[k].n > 1 && BY[k].ref > 0); }
{ const it = JSON.parse(JSON.stringify(BY.okzalik)); api.recompute(it); assert.strictEqual(it.note, 'ruhsatlı ürün yok · dökme asit fiyatı'); }
assert.strictEqual(BY.serit_koumafos.ref, null); assert.ok(BY.serit_koumafos.note);
BASE.items.forEach((it) => { if (it.n === 1) assert.ok(/^Tek kaynak/.test(it.note || ''), it.key + ' tek kaynak notu'); });
// sayı ayrıştırma
assert.deepStrictEqual(['389.95', '1.549,00', '358,75', '1,549.00', '2.210', '104,74 TL'].map(api.num), [389.95, 1549, 358.75, 1549, 2210, 104.74]);
// n11: dosyadaki fiyat finalP (sepette) alanı; JSON-LD liste fiyatından önce gelir
const n11 = '<script type="application/ld+json">{"@type":"Product","offers":{"@type":"Offer","priceCurrency":"TRY","price":"389.95"}}</script><script type=\'application/json\'>{"displayP":389.95,"finalP":358.75}</script>';
assert.deepStrictEqual(api.extractPrice(n11, 'https://www.n11.com/urun/x-1', 358.75), { price: 358.75, via: 'site' });
// WooCommerce JSON-LD priceSpecification dizisi: ListPrice atlanır
const woo = '<script type="application/ld+json">{"@graph":[{"@type":"Product","offers":[{"@type":"Offer","priceSpecification":[{"price":"500.00","priceCurrency":"TRY"},{"price":"550.00","priceCurrency":"TRY","priceType":"https://schema.org/ListPrice"}]}]}]}</script>';
assert.strictEqual(api.extractPrice(woo, 'https://akabebal.com/urun/x/', 480).price, 500);
// IdeaSoft itemprop meta
assert.strictEqual(api.extractPrice('<meta itemprop=\'price\' content="87.00" />', 'https://www.aricimarketi.com/urun/x', 80).price, 87);
// şüpheli (aynı sayfada başka paket) → fiyat uydurulmaz
assert.ok(api.extractPrice('<meta itemprop=\'price\' content="4300.00" />', 'https://www.aricimarketi.com/urun/x', 415).error);
assert.ok(api.extractPrice('<html>fiyat yok</html>', 'https://example.com/', 10).error);
/* Şok (Next.js RSC): "discounted" → $id → fiyat nesnesi; benzer ürün fiyatları (önce gelse de) alınmaz */
const sok = 'self.__next_f.push([1,"9:{\\"value\\":9.99,\\"text\\":\\"9,99\\",\\"currency\\":\\"TRY\\"}\\n1a:{\\"discounted\\":\\"$1b\\",\\"original\\":\\"$1c\\"}\\n1b:{\\"value\\":219,\\"text\\":\\"219,00\\",\\"currency\\":\\"TRY\\"}\\n1c:{\\"value\\":249,\\"text\\":\\"249,00\\",\\"currency\\":\\"TRY\\"}"])';
assert.deepStrictEqual(api.extractPrice(sok, 'https://www.sokmarket.com.tr/altinkup-toz-seker-5-kg-p-7179', 219), { price: 219, via: 'site' });

// ---- istemci ----
function env(fetchImpl, store) {
  const ls = { m: Object.assign({}, store || {}), getItem(k) { return k in this.m ? this.m[k] : null; }, setItem(k, v) { this.m[k] = String(v); } };
  const win = { fetch: fetchImpl, localStorage: ls, navigator: { onLine: true }, setTimeout, clearTimeout, AbortController };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'fiyat-live.js'), 'utf8'), { window: win, globalThis: win, setTimeout, clearTimeout, JSON, Date, Error, Promise });
  return win;
}
const resp = (obj, status = 200) => Promise.resolve({ ok: status === 200, status, headers: { get: () => 'application/json; charset=utf-8' }, json: () => Promise.resolve(JSON.parse(JSON.stringify(obj))) });
const LIVE = { updated: '2026-10-03T17:00:00.000Z', items: [{ key: 'seker', ref: 80, sources: [{ live: true }], liveCount: 1 }] };
const FILE = { updated: '2026-10-03', items: [{ key: 'seker', ref: 79.67, sources: [] }] };
const KEY = 'superari.stok.fiyatcache.v1';

(async () => {
  const calls = [];
  let w = env((u, o) => { calls.push([u, o.cache]); return /\/api\/fiyat/.test(u) ? resp(LIVE) : resp(FILE); });
  let j = await w.SuperAriFiyatLive.refresh();
  assert.strictEqual(j.source, 'live'); assert.strictEqual(j.items[0].ref, 80);
  assert.ok(/^\/api\/fiyat\?t=\d+$/.test(calls[0][0])); assert.strictEqual(calls[0][1], 'no-store'); assert.strictEqual(calls.length, 1);
  assert.strictEqual(JSON.parse(w.localStorage.getItem(KEY)).data.updated, LIVE.updated);

  w = env((u) => (/\/api\/fiyat/.test(u) ? resp({ error: 'x' }, 500) : resp(FILE)));
  j = await w.SuperAriFiyatLive.refresh();
  assert.strictEqual(j.source, 'file'); assert.strictEqual(w.localStorage.getItem(KEY), null);

  w = env(() => Promise.reject(new TypeError('Failed to fetch')), { [KEY]: JSON.stringify({ at: '2026-10-02T10:00:00Z', data: FILE }) });
  j = await w.SuperAriFiyatLive.refresh();
  assert.strictEqual(j.source, 'cache'); assert.strictEqual(j.cachedAt, '2026-10-02T10:00:00Z');

  w = env(() => Promise.reject(new TypeError('Failed to fetch')));
  await assert.rejects(w.SuperAriFiyatLive.refresh(), /Fiyat alınamadı/);
  console.log('fiyat-live: OK');
})().catch((e) => { console.error(e); process.exit(1); });

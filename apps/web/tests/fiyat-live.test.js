/* fiyat-live.js (istemci) + api/fiyat.js (ayrıştırma, ref hesabı) — ağsız. */
const assert = require('assert');
const vm = require('vm');
const fs = require('fs');
const path = require('path');

const api = require(path.join(__dirname, '..', '..', '..', 'api', 'fiyat.js'));
const BASE = require(path.join(__dirname, '..', 'data', 'fiyat-ref.json'));

// ref hesabı dosyadakiyle birebir (aykırı 2,5×, 4+ kırpılmış ortalama, 2–3 medyan, <2 null)
for (const it of BASE.items) {
  const c = api.recompute(JSON.parse(JSON.stringify(it)));
  assert.deepStrictEqual([c.ref, c.n, c.min, c.max], [it.ref, it.n, it.min, it.max], it.key);
}
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

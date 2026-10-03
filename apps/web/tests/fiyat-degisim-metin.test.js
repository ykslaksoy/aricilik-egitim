/* koloni-74: fiyat değişikliği listelerinde metin — «fiyat yok → 130 ₺» yerine net ifadeler (stok-talep.js priceChangeText, stok.html tüm listeler). */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const mem = {};
globalThis.localStorage = { getItem: (k) => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: (k) => { delete mem[k]; } };
globalThis.SuperAriDemo = { records: { todayLocal: () => '2026-10-04', addDays: (d) => d }, stock: { list: () => [] } };
const T = require('../stok-talep.js');
const f = T.priceChangeText;
assert.strictEqual(f({ old: null, nw: 130, unit: 'kutu' }), 'fiyat eklendi: 130 ₺ / kutu');
assert.strictEqual(f({ old: 13, nw: null, unit: 'şerit' }), 'fiyat kaldırıldı (önceki 13 ₺ / şerit)');
assert.strictEqual(f({ old: 13, nw: null }), 'fiyat kaldırıldı (önceki 13 ₺)');
assert.strictEqual(f({ old: 13, nw: 15, unit: 'şerit' }), '13 ₺ → 15 ₺ / şerit');
assert.strictEqual(f({ old: 281.83, nw: 302.2, unit: 'kg' }), '281,83 ₺ → 302,2 ₺ / kg');
/* diffRef → metin */
const ch = T.diffRef({ items: [{ key: 'serit_amitraz', name: 'Varroa şeridi — amitraz', unit: 'şerit', ref: 13 }, { key: 'x', name: 'X', unit: 'kg', ref: 10 }] },
  { items: [{ key: 'serit_amitraz', name: 'Varroa şeridi — amitraz', unit: 'şerit', ref: null }, { key: 'x', name: 'X', unit: 'kg', ref: 12 }, { key: 'amitraz_tutsu', name: 'Amitraz tütsü plakası (Rulamit-VA)', unit: 'kutu', ref: 130 }] });
assert.deepStrictEqual(ch.map((c) => c.name + ': ' + f(c)), ['Varroa şeridi — amitraz: fiyat kaldırıldı (önceki 13 ₺ / şerit)', 'X: 10 ₺ → 12 ₺ / kg', 'Amitraz tütsü plakası (Rulamit-VA): fiyat eklendi: 130 ₺ / kutu']);
/* stok.html: hiçbir değişiklik listesinde eski «fiyat yok → …» kalıbı kalmadı; tüm listeler ortak metni kullanır */
const html = fs.readFileSync(path.join(__dirname, '..', 'stok.html'), 'utf8');
assert.ok(!/'fiyat yok'\) \+ ' → '/.test(html) && !/: '—'\) \+ ' → '/.test(html), 'eski «fiyat yok → …» kalıbı');
assert.ok((html.match(/TQ\.priceChangeText\(c\)/g) || []).length >= 3, 'güncelleme bildirimi, kendi fiyatınız, Güncel fiyatlar farklı listesi');
console.log('fiyat-degisim-metin: OK');

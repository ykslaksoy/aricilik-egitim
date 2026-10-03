/* Alım talebi — durum, iptal/sil, alım kaydı ve stok farkı (koloni-64). Tarayıcısız: localStorage ve SuperAriDemo sahte. */
const assert = require('assert');
const mem = {};
globalThis.localStorage = { getItem: (k) => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: (k) => { delete mem[k]; } };
let items = [{ id: 's1', name: 'Toz şeker', category: 'seker', qty: 10, unit: 'kg', threshold: 0, log: [] },
  { id: 's2', name: 'Şurup 2:1', category: 'surup', qty: 40, unit: 'L', threshold: 0, feedType: 'surup21', log: [] }];
let nid = 0;
globalThis.SuperAriDemo = {
  records: { todayLocal: () => '2026-10-03', addDays: (d, n) => d },
  stock: {
    list: () => items.map((x) => Object.assign({}, x)),
    save: (it) => { const n = Object.assign({ id: 'new' + (++nid), log: [] }, it, { qty: Number(it.qty) || 0 }); items.push(n); return Object.assign({}, n); },
    adjust: (id, d, reason, date) => { const x = items.find((y) => y.id === id); if (!x || !d) return null; x.qty = Math.round((x.qty + d) * 10) / 10; x.log.push({ date, delta: d, reason }); return Object.assign({}, x); }
  }
};
const T = require('../stok-talep.js');
const key = 'superari.stok.talep.demo.v1';
function mk(id, lines) { return { id, date: '2026-10-03', createdAt: '2026-10-03T10:00:' + id.slice(-2) + 'Z', apiaryId: 'a2', apiaryName: 'Tortum', status: 'acik', total: 1000, missing: 0, lines }; }
localStorage.setItem(key, JSON.stringify([
  mk('tl01', [{ key: 'seker', group: 'besleme', name: 'Şeker (toz)', unit: 'kg', buy: 20, price: 40, cost: 800 }, { key: 'kat', group: 'kovan', name: 'Kat / ballık', unit: 'adet', buy: 2, price: 100, cost: 200 }]),
  mk('tl02', [{ key: 'seker', group: 'besleme', name: 'Şeker (toz)', unit: 'kg', buy: 5, price: 40, cost: 200 }])
]));
const sug = () => items.find((x) => x.id === 's1').qty;

// Kısmi alım, farklı fiyat → Alındı (kısmen); şurup değil toz şeker kalemine girer
let r = T.recordPurchase('tl01', [{ i: 0, q: 15, p: 45 }, { i: 1, q: 0, p: null }], { stock: true, savePrice: true });
assert.strictEqual(T.statusOf(r.talep), 'kismen');
assert.strictEqual(sug(), 25);
assert.ok(/^Giriş \(alım talebi · 3 Eki 2026\)$/.test(items[0].log[0].reason));
assert.strictEqual(T.userPrice('seker').v, 45);
let sm = T.talepSums(r.talep);
assert.deepStrictEqual([sm.act, sm.estBought, sm.diff, sm.bought], [675, 600, 75, 1]);
assert.strictEqual(T.talepForLog('s1', items[0].log[0].reason).id, 'tl01');

// Düzeltme: 15 → 12 → stok yalnız −3 (çift ekleme yok); stoğa ekle kapalı olsa da işlenmiş miktar farkla düzelir
r = T.recordPurchase('tl01', [{ i: 0, q: 12, p: 45 }], { stock: false, savePrice: false });
assert.strictEqual(sug(), 22);
assert.strictEqual(r.talep.lines[0].stk.a, 12);
// Aynı değerle tekrar kaydet → stok değişmez
T.recordPurchase('tl01', [{ i: 0, q: 12, p: 45 }], { stock: true, savePrice: false });
assert.strictEqual(sug(), 22);

// Eşleşen stok yok → doğru türde yeni kalem (kat → «kovan»); hepsi alındı → Tamamlandı
r = T.recordPurchase('tl01', [{ i: 1, q: 2, p: 110 }], { stock: true, savePrice: false });
assert.strictEqual(T.statusOf(r.talep), 'tamam');
const kat = items.find((x) => x.category === 'kovan');
assert.ok(kat && kat.qty === 2 && kat.unit === 'adet');
assert.deepStrictEqual(r.created, ['Kat / ballık']);

// Stoğa ekle kapalı, ilk alım → stok değişmez
r = T.recordPurchase('tl02', [{ i: 0, q: 5, p: null }], { stock: false, savePrice: false });
assert.strictEqual(sug(), 22); assert.ok(!r.talep.lines[0].stk);
// Alım geri alınır (0) → durum Açık
r = T.recordPurchase('tl02', [{ i: 0, q: 0, p: null }], { stock: false, savePrice: false });
assert.strictEqual(T.statusOf(r.talep), 'acik');

// İptal: kayıt kalır; iptal edilmemiş silinemez; iptal edilen silinir; iptalde alım kaydı yapılamaz
assert.strictEqual(T.deleteTalep('tl02'), false);
T.cancelTalep('tl02');
assert.strictEqual(T.statusOf(T.talepById('tl02')), 'iptal');
assert.strictEqual(T.recordPurchase('tl02', [{ i: 0, q: 1, p: 1 }], { stock: true }), null);
assert.strictEqual(T.talepler().length, 2);
assert.strictEqual(T.deleteTalep('tl02'), true);
assert.strictEqual(T.talepler().length, 1);
// Sayı ayrıştırma
assert.deepStrictEqual(['1.250,50', '42,5', '42.5', '1.250', 'x'].map(T.parseNum).map((v) => (isNaN(v) ? null : v)), [1250.5, 42.5, 42.5, 1250, null]);

// Fiyat dosyası: farklı dosya listeye bakarken bekletilir; kendi fiyatınız her zaman önce (canlı yenileme ezmez)
const F1 = { updated: '2026-10-01', items: [{ key: 'seker', unit: 'kg', ref: 70, n: 3, sources: [] }, { key: 'kat', unit: 'adet', ref: 1000, n: 2, sources: [] }] };
const F2 = { updated: '2026-10-03', items: [{ key: 'seker', unit: 'kg', ref: 80, n: 3, sources: [] }, { key: 'kat', unit: 'adet', ref: 1100, n: 2, sources: [] }] };
assert.ok(T.offerRef(F1, {}, 'file').applied);
T.setPrice('kat', 950);
let o = T.offerRef(F2, { ask: () => true }, 'live');
assert.ok(o.pending); assert.strictEqual(o.changes.length, 2);
assert.strictEqual(T.priceFor('seker').v, 45);                 // önceki alımda kaydedilen sizin fiyatınız
assert.ok(T.applyPending());
assert.strictEqual(T.priceFor('kat').v, 950); assert.strictEqual(T.priceFor('kat').src, 'user'); assert.strictEqual(T.priceFor('kat').ref.v, 1100);
assert.strictEqual(T.offerRef(F2, { ask: () => true }).same, true);  // aynı dosya → bildirim yok
assert.strictEqual(JSON.parse(localStorage.getItem('superari.stok.fiyatcache.v1')).data.updated, '2026-10-03');
// Açık talep: yeniden hesapla tahmini fiyatı değiştirir, ödenen fiyat (got) korunur; satır fiyatı elle değişir → sizin fiyatınız
const a = T.talepler(); a.push(mk('tl03', [{ key: 'kat', group: 'kovan', name: 'Kat', unit: 'adet', buy: 3, price: 1000, priceSrc: 'ref', cost: 3000 }, { key: 'tuz', group: 'besleme', name: 'Tuz', unit: 'kg', buy: 2, price: null, cost: 0 }]));
localStorage.setItem(key, JSON.stringify(a));
T.recordPurchase('tl03', [{ i: 0, q: 1, p: 1200 }], { stock: false, savePrice: false });
assert.strictEqual(T.talepPriceDiff(T.talepById('tl03')).n, 1);
let t3 = T.repriceTalep('tl03');
assert.strictEqual(t3.lines[0].price, 950); assert.strictEqual(t3.lines[0].got.p, 1200); assert.strictEqual(t3.total, 2850);
t3 = T.setTalepLinePrice('tl03', 1, '35,5');
assert.strictEqual(t3.lines[1].price, 35.5); assert.strictEqual(t3.total, 2921); assert.strictEqual(t3.missing, 0); assert.strictEqual(T.userPrice('tuz').v, 35.5);
console.log('stok-talep-alim: OK');

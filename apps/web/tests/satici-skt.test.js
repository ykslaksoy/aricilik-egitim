/* koloni-76: Alım talebi «Satıcıya göre» gruplama + «Şuradan alınabilir» (yalnız bilinen kanal) + ilaç SKT (geçmiş SKT talepte sayılmaz). */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const W = path.join(__dirname, '..') + path.sep;
const mem = {};
const ls = { getItem: (k) => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: (k) => { delete mem[k]; } };
const ctx = { localStorage: ls, console, setTimeout, clearTimeout, Date, Math, JSON, URLSearchParams, location: { pathname: '/stok.html', search: '', hash: '' }, navigator: { onLine: true }, document: { readyState: 'complete', addEventListener() {}, querySelectorAll: () => [], getElementById: () => null, createElement: () => ({ style: {}, setAttribute() {} }), head: { appendChild() {} }, body: { appendChild() {}, getAttribute: () => null, classList: { add() {} } } }, addEventListener() {}, dispatchEvent() {}, Event: function () {} };
ctx.window = ctx; ctx.globalThis = ctx; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(W + 'demo-data.js', 'utf8'), ctx);
const D = ctx.SuperAriDemo, S = D.stock;
['ilac-katalog.js', 'bakim-plan.js', 'stok-talep.js'].forEach((f) => vm.runInContext(fs.readFileSync(W + f, 'utf8'), ctx));
const T = ctx.SuperAriTalep;

/* satıcı adı: bilinen mağaza adresi → ad; A101 aktüel ilanı */
assert.strictEqual(T.sellerName({ url: 'https://www.apimaye.com.tr/x', name: 'Apimaye ürün' }), 'Apimaye');
assert.strictEqual(T.sellerName({ url: 'https://onedio.com/haber/a101', name: 'A101 aktüel' }), 'A101');
assert.strictEqual(T.sellerName({ url: 'https://bilinmeyen.com/u', name: 'X' }), 'Bilinmeyen');

const ref = { updated: '2026-10-01', items: [
  { key: 'k1', ref: 10, n: 2, sources: [{ url: 'https://apimaye.com.tr/a', unitPrice: 12 }, { url: 'https://www.aslanpetek.com/a', unitPrice: 9 }, { url: 'https://n11.com/a', unitPrice: 1, outlier: true }] },
  { key: 'k2', ref: 5, n: 1, sources: [{ url: 'https://www.aslanpetek.com/b', unitPrice: 5 }] },
  { key: 'k3', ref: 7, n: 1, sources: [{ url: 'https://apimaye.com.tr/c', unitPrice: 7 }] }
] };
T.withRef(ref, () => {
  assert.deepStrictEqual(JSON.parse(JSON.stringify(T.bestSeller('k1'))), { name: 'Aslan Petek', url: 'https://www.aslanpetek.com/a', unitPrice: 9 }, 'aykırı kaynak seçilmez, en ucuz');
  const g = T.sellerGroups([
    { key: 'k1', buy: 2, price: { v: 10 }, cost: 20 }, { key: 'k2', buy: 1, price: 5, cost: 5 }, { key: 'k3', buy: 3, price: { v: 7 }, cost: 21 },
    { key: 'yok', buy: 1, price: { v: 4 }, cost: 4 }, { key: 'serit_amitraz', buy: 2, price: { v: null }, cost: 0 }, { key: 'k1', buy: 0, price: { v: 10 }, cost: 0 }
  ]);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(g.sellers.map((s) => [s.name, s.n, s.total]))), [['Aslan Petek', 2, 25], ['Apimaye', 1, 21]]);
  assert.deepStrictEqual([g.unknown.n, g.unknown.total, g.none.n], [1, 4, 1]);
});
/* «Şuradan alınabilir»: yalnız bilinen gerçek kanal; bilinmiyorsa boş (uydurma satıcı yok) */
assert.ok(T.whereToBuy('serit_amitraz').some((w) => /Veteriner hekim/.test(w)));
assert.ok(T.whereToBuy('amitraz_tutsu').some((w) => /Aslan Petek/.test(w)));
assert.deepStrictEqual(Array.from(T.whereToBuy('olmayan_kalem')), []);

/* SKT: yalnız ilaçta saklanır; geçmiş SKT alım talebinde mevcut sayılmaz */
const td = new Date(); const iso = (d) => d.toISOString().slice(0, 10);
const past = iso(new Date(td.getTime() - 5 * 864e5)), fut = iso(new Date(td.getTime() + 400 * 864e5)), soon = iso(new Date(td.getTime() + 100 * 864e5));
const a = S.save({ name: 'Beeraz şerit', category: 'ilac', unit: 'şerit', qty: 10, skt: past });
assert.strictEqual(a.skt, past);
const nb = S.save({ name: 'Şeker', category: 'besin', unit: 'kg', qty: 5, skt: past });
assert.ok(!nb.skt, 'ilaç dışı kalemde SKT yok');
assert.ok(!S.save({ name: 'Bozuk', category: 'ilac', unit: 'şerit', qty: 1, skt: '31.12.2026' }).skt, 'geçersiz tarih alınmaz');
const r = T.build('all');
const l = r.combined.lines.find((x) => x.key === 'serit_amitraz');
assert.ok(l, 'amitraz satırı');
S.save({ id: a.id, skt: fut });
const l2 = T.build('all').combined.lines.find((x) => x.key === 'serit_amitraz');
assert.strictEqual(l2.have, l.have + 10, 'geçerli SKT → sayılır, geçmiş SKT → sayılmaz');
S.save({ id: a.id, skt: past });

/* Alımda SKT: satıra ve (eskisi geçmiş/boş/daha geç ise) stok kalemine yazılır */
const t = T.saveTalep(T.build('all'), 'Tümü');
const i = t.lines.findIndex((x) => x.group === 'ilac');
assert.ok(i >= 0, 'ilaç satırı'); if (i >= 0) {
  const pr = T.recordPurchase(t.id, [{ i, q: t.lines[i].buy, p: 50, skt: soon }], { stock: true, savePrice: false });
  assert.strictEqual(pr.talep.lines[i].skt, soon);
  const it = S.list().find((x) => x.category === 'ilac' && x.skt === soon);
  assert.ok(it, 'stok kalemine SKT yazıldı');
}
/* Arayüz: görünüm anahtarı, SKT alanları, Uyarılar'a SKT girmez */
const html = fs.readFileSync(W + 'stok.html', 'utf8');
assert.ok(html.includes('Kaleme göre') && html.includes('Satıcıya göre') && html.includes("superari.stok.gorunum.v1"));
assert.ok(html.includes('Şuradan alınabilir: ') && html.includes('Fiyat bulunamadı: '));
assert.ok(html.includes('name="skt"') && html.includes("name=\"skt' + i + '\"") && html.includes('SKT yaklaşıyor') && html.includes('SKT geçti'));
assert.ok(html.includes('Satıcıya göre (en uygun kaynak):'), 'paylaşım metninde satıcı bölümü');
console.log('satici-skt: ok');

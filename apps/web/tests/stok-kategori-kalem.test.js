/* koloni-75: Stok «Ana arı» + «Arı / koloni» türleri, kullanıcı kategorileri (eski «Diğer» geçişi), Alım talebi «Kalem ekle», sayfaya özel alt ＋. */
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
assert.ok(S.CATS.some((c) => c.key === 'anaari' && c.label === 'Ana arı') && S.CATS.some((c) => c.key === 'ariKoloni' && c.label === 'Arı / koloni'));
assert.ok(!S.CATS.some((c) => c.key === 'diger'), '«Diğer» sabit tür değil');
/* eski «Diğer» kalemi kaybolmaz: «Diğer» kullanıcı kategorisi olur */
const old = S.save({ name: 'Eski kalem', category: 'diger', unit: 'adet', qty: 2 });
assert.strictEqual(old.category, 'diger');
assert.deepStrictEqual(S.cats().map((c) => [c.id, c.label]), [['diger', 'Diğer']]);
/* yeni kategori, aynı ad tekrar → aynı kategori; dolu kategori silinemez / yeniden adlandırılamaz */
const a = S.addCat('Kavanoz'); assert.ok(a.ok && /^u[a-z0-9]+$/.test(a.id));
assert.strictEqual(S.addCat(' kavanoz ').id, a.id);
assert.strictEqual(S.addCat('Ana arı').id, 'anaari', 'sabit tür adı → o tür');
const it = S.save({ name: 'Cam kavanoz', category: a.id, unit: 'adet', qty: 10 });
assert.strictEqual(it.category, a.id); assert.strictEqual(it.catLabel, 'Kavanoz');
assert.ok(!S.removeCat(a.id).ok && !S.renameCat(a.id, 'Cam').ok);
S.remove(it.id);
assert.ok(S.renameCat(a.id, 'Cam').ok && S.catLabel(a.id) === 'Cam');
assert.ok(!S.renameCat(a.id, 'Diğer').ok, 'aynı ad');
assert.ok(S.removeCat(a.id).ok && !S.cats().some((c) => c.id === a.id));
/* başka cihazdan gelen kalem (kategori kaydı yok) → kategori kendiliğinden döner */
const ext = S.save({ name: 'Etiket', category: 'uabc123', unit: 'paket', qty: 1 });
assert.strictEqual(ext.category, 'uabc123');
/* Alım talebi: elle kalem */
ctx.SuperAriDemo.loadApiaries = () => []; ctx.SuperAriDemo.loadHives = () => [];
vm.runInContext(fs.readFileSync(W + 'stok-talep.js', 'utf8'), ctx);
const T = ctx.SuperAriTalep;
assert.ok(!T.GROUPS.some((g) => g.key === 'diger'), 'Alım talebinde «Diğer» başlığı yok');
assert.strictEqual(T.addManual('all', { name: '', q: 1 }).ok, false);
assert.strictEqual(T.addManual('all', { name: 'X', q: 'abc' }).ok, false);
const m = T.addManual('all', { name: 'Ana arı (Kafkas)', cat: 'anaari', q: '3', unit: 'adet', p: '450' });
assert.ok(m.ok);
const r = T.build('all'), l = r.combined.lines.find((x) => x.manual);
assert.deepStrictEqual([l.key, l.g, l.buy, l.price.v, l.cost, l.src], ['el:' + m.line.id, 'anaari', 3, 450, 1350, 'elle']);
assert.ok(r.total >= 1350);
assert.strictEqual(T.groupLabel('anaari'), 'Ana arı'); assert.strictEqual(T.groupLabel('diger'), 'Diğer');
const m2 = T.addManual('all', { name: 'Kutu', cat: 'uabc123', q: 2, unit: 'adet' });
const r2 = T.build('all'); assert.ok(r2.combined.lines.some((x) => x.g === 'uabc123' && x.price.v == null));
assert.ok(T.groupList(r2.combined.lines).some((g) => g.key === 'uabc123' && g.custom));
assert.ok(T.removeManual(m2.line.id) && T.manual('all').length === 1);
assert.strictEqual(T.manual('a1').length, 0, 'kapsama özel');
const t = T.saveTalep(T.build('all'), 'Tüm arılıklar');
assert.ok(t.lines.some((x) => x.manual && x.cat === 'anaari' && x.price === 450));
assert.strictEqual(T.manual('all').length, 0, 'kayıtta taslak temizlenir');
const at = T.addTalepLine(t.id, { name: 'Ana kafesi', cat: 'anaari', q: 4, unit: 'adet' });
assert.ok(at.ok && at.talep.lines.length === t.lines.length + 1 && at.talep.missing === t.lines.filter((x) => x.price == null).length + 1 && at.talep.total === t.total);
const tt = T.talepById(t.id), ents = tt.lines.map((x, i) => ({ i, q: x.buy, p: x.manual && x.price == null ? 35 : x.price }));
const pr = T.recordPurchase(t.id, ents, { stock: true, savePrice: false });
assert.strictEqual(T.statusOf(pr.talep), 'tamam');
assert.deepStrictEqual(S.list().filter((x) => /Kafkas|Ana kafesi/.test(x.name)).map((x) => [x.name, x.category, x.qty]).sort(), [['Ana arı (Kafkas)', 'anaari', 3], ['Ana kafesi', 'anaari', 4]]);
/* alt ＋: yalnız stok.html kendi işleyicisini kaydeder; nav.js işleyici yoksa Hızlı kayıt */
const nav = fs.readFileSync(W + 'nav.js', 'utf8');
assert.ok(/function onPlus\(\)[\s\S]*SuperAriQuickHandler[\s\S]*openQuick\(\);/.test(nav));
const pages = fs.readdirSync(W).filter((f) => /\.html$/.test(f) && /SuperAriQuickHandler\s*=/.test(fs.readFileSync(W + f, 'utf8')));
assert.deepStrictEqual(pages, ['stok.html']);
const st = fs.readFileSync(W + 'stok.html', 'utf8');
assert.ok(/\{ key: 'anaari', label: 'Ana arı' \}, \{ key: 'alinacak'/.test(st) && /var EXTRA = \[\{ key: 'ariKoloni', label: 'Arı \/ koloni' \}\]/.test(st));
assert.ok(!/min-height: 64px/.test(st), 'Stok: eldiven boyu yok');
/* bulut: kullanıcı kategorileri eşitlenir */
const bl = fs.readFileSync(W + 'bulut.js', 'utf8');
assert.ok(/stokKat: 'superari\.stok\.kategoriler\.v1'/.test(bl) && /ownRows\('stokKat', 'sk', 'stok_kategori'\)/.test(bl) && /sk: 'stokKat'/.test(bl));
console.log('stok-kategori-kalem: OK');

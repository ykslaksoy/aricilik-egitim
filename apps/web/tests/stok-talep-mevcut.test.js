/* Alım talebi — «Mevcut» (elde olan) miktar: alınacak = max(0, gerekli − stokta − mevcut); kayıtta stoğa «Giriş (mevcut, talep sırasında)», alanlar temizlenir (koloni-64). */
const assert = require('assert');
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
const D = globalThis.SuperAriDemo;
const line = (rq, k) => rq.combined.lines.find((l) => l.key === k);
let rq = T.build('all');
const s0 = line(rq, 'seker'), a0 = line(rq, 'alt_tabla');
assert.ok(s0 && s0.buy > 100, 'şeker alınacak');
assert.ok(a0 && a0.buy > 0, 'alt tabla alınacak');
const buyN0 = rq.buyN;

/* girilen mevcut alınacağı hemen düşürür; gerekli / pay değişmez */
assert.strictEqual(T.setMevcut('seker', '100'), 100);
assert.strictEqual(T.setMevcut('alt_tabla', '50'), 50);
rq = T.build('all');
let s1 = line(rq, 'seker'), a1 = line(rq, 'alt_tabla');
assert.strictEqual(s1.need, s0.need, 'gerekli değişmez');
assert.strictEqual(s1.buy, s0.buy - 100, 'alınacak = gerekli − stokta − mevcut');
assert.strictEqual(s1.mev, 100);
assert.strictEqual(a1.buy, 0, 'mevcut yeterli → alınacak 0');
assert.ok(a1.need > 0, 'satır görünür kalır (Yeterli)');
assert.strictEqual(rq.buyN, buyN0 - 1, 'yeterli satır talep sayısından çıkar');
/* tek arılık görünümü de aynı mevcudu kullanır */
const one = T.build(rq.sections[0].id);
assert.strictEqual(line(one, 'alt_tabla').buy, 0);
/* virgüllü / boş giriş */
assert.strictEqual(T.setMevcut('polen', '0,5'), 0.5);
assert.strictEqual(T.setMevcut('polen', ''), 0);
assert.ok(!('polen' in T.mevcut()));

/* kayıt: yeterli satır anlık görüntüde yok; mevcutlar stoğa girer; alanlar temizlenir */
const sugarBefore = D.stock.list().filter((x) => /seker/.test(T.norm(x.name)) && x.unit === 'kg').reduce((a, x) => a + x.qty, 0);
const t = T.saveTalep(rq, 'Tüm arılıklar');
assert.ok(!t.lines.some((l) => l.key === 'alt_tabla'), 'Yeterli satır kaydedilmez');
assert.strictEqual(t.lines.find((l) => l.key === 'seker').buy, s0.buy - 100);
assert.deepStrictEqual(t.mevcutAdded.map((x) => [x.key, x.q]).sort(), [['alt_tabla', 50], ['seker', 100]]);
assert.deepStrictEqual(T.mevcut(), {}, 'Mevcut alanları temizlendi');
const st = D.stock.list();
const tabla = st.find((x) => /alt tabla/i.test(x.name));
assert.ok(tabla && tabla.qty === 50, 'alt tabla stok kalemi oluşturuldu');
assert.ok(tabla.log.some((l) => l.reason === 'Giriş (mevcut, talep sırasında)' && l.delta === 50), 'stok hareketi');
const sugarAfter = st.filter((x) => /seker/.test(T.norm(x.name)) && x.unit === 'kg').reduce((a, x) => a + x.qty, 0);
assert.strictEqual(Math.round((sugarAfter - sugarBefore) * 10) / 10, 100, 'şeker stoğu +100 kg');

/* sonraki hesap: çift sayım yok (mevcut artık stokta) */
rq = T.build('all');
assert.strictEqual(line(rq, 'seker').buy, s0.buy - 100);
assert.strictEqual(line(rq, 'alt_tabla').buy, 0);
assert.strictEqual(line(rq, 'alt_tabla').mev, 0);
globalThis.Date = RealDate;
console.log('stok-talep-mevcut: geçti');

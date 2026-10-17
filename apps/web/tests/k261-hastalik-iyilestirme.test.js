/* Önizleme (hastalık iyileştirme): ihbar listesi, ayırıcı tanı, mevsim/geçmiş bağlamı, varroa mevsim eşiği. */
const assert = require('assert'); const fs = require('fs'); const path = require('path'); const vm = require('vm');
const src = fs.readFileSync(path.join(__dirname, '..', 'hastalik-tahmin.js'), 'utf8');
function load(ayar) {
  const w = { SuperAriDemo: { colony: { ogulSkor: () => ({ hastalik: ayar }) } } };
  w.window = w; const ctx = { window: w, globalThis: w, document: { currentScript: null }, localStorage: { getItem: () => null } };
  vm.createContext(ctx); vm.runInContext(src, ctx); return w;
}
const J = x => JSON.stringify(x);
let w = load(null), H = w.SuperAriHastalik, A = w.SuperAriHastalikAyar;
let r = H.assess({ kkkBocek: true }, []); assert.strictEqual(r.list[0].key, 'kkk'); assert.strictEqual(J(r.ihbar), J(['kkk']));
r = H.assess({ tropiAkar: true }, []); assert.strictEqual(J(r.ihbar), J(['tropilaelaps']));
r = H.assess({ akar: true }, []); assert.strictEqual(J(r.ihbar), '[]', 'Varroa ihbarı mecburi değil');
r = H.assess({ topluOlum: true }, []); assert.strictEqual(r.list[0].key, 'zehir');
r = H.assess({ dilIzi: true }, []); assert.strictEqual(r.list[0].key, 'ayc');
r = H.assess({ ishal: true }, [], { history: { nosema: true } }); assert.strictEqual(r.list[0].score, 6);
const D = A.get(); assert.strictEqual(A.varroaEsik(D, 7).esik, 2); assert.strictEqual(A.varroaEsik(D, 4).esik, 1); assert.strictEqual(A.varroaEsik(D, 12).evre, 'Durgun');
assert.strictEqual(A.tablaKat(D, 1), 400); assert.strictEqual(A.tablaKat(D, 6), 30); assert.strictEqual(A.tablaKat(D, 10), 100);
w = load({ mevsimKat: { kirec: { ilkbahar: 2 } } }); r = w.SuperAriHastalik.assess({ beyazMumya: true }, [], { month: 4 }); assert.strictEqual(r.list[0].score, 10);
r = w.SuperAriHastalik.assess({ beyazMumya: true }, [], { month: 7 }); assert.strictEqual(r.list[0].score, 5);
assert.ok(!/2–3 cm/.test(src), 'kibrit 1–3 cm (NBU 10–30 mm)');
console.log('k261 ok');

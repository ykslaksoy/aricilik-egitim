/* k93 önizleme: 7 güç seviyesi — Birleştirilmeli 0–44 · Çok zayıf 45–59 · Zayıf 60–69 · Normal 70–79 · Güçlü 80–89 · Çok güçlü 90–100
   + Bölünmesi Gerekiyor (bölme kuralı; skor ≤ 100). Yaşama sınırı → 45. */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const W = path.join(__dirname, '..') + path.sep;
const mem = {};
globalThis.localStorage = { getItem: (k) => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: (k) => { delete mem[k]; }, key: (i) => Object.keys(mem)[i], get length() { return Object.keys(mem).length; } };
globalThis.window = globalThis; globalThis.addEventListener = () => {}; globalThis.dispatchEvent = () => {}; globalThis.CustomEvent = function () {};
globalThis.navigator = { onLine: true };
['demo-data.js', 'bakim-plan.js'].forEach((f) => require(W + f));
const D = globalThis.SuperAriDemo, R = D.records, P = globalThis.SuperAriPlan;

/* seviyeler, aralıklar, renkler */
assert.deepStrictEqual(R.STRENGTH_LEVELS.map((l) => l.key), ['birlestir', 'cok-zayif', 'zayif', 'normal', 'guclu', 'cok-guclu', 'bolunmeli']);
assert.deepStrictEqual(R.SCORE_LEVELS.map((l) => R.strengthRange(l).text), ['0–44', '45–59', '60–69', '70–79', '80–89', '90–100']);
const cols = R.STRENGTH_LEVELS.map((l) => l.color);
assert.strictEqual(new Set(cols).size, 7, 'renkler ayrı');
assert.strictEqual(R.strengthLevel('birlestir').color, '#c92a2a', 'Birleştirilmeli kırmızı');
assert.strictEqual(R.strengthLevel('bolunmeli').tone, 'purple', 'Bölünmesi Gerekiyor mor');
assert.strictEqual(R.SPLIT_LEVEL.short, 'Bölünmeli');
/* eski kayıtlar: «sinir-alti» ve eski 5 seviye anahtarları eşlenir */
assert.strictEqual(R.strengthLevel('sinir-alti').label, 'Birleştirilmeli');
assert.strictEqual(R.strengthLevel('Bölünmesi Gerekiyor').key, 'bolunmeli');
assert.strictEqual(R.strengthLevel('Bölünmeli').key, 'bolunmeli');
assert.ok(R.isWeakClass('Birleştirilmeli') && R.isStrongClass('Bölünmesi Gerekiyor') && !R.isWeakClass('Normal'));

/* yaşama sınırı → 45 (her bant ve mevsimde); altı Birleştirilmeli */
const hid = (ap) => D.loadHives().find((h) => h.apiaryId === ap).id;
['a1', 'a2', 'a3', 'a4'].forEach((ap) => {
  ['2026-01-15', '2026-07-10', '2026-10-04'].forEach((date) => {
    const V = R.strengthInfo({ beeFrames: 5, broodFrames: 2, date }, { hiveId: hid(ap) }).viable;
    const at = R.strengthInfo({ beeFrames: V, broodFrames: 0, date }, { hiveId: hid(ap) });
    const below = R.strengthInfo({ beeFrames: V - 1, broodFrames: 3, date }, { hiveId: hid(ap) });
    assert.ok(at.score >= 45 && at.score <= 59, ap + ' ' + date + ' sınırda Çok zayıf: ' + at.score);
    assert.ok(below.score <= 44 && below.key === 'birlestir', ap + ' ' + date + ' sınır altı: ' + below.score);
  });
});
/* skor hiçbir zaman 100'ü geçmez */
assert.strictEqual(R.strengthInfo({ beeFrames: 40, broodFrames: 20, date: '2026-05-01' }, { hiveId: hid('a4') }).score, 100);

/* bölme kuralı: dönem (oğul profili pre → to) + ≥ max(10, 1,2 × bölge beklentisi) arılı + ≥ 6 yavrulu */
P.setProfile('a4', 'iliman');
const h4 = hid('a4');
const sp = (b, br, d) => R.strengthInfo({ beeFrames: b, broodFrames: br, date: d }, { hiveId: h4 });
assert.strictEqual(R.splitWindow('a4', '2026-05-10').inWindow, true);
assert.strictEqual(R.splitWindow('a4', '2026-06-15').inWindow, false, 'oğul zirvesinden sonra bölme yok');
assert.strictEqual(R.splitWindow('a4', '2026-03-20').inWindow, false, 'ılımanda Nisan öncesi bölme yok');
assert.strictEqual(sp(12, 6, '2026-05-10').key, 'bolunmeli');
assert.strictEqual(sp(12, 6, '2026-05-10').score <= 100, true);
assert.notStrictEqual(sp(12, 5, '2026-05-10').key, 'bolunmeli', 'yavru < 6');
assert.notStrictEqual(sp(9, 6, '2026-05-10').key, 'bolunmeli', 'arılı < 10');
assert.notStrictEqual(sp(14, 8, '2026-08-10').key, 'bolunmeli', 'dönem dışı');
assert.strictEqual(sp(14, 8, '2026-08-10').key, 'cok-guclu');
P.setProfile('a4', 'yuksek');
assert.notStrictEqual(sp(12, 6, '2026-06-10').key, 'bolunmeli', 'yüksek yaylada bölge beklentisi yüksek → 12 çerçeve yetmez');
const need = R.splitCheck({ date: '2026-06-10', beeFrames: 30, broodFrames: 8 }, 16, 'a4');
assert.ok(need.need && need.minBees === 19, 'yüksek yayla eşiği 1,2 × 16 = 19: ' + need.minBees);
P.setProfile('a4', '');
/* elle Bölünmesi Gerekiyor seçilebilir; etiket kısa yerde «Bölünmeli» */
const man = R.strengthInfo({ beeFrames: 6, broodFrames: 3, date: '2026-10-04', level: 'bolunmeli' }, { hiveId: h4 });
assert.strictEqual(man.label, 'Bölünmesi Gerekiyor'); assert.ok(man.manual);
assert.ok(/^Bölünmeli \(elle\) · \d+$/.test(R.strengthTag(man, true)), R.strengthTag(man, true));
assert.ok(/^Bölünmesi Gerekiyor \(elle\) · skor \d+/.test(R.strengthTag(man)), R.strengthTag(man));

/* arayüz: yardım notu (formülsüz), arama süzgeci 7 seçenek, Bölme / Birleştirme ekranında iki liste yan yana */
const kv = fs.readFileSync(W + 'kovanlar.html', 'utf8');
assert.ok(kv.includes('Birleştirilmeli 0–44 (yaşama sınırının altı), Çok zayıf 45–59, Zayıf 60–69, Normal 70–79, Güçlü 80–89, Çok güçlü 90–100. Bölünmesi Gerekiyor:'));
assert.ok(!/1–19|20–39|40–59|60–79|80–100/.test(kv), 'eski bant yok');
assert.ok(fs.readFileSync(W + 'kovan-ara.js', 'utf8').includes('records.STRENGTH_LEVELS'));
const ki = fs.readFileSync(W + 'koloni-islem.html', 'utf8');
assert.ok(ki.includes('ki-duo') && ki.includes('🔗 Birleştirilmeli') && ki.includes('✂️ Bölünmesi Gerekiyor') && ki.includes("i.key === 'birlestir'") && ki.includes("i.key === 'bolunmeli'"));
assert.ok(!fs.readFileSync(W + 'bakim-plan.js', 'utf8').includes('sinir-alti'));
console.log('k93-guc-7 ok');

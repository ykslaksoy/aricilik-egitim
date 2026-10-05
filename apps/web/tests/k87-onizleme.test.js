/* k87 önizleme: koloni gücü skoru + seviye aralıkları, üçlü melez cins katsayısı, ırk ve soy kaydı. */
const assert = require('assert');
const path = require('path');
const W = path.join(__dirname, '..') + path.sep;
const RealDate = Date;
const FIX = new RealDate('2026-10-04T12:00:00+03:00').getTime();
class FakeDate extends RealDate { constructor(...a) { if (a.length) super(...a); else super(FIX); } static now() { return FIX; } }
globalThis.Date = FakeDate;
const mem = {};
globalThis.window = globalThis;
globalThis.localStorage = { getItem: (k) => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: (k) => { delete mem[k]; }, key: (i) => Object.keys(mem)[i], get length() { return Object.keys(mem).length; } };
globalThis.document = { addEventListener() {}, querySelector() { return null; }, querySelectorAll() { return []; }, getElementById() { return null; }, createElement() { return { style: {}, setAttribute() {}, appendChild() {} }; }, documentElement: { style: {} }, readyState: 'complete', head: { appendChild() {} } };
globalThis.addEventListener = () => {}; globalThis.dispatchEvent = () => {};
globalThis.location = { href: 'http://x/bakim-yap.html', search: '', pathname: '/bakim-yap.html', hash: '' };
globalThis.navigator = { onLine: true };
['demo-data.js', 'ilac-katalog.js', 'bakim-plan.js', 'tarti-elle.js'].forEach((f) => require(W + f));
['demo-data.js', 'ilac-katalog.js', 'bakim-plan.js', 'tarti-elle.js'].forEach((f) => require(W + f));
const D = globalThis.SuperAriDemo, R = D.records, C = D.colony;
/* seviye aralıkları (k93) */
assert.deepStrictEqual(R.STRENGTH_LEVELS.map((l) => l.label + ' ' + R.strengthRange(l).text),
  ['Birleştirilmeli 0–44', 'Çok zayıf 45–59', 'Zayıf 60–69', 'Normal 70–79', 'Güçlü 80–89', 'Çok güçlü 90–100', 'Bölünmesi Gerekiyor bölme eşiği']);
assert.strictEqual(R.strengthRange('orta').text, '70–79', 'eski «orta» → Normal');
/* skor ↔ seviye tutarlı (her skor kendi aralığında) */
/* her bölge bandı (a1 sıcak, a2 yayla, a3/a5 yüksek, a4 ılıman) ve mevsimde: skor kendi seviye aralığında; çerçeve arttıkça skor düşmez */
['a1', 'a2', 'a3', 'a4', 'a5'].forEach((ap) => {
  const hid = D.loadHives().find((h) => h.apiaryId === ap).id;
  ['2026-07-01', '2026-10-04', '2026-01-15'].forEach((date) => {
    let prev = -1;
    for (let b = 0; b <= 24; b++) {
      const i = R.strengthInfo({ beeFrames: b, broodFrames: Math.round(b / 2), date }, { hiveId: hid });
      const rg = R.strengthRange(i.key === 'bolunmeli' ? i.autoKey === 'bolunmeli' ? R.SCORE_LEVELS.find((x) => i.score >= x.min && (!R.SCORE_LEVELS[R.SCORE_LEVELS.indexOf(x) + 1] || i.score < R.SCORE_LEVELS[R.SCORE_LEVELS.indexOf(x) + 1].min)).key : i.key : i.key);
      assert.ok(i.score <= 100, 'skor 100\'ü geçmez');
      assert.ok(i.score >= rg.min && i.score <= rg.max, ap + ' ' + date + ' ' + b + ' çerçeve: skor ' + i.score + ' / ' + i.label);
      assert.ok(i.score >= prev, ap + ' ' + date + ' monoton: ' + b); prev = i.score;
    }
  });
});
/* arayüz metni: yalnız seviye · aralık · skor; elle seçimde (elle) + hesaplanan seviye */
const tag = R.strengthTag(R.strengthInfo({ beeFrames: 9, broodFrames: 5, date: '2026-07-01' }));
assert.ok(/^(Birleştirilmeli|Çok zayıf|Zayıf|Normal|Güçlü|Çok güçlü) · \d+–\d+ · skor \d+$/.test(tag), tag);
assert.ok(!/çerçeve|katsay|×|\*/.test(tag), 'formül / çerçeve gösterilmez');
const man = R.strengthTag(R.strengthInfo({ beeFrames: 3, broodFrames: 1, date: '2026-07-01', level: 'guclu' }));
assert.ok(/^Güçlü \(elle\) · 80–89 · skor \d+ \((Çok zayıf|Zayıf)\)$/.test(man), man);
/* cins katsayısı: saf ve ikili melez eski davranış; üçlü melez = bileşen ortalaması */
const env = (b) => R.breedEnv({ breed: b });
assert.strictEqual(env('Kafkas').fob, 0.90);
assert.strictEqual(env('Karniyol').fob, 1.15);
assert.strictEqual(env('Kafkas × Karadeniz').fob, 0.90, 'aynı alt tür: melez gücü yok (k88)');
assert.strictEqual(env('Kafkas × Karniyol').fob, 1.189, 'k88: ebeveyn ort. × (1 + 0,16)');
assert.strictEqual(env('Kafkas × Anadolu').fob, 0.95);
const e3 = env('Kafkas × Karadeniz × Muğla');
assert.strictEqual(e3.key, 'melez3'); assert.strictEqual(e3.fob, 1.026); assert.deepStrictEqual(e3.parts, ['kafkas', 'karadeniz', 'mugla']);
assert.strictEqual(env('Kafkas x Karniyol x Buckfast').fob, Math.round(((0.90 + 1.11) / 2 + (1.15 + 1.11) / 2) / 2 * 1000) / 1000, '«x» ayırıcı da çalışır (k88: ½ (A×C + B×C))');
assert.deepStrictEqual([C.breedKind('Muğla'), C.breedKind('Kafkas × Karadeniz'), C.breedKind('Kafkas × Karadeniz × Muğla'), C.breedKind('')], ['saf', 'iki', 'uc', '']);
/* ırk ve soy kaydı: üçlü melez + hat + anne ana (kayıtlı ana) / dış kaynak */
const hs = D.loadHives().filter((h) => h.apiaryId === 'a2');
const h0 = hs[0], h1 = hs[1];
const mother = h1.currentQueenId;
let s = C.updateHive(h0.id, { breed: 'Kafkas × Karadeniz × Muğla', breedEstimated: false, breedLine: 'Ardahan istasyonu hattı', motherQueenId: mother, motherRef: '' }, 'correct');
assert.strictEqual(s.breed, 'Kafkas × Karadeniz × Muğla');
assert.strictEqual(s.breedLine, 'Ardahan istasyonu hattı');
assert.strictEqual(s.queenMotherId, mother);
const again = D.hiveById(h0.id);
assert.strictEqual(again.breedLine, 'Ardahan istasyonu hattı', 'yeniden yüklemede korunur');
assert.ok(/Hat: Ardahan/.test(C.lineageText(again)) && /Anne ana: /.test(C.lineageText(again)), C.lineageText(again));
assert.strictEqual(R.breedEnv(again).key, 'melez3', 'güç hesabı üçlü melezi okur');
s = C.updateHive(h0.id, { motherQueenId: '', motherRef: 'Yetiştirici X, 2024 no 12' }, 'correct');
assert.ok(!s.queenMotherId && s.queenMotherRef === 'Yetiştirici X, 2024 no 12');
/* arılık ırkı = çoğunluk (üçlü melezli tek kovan çoğunluğu değiştirmez) */
assert.strictEqual(C.apiaryMajorityBreed('a2', -1), 'Kafkas × Karadeniz');
/* durum: skor ve aralıklı metin */
const st = R.status(D.loadHives().find((h) => h.apiaryId === 'a1').id);
if (st.strength) { assert.ok(typeof st.strengthScore === 'number'); assert.ok(/ · \d+–\d+ · skor \d+/.test(st.strengthTag), st.strengthTag); }
console.log('k87-onizleme ok');

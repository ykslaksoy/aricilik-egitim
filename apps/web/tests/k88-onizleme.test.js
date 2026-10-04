/* k88 önizleme: yaşama sınırı (skor 0), mevsim/bant eşikleri, melez katsayıları (kaynaklı), otomatik tartı okuması. */
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
globalThis.location = { href: 'http://x/kovanlar.html', search: '', pathname: '/kovanlar.html', hash: '' };
globalThis.navigator = { onLine: true };
['demo-data.js', 'ilac-katalog.js', 'bakim-plan.js', 'tarti-elle.js'].forEach((f) => require(W + f));
const D = globalThis.SuperAriDemo, R = D.records, C = D.colony, T = globalThis.SuperAriTarti;

/* yaşama sınırı: ay ve bölge bandına göre en az arılı çerçeve */
assert.strictEqual(R.viableFrames('sicak', '2026-04-15'), 2);
assert.strictEqual(R.viableFrames('yuksek', '2026-05-20'), 2);
assert.strictEqual(R.viableFrames('iliman', '2026-07-01'), 3);
assert.strictEqual(R.viableFrames('sicak', '2026-10-04'), 3);
assert.strictEqual(R.viableFrames('yayla', '2026-10-04'), 4);
assert.strictEqual(R.viableFrames('yuksek', '2026-01-15'), 5);
assert.strictEqual(R.viableFrames(null, '2026-10-04'), 3, 'bilinmeyen bant → 3');

/* skor: sınırın altı 0, sınırda ≥1; ölçek 0 + beş canlı seviye */
assert.strictEqual(R.viaScore(2.5, 9, 3), 0);
assert.strictEqual(R.viaScore(3, 9, 3), 1);
assert.ok(R.viaScore(9, 9, 3) >= 40 && R.viaScore(9, 9, 3) <= 59, 'beklenen = Normal');
assert.strictEqual(R.viaScore(18, 9, 3), 100);
assert.strictEqual(R.BELOW_VIABLE.label, 'Yaşama sınırı altı');
assert.deepStrictEqual(R.STRENGTH_LEVELS.map((l) => l.label + ' ' + R.strengthRange(l).text),
  ['Çok zayıf 1–19', 'Zayıf 20–39', 'Normal 40–59', 'Güçlü 60–79', 'Çok güçlü 80–100']);
const hA1 = D.loadHives().find((h) => h.apiaryId === 'a1').id, hA2 = D.loadHives().find((h) => h.apiaryId === 'a2').id;
const dead = R.strengthInfo({ beeFrames: 2, broodFrames: 1, date: '2026-10-04' }, { hiveId: hA1 });
assert.strictEqual(dead.score, 0); assert.strictEqual(dead.key, 'sinir-alti'); assert.strictEqual(dead.viable, 3);
assert.ok(R.isWeakClass(dead.key));
assert.ok(/^Yaşama sınırı altı · skor 0$/.test(R.strengthTag(dead)), R.strengthTag(dead));
const atV = R.strengthInfo({ beeFrames: 3, broodFrames: 0, date: '2026-10-04' }, { hiveId: hA1 });
assert.ok(atV.score >= 1 && atV.key !== 'sinir-alti', 'sınırda canlı: ' + atV.score);
/* yaylada ekimde 3 çerçeve sınırın altında (4) */
assert.strictEqual(R.strengthInfo({ beeFrames: 3, broodFrames: 2, date: '2026-10-04' }, { hiveId: hA2 }).score, 0);
/* yavru/tartı ekleri ölü koloniyi canlandırmaz */
assert.strictEqual(R.strengthInfo({ beeFrames: 1, broodFrames: 6, date: '2026-07-01' }, { hiveId: hA1 }).score, 0);

/* melez katsayıları: düz ortalama yok; kaynaklı heterozis */
const f = (b) => Math.round(R.breedEnv({ breed: b }).fob * 1000) / 1000;
assert.strictEqual(f('Kafkas'), 0.9); assert.strictEqual(f('Karniyol'), 1.15);
assert.strictEqual(f('Kafkas x Karniyol'), 1.189, 'orta değer × 1,16');
assert.strictEqual(f('Kafkas x Anadolu'), 0.95, 'kanıt: fark yok');
assert.strictEqual(f('Kafkas x Muğla'), 1.026);
assert.strictEqual(f('Kafkas x Karadeniz x Muğla'), 1.026, 'üçlü: ½(A×C + B×C)');
const ci = R.crossInfo('Kafkas x Karniyol');
assert.ok(ci && /orta/.test(ci.kanit) && /Erkan|Günbey/.test(ci.src), JSON.stringify(ci));
assert.ok(/yok/.test(R.crossInfo('Buckfast x İtalyan').kanit), 'kanıtsız melez dürüst');

/* otomatik tartı */
const devs = [];
globalThis.SuperAriDevices = { listDevices: () => devs };
assert.strictEqual(T.autoReading(101), null, 'cihaz yoksa null');
devs.push({ id: 'dT', tip: 'tarti', hiveId: 101, status: 'bagli', source: 'demo', lastMins: 4 });
const a = T.autoReading(101);
assert.ok(a.kg > 0 && a.pts.length === 8 && a.demo && typeof a.d7 === 'number', JSON.stringify(a));
/* canlı cihaz, okuma yok → uydurma değer yok */
devs.push({ id: 'dL', tip: 'tarti', hiveId: 102, status: 'bagli', source: 'live' });
const b = T.autoReading(102); assert.strictEqual(b.kg, null); assert.strictEqual(b.pts.length, 0);
mem[T.SENSOR_KEY] = JSON.stringify([{ hiveId: 102, at: '2026-09-28T09:00', kg: 40 }, { hiveId: 102, at: '2026-10-04T11:30', kg: 42.46 }, { hiveId: 103, at: '2026-10-04T11:30', kg: 99 }]);
const c = T.autoReading(102); assert.strictEqual(c.kg, 42.5); assert.strictEqual(c.at, '2026-10-04T11:30'); assert.strictEqual(c.d7, 2.5);
/* «Bu değeri kaydet»: kaynak otomatik, aynı okuma iki kez kaydedilmez */
const r = T.add({ hiveId: 102, kg: c.kg, at: c.at, source: 'otomatik', deviceId: 'dL' });
assert.strictEqual(r.source, 'otomatik'); assert.strictEqual(r.deviceId, 'dL');
assert.throws(() => T.add({ hiveId: 102, kg: c.kg, at: c.at, source: 'otomatik' }), /zaten/);
assert.strictEqual(T.add({ hiveId: 102, kg: 41, at: c.at }).source, 'elle', 'elle kayıt her zaman');
assert.ok(/Cihaz/.test(T.rowHtml(r)));
console.log('k88-onizleme ok');

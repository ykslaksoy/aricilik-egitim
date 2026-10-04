/* k84 (önizleme): yapışkan altlık durumu / «Altlık koydum» / planlı muayene (7 gün önce altlık hatırlatması, mükerrersiz) / «Eski şeritleri çıkardım» /
 * besleyici darası / altlıkla sayım kaydı / 5 seviyeli koloni gücü (eski kayıt eşleme, arılık ortalaması, mutlak taban, elle seçim) / 3 durumlu besleme önerisi. */
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
const D = globalThis.SuperAriDemo, P = globalThis.SuperAriPlan, T = globalThis.SuperAriTarti, R = D.records;
const t = P.today();
assert.strictEqual(t, '2026-10-04');
const hives = D.loadHives();
const h = hives.find((x) => !P.flowAt(x.apiaryId, t).flow && !P.hasSuper(x.id));
assert.ok(h);
const open = (re) => D.taskStore.open().filter((x) => String(x.hiveId) === String(h.id) && re.test(String(x.title) + ' ' + String(x.note || '')));

/* ---- 5 seviyeli güç ---- */
assert.deepStrictEqual(R.STRENGTH_LEVELS.map((x) => x.label), ['Çok zayıf', 'Zayıf', 'Normal', 'Güçlü', 'Çok güçlü']);
assert.deepStrictEqual(['zayıf', 'orta', 'güçlü', 'Orta', 'Zayıf', 'GÜÇLÜ', 'çok zayıf'].map((x) => R.strengthLevel(x).label), ['Zayıf', 'Normal', 'Güçlü', 'Normal', 'Zayıf', 'Güçlü', 'Çok zayıf'], 'eski 3 seviye eşlenir');
assert.strictEqual(R.strengthLevel('xyz'), null);
/* başlangıç eşikleri (arılık verisi yok; Mayıs, yavru arının yarısı) */
const cls = (b, br, d) => R.strengthClass({ beeFrames: b, broodFrames: br == null ? Math.ceil(b / 2) : br, date: d || '2026-05-10' });
assert.deepStrictEqual([1, 2, 3, 4, 5, 7, 8, 11, 12, 16].map((b) => cls(b)), ['Çok zayıf', 'Çok zayıf', 'Zayıf', 'Zayıf', 'Normal', 'Normal', 'Güçlü', 'Güçlü', 'Çok güçlü', 'Çok güçlü']);
assert.strictEqual(cls(5, 0), 'Zayıf', 'aktif mevsimde yavrusuz koloni bir alt seviyeye iner');
/* konum × cins tablosu (tek yer) */
assert.deepStrictEqual(Object.keys(R.COLONY_ENV.BANDS).map((k) => [k, R.COLONY_ENV.BANDS[k].fobMean, R.COLONY_ENV.BANDS[k].winterKg]), [['sicak', 8.6, 15], ['iliman', 8.6, 20], ['yayla', 11, 22], ['yuksek', 16, 25]]);
{
  const hx = hives[0], ap0 = hx.apiaryId;
  P.setProfile(ap0, 'yuksek');
  const e1 = R.envFor(Object.assign({}, hx, { breed: 'Kafkas' }), '2026-08-15');
  assert.deepStrictEqual([e1.bandKey, e1.breed.key, e1.fobPeak, e1.fobNow], ['yuksek', 'kafkas', 14.4, 14.4]);
  assert.strictEqual(R.envFor(Object.assign({}, hx, { breed: 'Karniyol' }), '2026-12-01').fobNow, Math.round(16 * 1.15 * 0.65 * 100) / 100, 'kış dışı mevsim ×0,65');
  assert.strictEqual(R.envFor(Object.assign({}, hx, { breed: 'Kafkas x Anadolu' })).breed.key, 'kafkas-anadolu');
  assert.strictEqual(P.winterTarget(hx).kg, 25, 'yüksek yayla kış rezervi');
  /* arılık verisi yoksa konum × cins beklentisi: Erzurum'da 9 çerçeve Ağustosta Zayıf, ılımanda Normal */
  const ctxDate = '2025-08-15'; /* arılıkta bu tarihte kayıt yok */
  const lvAt = (band) => { P.setProfile(ap0, band); return R.strengthInfo({ beeFrames: 9, broodFrames: 4, date: ctxDate }, { hiveId: hx.id }); };
  const yk = lvAt('yuksek'), il = lvAt('iliman');
  assert.strictEqual(yk.basis, 'bolge');
  assert.ok(R.STRENGTH_LEVELS.findIndex((x) => x.label === yk.label) < R.STRENGTH_LEVELS.findIndex((x) => x.label === il.label), yk.label + ' < ' + il.label);
  P.setProfile(ap0, '');
}
assert.strictEqual(cls(4, 2, '2026-05-10'), 'Zayıf');
assert.strictEqual(R.strengthClass({ beeFrames: 3, broodFrames: 1, level: 'cok-guclu', date: t }), 'Çok güçlü', 'elle seçim önceliklidir');
assert.ok(R.isWeakClass('Çok zayıf') && R.isWeakClass('Zayıf') && !R.isWeakClass('Normal') && R.isStrongClass('Çok güçlü'));
/* arılık ortalamasına göre (≥3 başka kovan): Erzurum gibi ortalaması yüksek arılıkta 9 çerçeve «Zayıf» olabilir */
const apH = hives.filter((x) => String(x.apiaryId) === String(h.apiaryId));
if (apH.length >= 4) {
  apH.filter((x) => x.id !== h.id).forEach((x) => R.add(x.id, 'strength', { date: t, beeFrames: 16, broodFrames: 8, honeyFrames: 8 }));
  const inf = R.strengthInfo({ beeFrames: 9, broodFrames: 4, date: t }, { hiveId: h.id });
  assert.strictEqual(inf.basis, 'arilik');
  assert.strictEqual(inf.label, 'Zayıf', '9 / 16 ≈ 0,56 → Zayıf');
  assert.strictEqual(R.strengthInfo({ beeFrames: 17, broodFrames: 8, date: t }, { hiveId: h.id }).label, 'Normal');
}
const sr = R.add(h.id, 'strength', { date: t, beeFrames: 8, broodFrames: 4, honeyFrames: 6, level: 'guclu' });
assert.strictEqual(R.recordsFor(h.id).strength[0].level, 'guclu', 'elle seviye saklanır');
assert.strictEqual(R.status(h.id).strengthClass, 'Güçlü');

/* ---- altlık ---- */
assert.strictEqual(P.altlikState(h.id), null);
let r = P.altlikPut(h.id);
assert.ok(r.ok, r.msg);
let al = P.altlikState(h.id);
assert.deepStrictEqual([al.put, al.days, al.ready], [t, 0, false]);
assert.strictEqual(open(/^Altlığı çıkar/).length, 1, '«Altlığı çıkar, say» görevi');
assert.strictEqual(open(/^Altlığı çıkar/)[0].due, P.addDays(t, 7));
assert.ok(T.tare(h.id, t + 'T12:00').items.some((x) => x.label === 'Yapışkan altlık'), 'altlık darası');
assert.strictEqual(P.altlikPut(h.id).ok, false, 'ikinci kez konmaz');
/* 5 gün önce konmuş gibi: hazır (≥3), ideal değil (<7) */
const koy = D.taskStore.all().find((x) => String(x.hiveId) === String(h.id) && x.done && /\[varroa-altlik:koy\]/.test(x.note || ''));
D.taskStore.complete(koy.id, { date: P.addDays(t, -5), note: 'Altlık koydum' });
al = P.altlikState(h.id);
assert.deepStrictEqual([al.days, al.ready, al.ideal], [5, true, false]);
/* altlıkla sayım: gün sayısı kaydedilir, görev kapanır, altlık durumu biter */
r = P.saveCount(h.id, 40, 'tabla', 5);
assert.ok(r.ok, r.msg);
const vr = R.recordsFor(h.id).disease.find((x) => x.method === 'tabla');
assert.strictEqual(vr.days, 5);
assert.strictEqual(P.altlikState(h.id), null);
assert.strictEqual(open(/^Altlığı çıkar/).length, 0);
assert.ok(!T.tare(h.id, t + 'T13:00').items.some((x) => x.label === 'Yapışkan altlık'), 'sayım sonrası dara kalkar');

/* ---- planlı muayene ---- */
const h2 = hives.find((x) => x.id !== h.id && String(x.apiaryId) === String(h.apiaryId)) || hives.find((x) => x.id !== h.id);
const open2 = (re) => D.taskStore.open().filter((x) => String(x.hiveId) === String(h2.id) && re.test(String(x.title) + ' ' + String(x.note || '')));
r = P.setPlan(h2.id, P.addDays(t, 12), 'kovan');
assert.ok(r.ok, r.msg);
assert.deepStrictEqual([P.planFor(h2).date, P.planFor(h2).scope, P.planFor(h2).days], [P.addDays(t, 12), 'kovan', 12]);
assert.strictEqual(open2(/^Altlık koy \(muayene/).length, 1);
assert.strictEqual(open2(/^Altlık koy \(muayene/)[0].due, P.addDays(t, 5), 'muayeneden 7 gün önce');
P.syncAltlik(h2); P.countTask(h2);
assert.strictEqual(open2(/^Altlık koy|^Yapışkan altlık/).length, 1, 'mükerrer yok');
/* plan değişir → eski hatırlatma yenilenir */
P.setPlan(h2.id, P.addDays(t, 20), 'kovan');
assert.strictEqual(open2(/\[muayene-plan\]/).length, 1);
assert.strictEqual(open2(/^Altlık koy \(muayene/).length, 1);
assert.strictEqual(open2(/^Altlık koy \(muayene/)[0].due, P.addDays(t, 13));
/* 7 günden az → altlık önerilmez, alkol / pudra şekeri */
r = P.setPlan(h2.id, P.addDays(t, 4), 'kovan');
assert.ok(/alkol \/ pudra şekeri/.test(r.msg), r.msg);
assert.strictEqual(open2(/^Altlık koy \(muayene/).length, 0);
/* altlık takılıysa plan günü «Altlığı çıkar, say» */
P.setPlan(h2.id, P.addDays(t, 10), 'kovan');
const pre = open2(/^Altlık koy \(muayene/)[0];
D.taskStore.complete(pre.id, { date: P.addDays(t, -1) });
P.syncAltlik(h2);
assert.strictEqual(open2(/^Altlığı çıkar/)[0].due, P.addDays(t, 10));
/* arılık kapsamı: görev arılığa bağlı */
r = P.setPlan(h.id, P.addDays(t, 9), 'arilik');
assert.ok(r.ok);
assert.strictEqual(P.planFor(h).scope, 'arilik');

/* ---- şeritler ---- */
const h3 = hives.find((x) => ![h.id, h2.id].includes(x.id));
R.add(h3.id, 'disease', { date: P.addDays(t, -20), disease: 'varroa', count: 9, method: 'alkol', treatment: 'Beeraz (Amitraz 500 mg / şerit)', dose: 2, doseUnit: 'serit' });
D.taskStore.add({ title: 'Şeritleri çıkar (Beeraz) — ' + h3.name, hiveId: h3.id, due: P.addDays(t, 22), priority: 1 });
const si = P.stripsIn(h3);
assert.ok(si && si.days === 20 && si.qty === 2, JSON.stringify(si));
assert.ok(T.tare(h3.id, t + 'T12:00').items.some((x) => /şerit/.test(x.label)));
r = P.stripsOut(h3.id);
assert.ok(r.ok, r.msg);
assert.ok(/en az \d+ gün/.test(r.msg), 'etiket süresinden önce çıkarma notu');
assert.strictEqual(P.stripsIn(h3), null);
assert.ok(!T.tare(h3.id, t + 'T13:00').items.some((x) => /şerit/.test(x.label)), 'dara kalkar');

/* ---- besleyici darası ---- */
assert.strictEqual(T.feeder.get(h3.id).on, false);
T.feeder.setKg(h3.id, '0,8'); T.feeder.setOn(h3.id, true);
assert.ok(T.tare(h3.id, t + 'T14:00').items.some((x) => x.label === 'Besleyici' && x.kg === 0.8));
T.feeder.setOn(h3.id, false, P.addDays(t, 1));
assert.ok(!T.tare(h3.id, P.addDays(t, 2) + 'T10:00').items.some((x) => x.label === 'Besleyici'));

/* ---- 3 durumlu besleme önerisi ---- */
const cands = hives.filter((x) => P.seasonKind(x.apiaryId, t) === 'sonbahar' && !P.hasSuper(x.id) && ![h.id, h2.id, h3.id].includes(x.id));
const adv = (hx, honey, bees) => { (R.recordsFor(hx.id).strength || []).filter((q) => q.date === t).forEach((q) => R.remove(hx.id, 'strength', q.id)); R.add(hx.id, 'strength', { date: t, beeFrames: bees || 7, broodFrames: 3, honeyFrames: honey }); return P.feedAdvice(hx); };
let fh = null, fa = null;
for (const c of cands) { fa = adv(c, 1); if (fa.tier === 'gerekli') { fh = c; break; } }
assert.ok(fh, 'beslemesi gereken sonbahar kovanı');
assert.ok(/^Şurup 2:1, [\d,]+ L önerilir$/.test(fa.title), fa.title);
assert.ok(/açık ≈/.test(fa.why));
const tgt = fa.fp.targetKg, fed = Math.round((fa.fp.storesKg - P.KG_PER_HONEY_FRAME) * 10) / 10;
const full = Math.ceil((tgt - fed) / P.KG_PER_HONEY_FRAME);
fa = adv(fh, full);
const surplus = fa.fp.storesKg - tgt, pay = 3 * 0.8 * (/güçlü/i.test(fa.level || '') ? 2 : 1);
assert.strictEqual(fa.tier, surplus < pay ? 'faydali' : 'gerekmez', JSON.stringify([surplus, pay, fa.title]));
if (fa.tier === 'faydali') assert.ok(/^Normalde gerek yok; 3 L şurup 2:1 verirsen/.test(fa.title), fa.title);
fa = adv(fh, full + 3);
assert.strictEqual(fa.tier, 'gerekmez');
assert.strictEqual(fa.title, 'Besleme gerekmez: stok yeterli');
assert.ok(!/skor|puan|formül/i.test(JSON.stringify([fa.title, fa.why])), 'formül / skor gösterilmez');
/* isteğe bağlı besleme kaydı */
r = P.saveOptionalFeed(fh.id, 'surup21', 3);
assert.ok(r.ok, r.msg);
assert.strictEqual(R.recordsFor(fh.id).feed[0].amount, 3);
console.log('k84-onizleme ok');

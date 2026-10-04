/* koloni-81: Varroa sayım alanı — kaynaklı sezon eşikleri (HBHC 2026 / NBU), eşik altı / izle / tedavi önerisi, rotasyon (aynı etken madde art arda yok),
 * stoktaki ruhsatlı ürün öne, etiket dozu + yerleşim, süresi dolmuş şerit → önce çıkar, tedavi sonrası şerit çıkarma + kontrol sayımı görevleri,
 * mükerrer olmayan sayım görevi; kovandaki malzeme darası (şerit, altlık, besleyicideki yem). */
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
const D = globalThis.SuperAriDemo, I = globalThis.SuperAriIlac, P = globalThis.SuperAriPlan, T = globalThis.SuperAriTarti;
const t = P.today();
assert.strictEqual(t, '2026-10-04');

/* eşikler (HBHC Tablo 1): ilkbahar/kış %1, yaz/akım/sonbahar %2; izle = eşiğin yarısı */
assert.deepStrictEqual(Object.keys(P.VARROA.PHASE).map((k) => [k, P.VARROA.PHASE[k].thr]), [['kis', 1], ['ilkbahar', 1], ['akim', 2], ['yaz', 2], ['sonbahar', 2]]);
const h = D.loadHives().find((x) => !P.flowAt(x.apiaryId, t).flow && !P.hasSuper(x.id) && P.seasonKind(x.apiaryId, t) === 'sonbahar');
assert.ok(h, 'akımsız sonbahar kovanı');
const band = (c, m) => P.varroaBand(h.apiaryId, { count: c, method: m || 'alkol' }, t);
assert.deepStrictEqual([0, 2, 3, 5, 6, 9].map((c) => band(c).band), ['alti', 'alti', 'izle', 'izle', 'tedavi', 'tedavi'], 'sonbahar: 300 arıda 6 akar = %2 → tedavi');
assert.strictEqual(band(9).text, 'Tedavi gerekli: %3 bulaşma — sonbahar (nüfus azalışı) eşiği %2');
assert.strictEqual(band(2).text, 'Eşik altı: %0,7 bulaşma (sonbahar (nüfus azalışı) eşiği %2)');
/* yapışkan altlık (NBU): Eki ×100, 1000 akar → günde 10; 7 gün varsayımı */
assert.deepStrictEqual([30, 40, 70].map((c) => band(c, 'tabla').band), ['alti', 'izle', 'tedavi']);
assert.strictEqual(band(70, 'tabla').metric, 'günde 10 akar düşüş');
/* ilkbahar eşiği daha düşük (%1) */
assert.strictEqual(P.varroaBand(h.apiaryId, { count: 3, method: 'alkol' }, '2026-04-10').band === 'tedavi' || P.seasonKind(h.apiaryId, '2026-04-10') === 'akim', true);

/* öneri metni: eşik altı → 30 gün, izle → 14 gün */
assert.ok(/30 gün sonra tekrar sayın/.test(P.varroaAdvice(h.id, 1, 'alkol').steps.join(' ')));
assert.ok(/14 gün sonra tekrar sayın/.test(P.varroaAdvice(h.id, 4, 'alkol').steps.join(' ')));

/* önceki tedavi: Beeraz (amitraz), etiket süresi (42 gün) doldu, şerit görevi açık → önce çıkar; rotasyon: amitraz önerilmez */
D.records.add(h.id, 'disease', { date: P.addDays(t, -50), disease: 'varroa', count: 12, method: 'alkol', treatment: 'Beeraz (Amitraz 500 mg / şerit)', dose: 2, doseUnit: 'serit', checkDate: P.addDays(t, -8) });
const rem = D.taskStore.add({ title: 'Şeritleri çıkar (Beeraz) ve varroa sayımı yap — ' + h.name, hiveId: h.id, due: P.addDays(t, -8), priority: 1 });
let a = P.varroaAdvice(h.id, 9, 'alkol');
assert.strictEqual(a.band, 'tedavi');
assert.ok(/^Önce önceki şeritleri çıkarın: Beeraz 2 şerit/.test(a.steps[0]), a.steps[0]);
assert.ok(a.mp.best && I.byId(a.mp.best.id).group !== 'amitraz', 'aynı etken madde art arda önerilmez');
const lab = I.doseFor(a.mp.best.id, P.hiveState(h).beeFrames);
assert.ok(a.steps.some((x) => x === 'Şerit koy: ' + lab.text + ' adet ' + a.mp.best.name + ' (etiket dozu' + (I.byId(a.mp.best.id).dose.type === 'frames' ? ', arılı çerçeveye göre' : '') + ').'), 'yalnız etiket dozu');
assert.ok(a.steps.some((x) => /^Yerleşim: /.test(x)), 'etiket yerleşimi');
assert.ok(a.steps.some((x) => /^Bal: /.test(x)), 'bal / arınma uyarısı etiketten');
assert.ok(a.steps.some((x) => /alınmalı/.test(x)), 'stokta farklı etken maddeli şerit yok → alınmalı');
/* stokta farklı gruptan ürün varsa öne alınır */
D.stock.save({ name: 'Checkmite şerit', category: 'ilac', unit: 'şerit', qty: 10 });
a = P.varroaAdvice(h.id, 9, 'alkol');
assert.strictEqual(a.mp.best.id, 'checkmite', 'stoktaki farklı etken madde öne');
assert.ok(a.steps.some((x) => x === 'Stokta var: Checkmite şerit (10 şerit).'));
assert.ok(!a.steps.join(' ').match(/\d+,\d+ şerit|yarım şerit/), 'ayarlı / etiket dışı doz yok');

/* tedavi sonrası görevler: şerit çıkarma + kontrol sayımı (etiket süresi sonunda) */
const tk = P.treatTasks(h, I.byId('checkmite'), t);
assert.deepStrictEqual(tk.map((x) => [x.title.split(' — ')[0], x.due]), [['Şeritleri çıkar (Checkmite, etiket 42 gün)', '2026-11-15'], ['Kontrol sayımı (tedavi sonrası, Checkmite)', '2026-11-15']]);
/* tekrar sayım görevi mükerrer değil (kontrol sayımı zaten açık) */
assert.strictEqual(P.recountTask(h.id, { band: { band: 'alti' } }), null);

/* sayım yok → «Varroa sayımı» görevi bir kez */
const h2 = D.loadHives().find((x) => x.id !== h.id && !P.hiveState(x).varroa && P.seasonKind(x.apiaryId, t) !== 'kis');
const c1 = P.countTask(h2), c2 = P.countTask(h2);
assert.ok(c1 && /^Varroa sayımı/.test(c1.title)); assert.strictEqual(c2, null, 'mükerrer görev yok');

/* placement metni ÜÖÖ'den */
assert.ok(/^1\. şerit 2\.–3\., 2\. şerit 5\.–6\. çerçeve arasına\./.test(I.placementFor('beeraz', 2)));
assert.strictEqual(I.placementFor('oksalik', 2), '');

/* dara: şerit (çıkarılana kadar), besleyicideki şurup (tükenene kadar azalır), altlık */
const h3 = D.loadHives().find((x) => x.id !== h.id && x.id !== h2.id);
const base = T.tare(h3.id, t).kg;
D.records.add(h3.id, 'disease', { date: P.addDays(t, -5), disease: 'varroa', count: 9, method: 'alkol', treatment: 'Bayvarol (Flumetrin 3,6 mg / şerit)', dose: 4, doseUnit: 'serit' });
D.records.add(h3.id, 'feed', { date: P.addDays(t, -1), type: 'surup21', amount: 3 });
let tw = T.tare(h3.id, t);
assert.ok(tw.items.some((x) => x.label === 'Bayvarol 4 şerit' && x.kg === 0.04));
const sy = tw.items.find((x) => /^Şurup 2:1/.test(x.label));
assert.strictEqual(sy.kg, Math.round(3 * T.MATERIAL.feedKg.surup21 * (1 - 1 / T.MATERIAL.consumeDays.surup21) * 100) / 100);
assert.strictEqual(T.tare(h3.id, P.addDays(t, 4)).items.some((x) => /^Şurup/.test(x.label)), false, 'şurup tükenince dara kalkar');
const rt = D.taskStore.add({ title: 'Şeritleri çıkar (Bayvarol) — ' + h3.name, hiveId: h3.id, due: t, priority: 1 });
D.taskStore.complete(rt.id, { date: t });
assert.strictEqual(T.tare(h3.id, t).items.some((x) => /Bayvarol/.test(x.label)), false, 'şerit çıkarılınca dara kalkar');
assert.strictEqual(T.tare(h3.id, P.addDays(t, -1)).items.some((x) => /Bayvarol/.test(x.label)), true, 'çıkarmadan önceki tartımda dara vardı');
const ak = D.taskStore.add({ title: 'Yapışkan altlık koy — ' + h3.name, hiveId: h3.id, due: t, note: '[varroa-altlik:koy]' });
D.taskStore.complete(ak.id, { date: t });
assert.ok(T.tare(h3.id, t).items.some((x) => x.label === 'Yapışkan altlık' && x.kg === T.MATERIAL.altlikKg));
/* elle tartım: dara kayıtta saklanır, net = kg − dara, not metni */
const r = T.add({ hiveId: h3.id, kg: 40, at: t + 'T10:00' });
assert.ok(r.tareKg > 0 && T.netOf(r) === Math.round((40 - r.tareKg) * 100) / 100);
assert.ok(/net .* kg · kovandaki malzeme düşüldü: .* kg/.test(T.flagText(r)));
assert.strictEqual(T.tareNote({ kg: 0.19 }), 'kovandaki malzeme düşüldü: 0,19 kg');
void base; void rem;
console.log('varroa-oneri ok');

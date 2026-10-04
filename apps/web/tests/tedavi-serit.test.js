/* koloni-79: Tedavi kaydı — gerçek şerit/kovan (varsayılan etiket dozu), stoktan gerçek miktar düşülür; etiket+1 nötr not, ≥ etiket+2 güçlü uyarı + onay;
 * eski ilaç (SKT / açıldıktan sonra) bilgi notu — doz önerilmez; notlar Uyarılar'a girmez. */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const W = path.join(__dirname, '..') + path.sep;
const RealDate = Date;
const FIX = new RealDate('2026-10-04T12:00:00+03:00').getTime();
class FakeDate extends RealDate { constructor(...a) { if (a.length) super(...a); else super(FIX); } static now() { return FIX; } }
globalThis.Date = FakeDate;
const mem = {};
globalThis.window = globalThis;
globalThis.localStorage = { getItem: (k) => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: (k) => { delete mem[k]; }, key: (i) => Object.keys(mem)[i], get length() { return Object.keys(mem).length; } };
globalThis.document = { addEventListener() {}, querySelector() { return null; }, querySelectorAll() { return []; }, createElement() { return { style: {}, setAttribute() {}, appendChild() {} }; }, documentElement: { style: {} }, readyState: 'complete', head: { appendChild() {} } };
globalThis.addEventListener = () => {}; globalThis.dispatchEvent = () => {};
globalThis.location = { href: 'http://x/bakim-yap.html', search: '', pathname: '/bakim-yap.html', hash: '' };
globalThis.navigator = { onLine: true };
['demo-data.js', 'ilac-katalog.js', 'bakim-plan.js'].forEach((f) => require(W + f));
const D = globalThis.SuperAriDemo, I = globalThis.SuperAriIlac, P = globalThis.SuperAriPlan;

/* eşikler: yalnız etiket dozuna göre */
const lv = (e, l) => I.doseCheck(e, l, 'serit').level;
assert.deepStrictEqual([1, 2, 3, 4, 5].map((e) => lv(e, 2)), ['note', 'ok', 'note', 'warn', 'warn']);
assert.deepStrictEqual([lv(2, 1), lv(3, 1), lv(2.5, 1)], ['note', 'warn', 'warn'], 'etiket 1: +1 nötr, 1,5× ve > etiket+1 uyarı');
assert.deepStrictEqual([lv(5, 4), lv(6, 4)], ['note', 'warn']);
assert.strictEqual(lv(3, null), 'none', 'etiket yoksa not yok (doz uydurulmaz)');
assert.strictEqual(I.doseCheck(3, 2, 'serit').text, 'etiket dozu: 2 şerit/kovan');
assert.strictEqual(I.doseCheck(4, 2, 'serit').text, 'Etiket dozunun çok üstünde: kalıntı ve arıya zarar riski. Etiket: 2 şerit/kovan');

/* raf ömrü / açıldıktan sonra */
const S = I.STORAGE;
assert.deepStrictEqual(['beeraz', 'beevarflu', 'fumbee', 'varodur'].map((k) => [S[k].shelfYears, S[k].openedDays]), [[2, 42], [2, 42], [2, 42], [2, 42]]);
assert.deepStrictEqual([S.bayvarol.shelfYears, S.bayvarol.openedDays, S.polyvar.shelfYears, S.polyvar.openedDays, S.checkmite.shelfYears, S.checkmite.openedDays], [5, 42, 3, 0, 3, 0]);
assert.deepStrictEqual([S.rulamitva.shelfYears, S.rulamitva.openedDays, S.vamitratva.shelfYears], [2, null, 2]);
assert.strictEqual(I.storage('rulamit'), null, 'Rulamit şerit: bilinmiyor');
/* bilgi notları: SKT/açılma eşikleri doz eşiğini değiştirmez; doz önerisi yok */
const t = '2026-10-04';
assert.strictEqual(I.ageNote('beeraz', { skt: '2026-06-01' }, 2, 'serit', t),
  'SKT 4 ay geçmiş · Araştırmaya göre (USDA 2024) eski şeritte etkinlik kaybı gözlenmedi · etiket dozu yeterli, fazla şerit gerekmez · etiket dozu: 2 şerit/kovan');
assert.strictEqual(I.ageNote('bayvarol', { opened: '2026-07-01' }, 4, 'serit', t),
  'Açıldıktan sonra 6 hafta önerilir, 3 ay geçmiş · bu konuda araştırma verisi yok, etkinlik garanti değil · yeni paket önerilir · etiket dozu: 4 şerit/kovan');
assert.ok(/^Açıldıktan sonra hemen kullanılmalı, /.test(I.ageNote('polyvar', { opened: '2026-09-01' }, 2, 'serit', t)));
assert.strictEqual(I.ageNote('beeraz', { opened: '2026-09-10', skt: '2027-01-01' }, 2, 'serit', t), '', 'süre dolmadı → not yok');
assert.strictEqual(I.ageNote('rulamit', { opened: '2024-01-01' }, 2, 'serit', t), '', 'açılma süresi bilinmiyor → not yok');
assert.ok(/USDA 2024/.test(I.ageNote(null, { name: 'Amitraz şerit (onaylı)', skt: '2026-01-01' }, 2, 'serit', t)), 'ad ile amitraz şerit');
assert.ok(/araştırma verisi yok/.test(I.ageNote('vamitratva', { skt: '2026-01-01' }, null, 'serit', t)), 'tütsü amitraz: genel not');
for (const k of Object.keys(S)) {
  const n = I.ageNote(k, { skt: '2025-01-01', opened: '2025-01-01' }, 2, 'serit', t);
  assert.ok(!/\d,\d|önerilen doz|şerit kullan/i.test(n.replace('etiket dozu: 2 şerit/kovan', '')), 'ayarlı doz önerisi yok: ' + n);
}
assert.strictEqual(I.productOfItem({ name: 'Beeraz şerit' }), 'beeraz');

/* stok: «Açıldı» tarihi yalnız ilaçta */
const it = D.stock.save({ name: 'Rulamit şerit', category: 'ilac', unit: 'şerit', qty: 40, opened: '2026-09-01', skt: '2027-05-01' });
assert.deepStrictEqual([it.opened, it.skt], ['2026-09-01', '2027-05-01']);
assert.ok(!D.stock.save({ name: 'Şeker', category: 'besin', unit: 'kg', qty: 1, opened: '2026-09-01' }).opened);

/* saveTreatment: gerçek şerit/kovan kaydedilir, stoktan gerçek miktar düşülür */
const hs = D.loadHives();
let h = null, mp = null;
for (const x of hs) { try { const m = P.medPlan(x); if (m.canTreat && m.best && (m.level === 'tedavi' || m.level === 'planla') && m.products.some((p) => p.id === 'rulamit' && p.dose.ok && !p.blocks.length)) { h = x; mp = m; break; } } catch (e) { /* */ } }
if (!h) {
  /* demo verisinde uygun kovan yoksa: yüksek akar sayısı gir */
  for (const x of hs) { try { P.saveCount(x.id, 30, 'alkol'); const m = P.medPlan(D.hiveById(x.id)); if (m.canTreat && m.products.some((p) => p.id === 'rulamit' && p.dose.ok && !p.blocks.length)) { h = x; mp = m; break; } } catch (e) { /* */ } }
}
assert.ok(h, 'tedavi edilebilir kovan');
const q0 = D.stock.list().find((x) => x.id === it.id).qty;
const r = P.saveTreatment(h.id, 'rulamit', 3);
assert.ok(r.ok, r.msg);
assert.ok(/3 şerit \(etiket dozu: 2\)/.test(r.msg), r.msg);
const q1 = D.stock.list().find((x) => x.id === it.id).qty;
assert.strictEqual(q0 - q1, 3, 'stoktan gerçek miktar (3) düşüldü');
const dl = D.records.recordsFor(h.id).disease.filter((x) => /Rulamit/.test(x.treatment || ''));
assert.ok(dl.some((x) => x.dose === 3 && x.doseUnit === 'serit' && x.labelDose === 2), 'kayıtta gerçek doz + etiket dozu: ' + JSON.stringify(dl));
const r2 = P.saveTreatment(h.id, 'rulamit');
/* ikinci kayıt «önceki tedavi sürüyor» ile engellenebilir — varsayılan etiket dozunu ayrıca doğrula */
if (r2.ok) assert.ok(/2 şerit kaydedildi/.test(r2.msg));

/* arayüz bağları; notlar Uyarılar'a girmez */
const ko = fs.readFileSync(W + 'koloni.js', 'utf8'), ba = fs.readFileSync(W + 'bakim-akis.js', 'utf8'), bp = fs.readFileSync(W + 'bakim-plan.js', 'utf8');
assert.ok(ko.includes('qkDoseChk') && ko.includes('askHighDose') && ko.includes('data-dz="1"') && /min-height:64px/.test(ko));
assert.ok(ba.includes('labelFor') && ba.includes('askHighDose'));
assert.ok(bp.includes('data-bo-dz') && bp.includes('askHighDose') && /min-height:72px/.test(bp));
assert.ok(fs.readFileSync(W + 'ilac-katalog.js', 'utf8').includes('Yine de kaydet') && fs.readFileSync(W + 'ilac-katalog.js', 'utf8').includes('Düzelt'));
const uy = fs.readFileSync(W + 'uyarilar.html', 'utf8') + fs.readFileSync(W + 'demo-data.js', 'utf8');
assert.ok(!/\bageNote\b|USDA|araştırma verisi yok/.test(uy), 'Uyarılar sayfasına girmez');
console.log('tedavi-serit: ok');

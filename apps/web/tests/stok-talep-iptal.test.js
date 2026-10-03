/* Talep iptali: kayıtta stoğa giren «Mevcut» miktarlar geri alınır ve Mevcut alanlarına döner (koloni-67).
 * «Stoğa ekle» ile işlenen alımlar değişmez; iptal tekrar çağrılınca bir şey değişmez; eski kayıtlar (id/at yok) tarihle eşlenir. */
const assert = require('assert');
const fs = require('fs');
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
const MEV = 'Giriş (mevcut, talep sırasında)';
const item = (re) => D.stock.list().find((x) => re.test(T.norm(x.name)) && x.unit === 'kg' && !x.feedType);
const mevLogs = () => D.stock.list().reduce((a, x) => a + x.log.filter((l) => /mevcut/i.test(l.reason)).length, 0);
const REFD = { updated: '2026-10-03', items: [{ key: 'seker', ref: 40, n: 3 }, { key: 'alkol', ref: 300, n: 2 }] };

T.withRef(REFD, () => {
  const sug0 = item(/seker/).qty, n0 = D.stock.list().length;
  /* 1) kayıt: Mevcut stoğa girer */
  T.setMevcut('seker', '100'); T.setMevcut('alt_tabla', '3');
  const t = T.saveTalep(T.build('a2'), 'Tortum');
  assert.strictEqual(t.mevcutAdded.length, 2);
  t.mevcutAdded.forEach((x) => { assert.ok(x.id && x.at && x.dq > 0, 'hareket kimliği saklanır'); });
  assert.strictEqual(item(/seker/).qty, Math.round((sug0 + 100) * 10) / 10);
  assert.ok(D.stock.list().some((x) => /alt tabla/i.test(x.name)), 'alt tabla kalemi oluştu');
  assert.deepStrictEqual(T.mevcut(), {});
  /* 2) alım kaydı (Stoğa ekle) — iptalde değişmemeli */
  const ai = t.lines.findIndex((l) => l.key === 'alkol');
  assert.ok(ai >= 0, 'alkol satırı');
  T.recordPurchase(t.id, [{ i: ai, q: 1, p: 320 }], { stock: true, savePrice: false });
  const alk = D.stock.list().find((x) => /alkol/i.test(x.name));
  assert.ok(alk && alk.qty === 1, 'alım stoğa girdi');
  /* 3) kullanıcı sonradan yeni Mevcut girdi: iptal üstüne ekler */
  T.setMevcut('seker', '5');
  /* 4) iptal */
  const c = T.cancelTalep(t.id);
  assert.strictEqual(T.statusOf(c), 'iptal');
  assert.strictEqual(item(/seker/).qty, sug0, 'şeker stoğu kayıt öncesine döndü');
  assert.strictEqual(mevLogs(), 0, 'Hareketlerde mevcut girişi kalmadı');
  assert.ok(!D.stock.list().some((x) => /alt tabla/i.test(x.name)), 'talebin oluşturduğu boş kalem kaldırıldı');
  assert.strictEqual(D.stock.list().length, n0 + 1, 'yalnız alım kalemi (alkol) kaldı');
  assert.deepStrictEqual(T.mevcut(), { seker: 105, alt_tabla: 3 }, 'Mevcut alanlarına geri döndü');
  assert.strictEqual(D.stock.list().find((x) => /alkol/i.test(x.name)).qty, 1, 'Stoğa eklenen alım değişmez');
  assert.deepStrictEqual(c.mevcutReverted.items.map((x) => x.how), ['silindi', 'silindi']);
  assert.strictEqual(T.build('a2').combined.lines.find((l) => l.key === 'seker').mev, 105, 'canlı talep yeniden gösterir');
  /* 5) tekrar iptal: değişiklik yok */
  const c2 = T.cancelTalep(t.id);
  assert.strictEqual(c2.cancelledAt, c.cancelledAt);
  assert.deepStrictEqual(T.mevcut(), { seker: 105, alt_tabla: 3 });
  assert.strictEqual(item(/seker/).qty, sug0);

  /* 6) eski biçim (koloni-64: id/at/dq yok) + hareketi bulunamayan kalem → tarihle eşleme / etiketli ters hareket */
  T.clearMevcut();
  T.setMevcut('seker', '20');
  const t3 = T.saveTalep(T.build('a2'), 'Tortum');
  const s1 = item(/seker/).qty;
  const key = 'superari.stok.talep.demo.v1', all = JSON.parse(localStorage.getItem(key));
  const rec = all.find((x) => x.id === t3.id);
  rec.mevcutAdded = rec.mevcutAdded.map((x) => ({ key: x.key, name: x.name, q: x.q, unit: x.unit }));
  rec.mevcutAdded.push({ key: 'seker', name: 'Toz şeker', q: 7, unit: 'kg' }); /* stokta karşılığı yok */
  localStorage.setItem(key, JSON.stringify(all));
  const c3 = T.cancelTalep(t3.id);
  assert.deepStrictEqual(c3.mevcutReverted.items.map((x) => x.how), ['silindi', 'ters']);
  assert.strictEqual(item(/seker/).qty, Math.round((s1 - 20 - 7) * 10) / 10);
  assert.ok(item(/seker/).log.some((l) => /^İptal: mevcut talebe geri döndü/.test(l.reason) && l.delta === -7), 'ters hareket açıkça etiketli');
  assert.deepStrictEqual(T.mevcut(), { seker: 27 });

  /* 7) mevcutAdded olmayan eski talep: yalnız durum değişir */
  T.clearMevcut();
  const t4 = T.saveTalep(T.build('a2'), 'Tortum');
  const s4 = item(/seker/).qty;
  const c4 = T.cancelTalep(t4.id);
  assert.strictEqual(T.statusOf(c4), 'iptal'); assert.ok(!c4.mevcutReverted);
  assert.strictEqual(item(/seker/).qty, s4); assert.deepStrictEqual(T.mevcut(), {});
});

/* 8) kayıtlı talep kartı «≈ 0 ₺» göstermez; onay metni Mevcut dönüşünü söyler */
const html = fs.readFileSync(W + 'stok.html', 'utf8');
const sl = html.slice(html.indexOf('function savedListHtml'), html.indexOf('function mevList'));
assert.ok(!/'≈ ' \+ money\(t\.total\)/.test(sl), 'kartta koşulsuz ≈ toplam yok');
assert.ok(/'fiyatsız'/.test(sl) && /fiyatsız\)'/.test(sl), 'fiyatsız / (N fiyatsız)');
assert.ok(/Stoğa eklenen alımlar değişmez\./.test(html) && /Mevcut alanlarına geri döner/.test(html), 'iptal onay metni');
globalThis.Date = RealDate;
console.log('stok-talep-iptal: geçti');

/* Alım talebi — her katalog anahtarı için gerçekçi kovan / arılık sınırları (koloni-64 denetimi).
 * Gerçek demo verisi + bakım planı + ilaç kataloğu yüklenir (tarayıcısız); tarih sabitlenir, mevsim başına tekrar edilir.
 * Sınırlar koddan bağımsız, saha pratiğine göre yazıldı: aşan / çift sayılan satır testi düşürür. */
const assert = require('assert');
const path = require('path');
const W = path.join(__dirname, '..') + path.sep;
const MODS = ['demo-data.js', 'ilac-katalog.js', 'bakim-plan.js', 'stok-talep.js'];
const RealDate = Date;

/* Gerçekçi üst sınırlar: kovan başına (h), arılık başına (a), işletmede bir kez (once), muayeneli kovan başına (i).
 * Yuvarlama payı: arılık başına bölünebilir paket için +1 (r). Stok eşiği yenilemesi ayrıca eklenir. */
const LIM = {
  seker: { h: 12, why: 'güz takviyesi 2:1 şurupla en çok ~15 L/kovan ≈ 11,3 kg şeker' },
  kek: { h: 4 }, polen: { h: 1 },
  vitamin: { h: 1 / 40, r: 1, why: '1 paket ≈ 40 kovanın şurubu' },
  tuz: { a: 1 },
  serit_amitraz: { h: 4, why: 'etiket: kuluçkalık başına 2 şerit' }, serit_flumetrin: { h: 4 }, serit_taufluvalinat: { h: 4 }, serit_koumafos: { h: 4 },
  ilac_teyit: { a: 1 },
  okzalik: { h: 1 / 25, r: 1, why: 'damlatma: 1 paket ≈ 25 kovan' }, formik: { h: 1 / 10, r: 1 }, timol: { a: 1 },
  nitril: { a: 8 / 50, h: 1 / 50, r: 1, why: 'arılık × ziyaret × 2 çift + asit; 50 çift/kutu' },
  gozluk: { once: 1 }, maske: { once: 1 }, arici_eldiven: { once: 1 }, siringa: { once: 1 }, buharlastirici: { once: 1 },
  olcu_kabi: { once: 1 }, alkol_kabi: { once: 1 }, koruk: { once: 1 }, kaziyici: { once: 1 },
  alt_tabla: { a: 3, why: 'arılıkta 2–3 örnek kovan; yeniden kullanılır' },
  alkol: { a: 0.5, i: 0.1, r: 0.5, why: 'örnek yıkama, süzülüp yeniden kullanılır' },
  koruk_yakit: { a: 0.3, h: 0.015, r: 1, why: '3 ziyaret × (0,1 kg/arılık + 5 g/kovan)' },
  cakmak: { a: 0.2, r: 1 },
  cerceve: { h: 10 }, temel_petek: { h: 10 }, kat: { h: 2 }, ana_izgarasi: { h: 1 },
  kapi_daraltici: { h: 0.25, r: 1, why: 'çoğu kovanda var: yalnız bulgu + %10 yedek' },
  besleyici: { h: 1 },
  dezenfektan: { a: 0.5, h: 0.1, r: 0.5 }
};
const ONCE = ['gozluk', 'maske', 'arici_eldiven', 'siringa', 'buharlastirici', 'olcu_kabi', 'alkol_kabi', 'koruk', 'kaziyici'];
const GROW = ['cerceve', 'temel_petek', 'kat', 'ana_izgarasi'];

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

function thrTarget(T, key, tol) {
  const c = T.BY[key]; let t = 0;
  globalThis.SuperAriDemo.stock.list().forEach((x) => {
    if (!(Number(x.threshold) > 0)) return;
    const hit = T.CAT.find((k) => k.re && k.re.test(T.norm(x.name)));
    if (hit && hit.key === key) t += Number(x.threshold) * (1 + tol) + (c.step || 1);
  });
  return t;
}

let checks = 0;
function checkReq(T, rq, label) {
  const nAp = rq.sections.length, H = rq.hives, I = rq.insp;
  assert.ok(H > 0, label + ': kovan yok');
  rq.combined.lines.forEach((l) => {
    const L = LIM[l.key]; const c = T.BY[l.key];
    assert.ok(L, label + ': sınırı tanımsız anahtar ' + l.key);
    let max = (L.h || 0) * H + (L.a || 0) * nAp + (L.i || 0) * I + (L.once || 0) + (L.r || 0) * nAp;
    if (ONCE.includes(l.key)) max = 1;
    max += thrTarget(T, l.key, rq.tol);
    assert.ok(l.need <= max + 1e-9, `${label}: ${l.key} = ${l.need} ${l.unit} > gerçekçi üst sınır ${Math.round(max * 10) / 10} (${H} kovan, ${nAp} arılık${L.why ? '; ' + L.why : ''})`);
    /* pay yalnız kovanla ölçeklenen sarfa; dayanıklı / arılık / şerit satırında need = m + t (yukarı yuvarlı) */
    if (!T.tolOn(c) && !thrTarget(T, l.key, rq.tol)) {
      const raw = Math.ceil(((l.m || 0) + (l.t || 0)) / (c.step || 1) - 1e-9) * (c.step || 1);
      assert.ok(l.need <= raw + 1e-9, `${label}: ${l.key} paysız olmalı (need ${l.need}, m+t ${raw})`);
    }
    checks++;
  });
  /* tek seferlik aletler arılık başına değil, bir kez */
  ONCE.forEach((k) => { const l = rq.combined.lines.find((x) => x.key === k); if (l) assert.ok(l.need <= 1, label + ': ' + k + ' bir kez sayılmalı'); });
  /* güz / kış: büyüme malzemesi (stok eşiği dışında) sıfır */
  if (rq.sections.every((s) => s.autumn || s.season === 'kis')) {
    GROW.forEach((k) => { const l = rq.combined.lines.find((x) => x.key === k); if (l) assert.ok(l.need <= thrTarget(T, k, rq.tol) + 1e-9, label + ': güzde ' + k + ' = ' + l.need); });
  }
  /* besleyici yalnız stokta izleniyorsa */
  const fd = rq.combined.lines.find((x) => x.key === 'besleyici');
  if (fd) assert.ok(globalThis.SuperAriDemo.stock.list().some((x) => /besleyici|feeder|beslik/.test(T.norm(x.name))), label + ': besleyici stokta izlenmeden sayıldı');
}

for (const iso of ['2026-10-03', '2026-12-20', '2026-04-15', '2026-07-20']) {
  const T = load(iso);
  const all = T.build('all');
  checkReq(T, all, iso + ' Tümü');
  /* Tümü, bölüm tavanlarının toplamı olamaz: arılık kapsamlı satırda Tümü ≤ bölüm toplamı */
  all.sections.forEach((s) => {
    const one = T.build(s.id);
    checkReq(T, one, iso + ' ' + s.name);
  });
  if (iso === '2026-10-03') {
    const g = (k) => (all.combined.lines.find((l) => l.key === k) || { need: 0 }).need;
    assert.ok(g('nitril') <= 2, 'güz Tümü eldiven ' + g('nitril') + ' kutu');
    assert.ok(g('alt_tabla') <= 3 * all.sections.length, 'alt tabla arılık başına');
    assert.ok(g('koruk_yakit') <= 6, 'körük yakıtı ' + g('koruk_yakit'));
    assert.ok(g('alkol') <= 5, 'alkol ' + g('alkol'));
    assert.ok(g('kapi_daraltici') <= Math.ceil(all.hives * 0.25), 'kapı daraltıcı ' + g('kapi_daraltici'));
    assert.ok(g('cakmak') <= 2 && g('siringa') <= 1 && g('buharlastirici') === 0, 'çakmak / şırınga / buharlaştırıcı');
    const strips = ['serit_amitraz', 'serit_flumetrin', 'serit_taufluvalinat', 'serit_koumafos'].reduce((a, k) => a + g(k), 0);
    assert.ok(strips <= all.hives * 2.2, 'şerit ' + strips + ' > ~2/kovan');
    assert.ok(g('seker') / all.hives <= 12 && g('seker') / all.hives >= 3, 'şeker kovan başı ' + (g('seker') / all.hives).toFixed(1));
    assert.ok(g('okzalik') <= Math.ceil(all.hives / 25) + 1, 'okzalik');
  }
}
globalThis.Date = RealDate;
console.log('stok-talep-oranlar: ' + checks + ' satır kontrolü geçti');

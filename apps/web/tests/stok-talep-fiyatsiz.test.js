/* Fiyatı bulunamayan kalemler → yönetici (koloni-68):
 * - kullanıcıya «fiyatı bulunamadı» uyarısı gösterilmez; «N fiyatsız» çipi filtreler, «Tümü» geri döner
 * - noteMissing: yalnız alınacak + fiyatsız satırlar, anahtar başına tek kayıt, günde bir kez sayılır; kaynak hiç yüklenmediyse kayıt yok
 * - flushMissing: oturum açıksa sa_report_fiyat_eksik RPC'sine gönderir; tablo/fonksiyon yoksa cihaz kaydı kalır (çevrimdışı yedek)
 * - yonetici.html «Fiyatı bulunamayan kalemler»; Uyarılar'a eklenmez; migration RLS: yalnız yönetici okur */
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



(async () => {
  const T = load('2026-10-03');
  const REFD = { updated: '2026-10-03', currency: 'TRY', items: [{ key: 'seker', name: 'Şeker', unit: 'kg', ref: 40, min: 36, max: 45, n: 5, sources: [] }] };
  const KEY = T.MISS_KEY;
  assert.strictEqual(KEY, 'superari.stok.fiyatsiz.v1');

  /* kaynak hiç yüklenmedi → kayıt yok (yükleme hatası «fiyatsız» sayılmaz) */
  const rq0 = T.build('all');
  assert.ok(!T.refInfo().ok);
  assert.strictEqual(T.noteMissing(rq0.combined.lines, 'Tüm arılıklar'), 0);
  assert.strictEqual(localStorage.getItem(KEY), null);

  let rq, n;
  T.withRef(REFD, () => {
    rq = T.build('all');
    assert.ok(rq.missing > 0, 'demo talebinde fiyatsız kalem olmalı');
    n = T.noteMissing(rq.combined.lines, 'Tüm arılıklar');
  });
  const miss = rq.combined.lines.filter((l) => l.buy > 0 && l.price.v == null).map((l) => l.key);
  assert.strictEqual(n, miss.length);
  let m = T.missLog();
  assert.deepStrictEqual(Object.keys(m.items).sort(), miss.slice().sort());
  assert.ok(!m.items.seker, 'fiyatlı kalem kaydedilmez');
  const k0 = miss[0], e0 = m.items[k0];
  assert.strictEqual(e0.count, 1); assert.strictEqual(e0.scope, 'Tüm arılıklar'); assert.ok(e0.first && e0.last && e0.name);
  assert.strictEqual(T.missPending().length, miss.length);

  /* aynı gün tekrar → sayılmaz */
  T.withRef(REFD, () => { assert.strictEqual(T.noteMissing(T.build('all').combined.lines, 'Tüm arılıklar'), 0); });
  assert.strictEqual(T.missLog().items[k0].count, 1);

  /* buluta gönderim: oturum + RPC başarılı → gönderildi işaretlenir */
  const calls = [];
  globalThis.SuperAriBulut = { session: () => Promise.resolve({ user: { id: 'u1' } }), client: () => Promise.resolve({ rpc: (fn, args) => { calls.push([fn, args]); return Promise.resolve({ data: args.p_items.length, error: null }); } }) };
  assert.strictEqual(await T.flushMissing(), true);
  assert.strictEqual(calls.length, 1); assert.strictEqual(calls[0][0], 'sa_report_fiyat_eksik');
  assert.deepStrictEqual(calls[0][1].p_items.map((x) => x.key).sort(), miss.slice().sort());
  assert.ok(calls[0][1].p_items.every((x) => x.name && x.first && x.last && 'scope' in x));
  assert.strictEqual(T.missPending().length, 0);
  assert.strictEqual(T.missLog().cloud, 'ok');
  assert.strictEqual(await T.flushMissing(), false, 'bekleyen yokken gönderilmez');

  /* ertesi gün görülürse bir kez daha sayılır ve yeniden gönderilir; RPC hata verirse cihazda kalır ve aynı gün yeniden denenir (gün boyu atlama yok) */
  m = T.missLog(); m.items[k0].day = '2026-10-02'; localStorage.setItem(KEY, JSON.stringify(m));
  globalThis.SuperAriBulut = { session: () => Promise.resolve({ user: { id: 'u1' } }), client: () => Promise.resolve({ rpc: () => Promise.resolve({ data: null, error: { code: 'PGRST202', message: 'Could not find the function public.sa_report_fiyat_eksik' } }) }) };
  T.withRef(REFD, () => { assert.strictEqual(T.noteMissing(T.build('all').combined.lines, 'Tüm arılıklar'), 1); });
  await new Promise((r) => setTimeout(r, 20))
  m = T.missLog();
  assert.strictEqual(m.items[k0].count, 2);
  assert.strictEqual(m.cloud, 'error'); assert.ok(!('cloudDay' in m));
  let tries = 0;
  globalThis.SuperAriBulut = { session: () => Promise.resolve({ user: { id: 'u1' } }), client: () => Promise.resolve({ rpc: () => { tries++; return Promise.resolve({ data: 1, error: null }); } }) };
  assert.strictEqual(await T.flushMissing(), true, 'aynı gün yeniden denenir'); assert.strictEqual(tries, 1);
  m = T.missLog(); assert.strictEqual(m.cloud, 'ok'); assert.ok(!('cloudErr' in m));
  m.items[k0].sentN = 1; localStorage.setItem(KEY, JSON.stringify(m)); m = T.missLog();
  assert.strictEqual(T.missPending().length, 1, 'gönderilemeyen kayıt cihazda bekler');

  /* oturum yok → gönderilmez, kayıt kalır */
  globalThis.SuperAriBulut = { session: () => Promise.resolve(null), client: () => Promise.reject(new Error('x')) };
  m.cloud = 'ok'; localStorage.setItem(KEY, JSON.stringify(m));
  assert.strictEqual(await T.flushMissing(), false);
  assert.strictEqual(T.missPending().length, 1);
  delete globalThis.SuperAriBulut;

  /* stok.html: kullanıcıya «bulunamadı» uyarısı yok; filtre çipi + Tümü; kayıt çağrısı */
  const html = fs.readFileSync(W + 'stok.html', 'utf8');
  assert.ok(!/fiyatı bulunamadı/i.test(html), 'kullanıcıya «fiyatı bulunamadı» uyarısı gösterilmemeli');
  assert.ok(/data-miss="1"/.test(html) && /data-miss="0">Tümü</.test(html), 'fiyatsız filtre çipi ve Tümü');
  assert.ok(/TQ\.noteMissing\(rq\.combined\.lines/.test(html));
  assert.ok(/function onHash\(\) \{[^}]*missOnly = false/.test(html), 'görünüm değişince filtre sıfırlanır');
  /* yönetici sayfası + Uyarılar'a eklenmedi + migration */
  const yon = fs.readFileSync(W + 'yonetici.html', 'utf8');
  assert.ok(/Fiyatı bulunamayan kalemler/.test(yon) && /sa_fiyat_eksik_list/.test(yon) && /superari\.stok\.fiyatsiz\.v1/.test(yon));
  assert.ok(!/fiyatsiz|fiyat_eksik/.test(fs.readFileSync(W + 'uyarilar.html', 'utf8')));
  const sql = fs.readFileSync(path.join(W, '..', '..', 'supabase', 'migrations', '20261003230000_fiyat_eksik.sql'), 'utf8');
  assert.ok(/alter table public\.fiyat_eksik enable row level security/.test(sql));
  assert.ok(/revoke all on public\.fiyat_eksik from anon, authenticated/.test(sql));
  assert.ok(/using \(public\.sa_is_admin\(\)\)/.test(sql));
  assert.ok(/grant execute on function public\.sa_report_fiyat_eksik\(jsonb, text\) to authenticated/.test(sql));
  assert.ok(!/sa_report_fiyat_eksik\(jsonb, text\) to anon/.test(sql));
  assert.ok(/if not public\.sa_is_admin\(\) then raise/.test(sql));
  /* koloni-69: tek kaynaklı kalem fiyatlı sayılır (ortalama değil «tek kaynak»); kaynaksız kalem fiyatsız kalır */
  const FILE = JSON.parse(fs.readFileSync(W + 'data/fiyat-ref.json', 'utf8'));
  T.withRef(FILE, () => {
    const pf = T.priceFor('serit_flumetrin');
    assert.strictEqual(pf.v, 22.5); assert.strictEqual(pf.src, 'ref'); assert.ok(pf.ref.single && /^Tek kaynak/.test(pf.ref.note));
    assert.strictEqual(T.priceFor('serit_taufluvalinat').v, null); assert.strictEqual(T.priceFor('timol').v, null);
    assert.strictEqual(T.priceFor('serit_amitraz').v, null);
    assert.strictEqual(T.priceFor('amitraz_tutsu').v, 130); assert.ok(T.priceFor('amitraz_tutsu').ref.single);
    assert.strictEqual(T.priceFor('serit_koumafos').v, null);
    assert.strictEqual(T.priceFor('okzalik').ref.note, 'ruhsatlı ürün yok · dökme asit fiyatı');
    assert.ok(!T.priceFor('seker').ref.single);
  });
  assert.ok(/≈ tek kaynak/.test(html), 'satırda «tek kaynak» yazar');
  console.log('stok-talep-fiyatsiz: tamam (' + miss.length + ' fiyatsız anahtar: ' + miss.join(', ') + ')');
})().catch((e) => { console.error(e); process.exit(1); });

/* k286: Yönetici › Bilgi arşivi — tablolar yalnız yönetici (RLS), klasörler/kayıtlar kaynaklı, panel17 yüklenir, kullanıcı sayfalarında yok. */
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..', '..', '..');
const mig = fs.readFileSync(path.join(root, 'supabase', 'migrations', '20261019000000_k286_bilgi_arsivi.sql'), 'utf8');
test('k286: tablolar RLS + sa_is_admin', () => {
  ['bilgi_klasorleri', 'bilgi_kayitlari'].forEach((t) => {
    assert.ok(mig.includes('alter table public.' + t + ' enable row level security'));
    assert.ok(new RegExp('create policy ' + t + '_admin[^;]*sa_is_admin\\(\\)').test(mig));
  });
  assert.ok(mig.includes('revoke all on public.bilgi_klasorleri, public.bilgi_kayitlari from anon'));
});
test('k286: 7 klasör, her kayıtta kaynak veya uzman tahmini', () => {
  const k = mig.match(/insert into public\.bilgi_klasorleri/g) || [];
  assert.strictEqual(k.length, 7);
  ['Arı ırkları ve bölge seçimi', 'Gezginci göç ve verim tahmini', 'Muğla ana × Kafkas baba melezi', 'Ballık / kat kapasitesi', 'Arılık konumu – Tekman foraj seçimi', 'Oğul dönemi', 'Donanım'].forEach((a) => assert.ok(mig.includes("'" + a + "'"), a));
  mig.split('insert into public.bilgi_kayitlari').slice(1).forEach((l) => assert.ok(/https?:\/\//.test(l) || l.includes('uzman tahmini'), l.slice(0, 120)));
});
test('k286: panel17 yükleme zincirinde ve arama içerir', () => {
  const idx = fs.readFileSync(path.join(root, 'apps', 'yonetici', 'index.html'), 'utf8');
  assert.ok(idx.includes("ld('panel17.js?v=koloni-288')"));
  const p = fs.readFileSync(path.join(root, 'apps', 'yonetici', 'panel17.js'), 'utf8');
  assert.ok(p.includes("from('bilgi_klasorleri')") && p.includes('data-ba-q'));
});
test('k286: kullanıcı sayfalarında Bilgi arşivi yok', () => {
  const dir = path.join(root, 'apps', 'web');
  fs.readdirSync(dir).filter((f) => /\.(html|js)$/.test(f)).forEach((f) => {
    assert.ok(!/bilgi_klasorleri|bilgi_kayitlari|panel17\.js/.test(fs.readFileSync(path.join(dir, f), 'utf8')), f);
  });
});
test('k287: ek kayıtlar (morfometri, Yeninar 2009, üçlü melez uzman tahmini)', () => {
  const m = fs.readFileSync(path.join(root, 'supabase', 'migrations', '20261019001000_k287_bilgi_arsivi_ek.sql'), 'utf8');
  ['irk-morfo', 'melez-yeninar', 'goc-kkm', '10.3923/javaa.2009.995.999', "'uzman tahmini'"].forEach((x) => assert.ok(m.includes(x), x));
});

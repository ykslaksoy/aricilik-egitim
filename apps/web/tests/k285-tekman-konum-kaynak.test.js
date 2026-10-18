/* k285: Tekman Arılığı foraj konumu kaynağı yalnız yönetici panelinde (Kural kaynakları › Arılık konumu); kullanıcı sayfalarında kaynak metni yok. */
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..', '..', '..');
test('k285: panel4 «arılık konumu» grubunu gösterir', () => {
  const s = fs.readFileSync(path.join(root, 'apps', 'yonetici', 'panel4.js'), 'utf8');
  assert.ok(s.includes("by('arılık konumu')"));
});
test('k285: migration kaynak satırı uzman tahmini ve Yapılacaklar içerir', () => {
  const m = fs.readFileSync(path.join(root, 'supabase', 'migrations', '20261018233000_k285_tekman_konum.sql'), 'utf8');
  assert.ok(m.includes("'konum_tekman','arılık konumu'"));
  assert.ok(m.includes("'uzman tahmini'"));
  assert.ok(m.includes('insert into public.yapilacaklar'));
});
test('k285: kullanıcı sayfalarında Tekman konum kaynağı yazmaz', () => {
  const dir = path.join(root, 'apps', 'web');
  fs.readdirSync(dir).filter((f) => /\.(html|js)$/.test(f)).forEach((f) => {
    const s = fs.readFileSync(path.join(dir, f), 'utf8');
    assert.ok(!/konum_tekman|Kalkınma Birliği|Copernicus DEM/.test(s), f + ' kaynak metni içermemeli');
  });
});

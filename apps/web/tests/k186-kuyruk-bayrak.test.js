const test = require('node:test'); const assert = require('node:assert'); const fs = require('fs'); const p = require('path'); const vm = require('vm');
const R = p.join(__dirname, '../../..');
test('k186: kuyruk RPC admin + sayı onayı; bayrak tablosu admin yazar/herkes okur', () => {
  const m = fs.readFileSync(p.join(R, 'supabase/migrations/20261016030000_k186_kuyruk_bayrak.sql'), 'utf8');
  assert.match(m, /sa_kuyruk_temizle\(islem text, beklenen int\)/); assert.match(m, /if not public\.sa_is_admin\(\) then raise/);
  assert.match(m, /n is distinct from beklenen/); assert.match(m, /for select to anon, authenticated using \(true\)/);
  assert.match(m, /ozellik_admin_yazar[^;]*sa_is_admin\(\)/); assert.match(m, /acik boolean not null default false/);
  const j = fs.readFileSync(p.join(R, 'apps/yonetici/panel8.js'), 'utf8');
  assert.match(j, /window\.confirm\(ad \+ ' — ' \+ n \+ ' iş etkilenecek/); assert.match(j, /Özellik açma\/kapama/);
  assert.match(fs.readFileSync(p.join(R, 'apps/yonetici/index.html'), 'utf8'), /panel8\.js/);
});
test('k186: ozellik.js kapalı modülü Yakında ile keser, bilinmeyen bayrak kapalı', () => {
  const store = {}; const ls = { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = v; } };
  const doc = { readyState: 'complete', addEventListener() {}, getElementById() { return null; } };
  const w = { document: doc, localStorage: ls, location: { href: 'https://x.app/ana.html' }, URL, setTimeout() {} };
  vm.runInNewContext(fs.readFileSync(p.join(R, 'apps/web/ozellik.js'), 'utf8'), { window: w, URL });
  const O = w.SuperAriOzellik;
  assert.equal(O.acik('stok'), true); assert.equal(O.acik('yeni_modul'), false);
  store['superari.ozellik.v1'] = JSON.stringify({ stok: false });
  assert.equal(O.acik('stok'), false);
  assert.equal(O.kuralBul('stok.html'), 'stok'); assert.equal(O.kuralBul('koloni-ek.html?ek=foto'), 'foto_analiz');
  assert.equal(O.kuralBul('koloni-ek.html?ek=kapan'), null); assert.equal(O.kuralBul('qr-etiket.html?apiary=1'), 'qr_etiket');
  assert.match(fs.readFileSync(p.join(R, 'apps/web/pwa.js'), 'utf8'), /ozellik\.js/);
  assert.match(fs.readFileSync(p.join(R, 'apps/web/push.js'), 'utf8'), /acik\('bildirim'\)/);
});

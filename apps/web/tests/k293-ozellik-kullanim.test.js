const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const p = require('path');
const vm = require('vm');
const R = p.join(__dirname, '../../..');

test('k293: migration tablo + RPC + kullanim_takip bayrağı', () => {
  const m = fs.readFileSync(p.join(R, 'supabase/migrations/20261019007000_k293_ozellik_kullanim.sql'), 'utf8');
  assert.match(m, /ozellik_kullanim_olay/);
  assert.match(m, /user_id = auth\.uid\(\)/);
  assert.match(m, /sa_ozellik_kullanim_ozet/);
  assert.match(m, /kullanim_takip/);
  assert.match(m, /muayene/);
  assert.match(m, /sesli_muayene/);
});

test('k293: ozellik-kullanim.js sayfa eşlemesi ve kuyruk', () => {
  const src = fs.readFileSync(p.join(R, 'apps/web/ozellik-kullanim.js'), 'utf8');
  assert.match(src, /superari\.ozellikKullanim\.kuyruk/);
  assert.match(src, /kullanim_takip/);
  assert.match(src, /sesli_muayene/);
  const store = { 'superari.ozellik.v1': JSON.stringify({ kullanim_takip: false }) };
  const ls = { getItem: (k) => store[k] ?? null, setItem: (k, v) => { store[k] = v; } };
  const doc = { readyState: 'complete', addEventListener() {}, visibilityState: 'visible' };
  const w = {
    document: doc, localStorage: ls, navigator: { onLine: true }, addEventListener() {},
    location: { href: 'https://x.app/kovanlar.html?view=tarti', pathname: '/kovanlar.html', search: '?view=tarti' },
    URL, setTimeout: (f) => { f(); return 0; }, setInterval: () => 0, SuperAriOzellik: { acik: (k) => k !== 'kullanim_takip' ? true : false }
  };
  vm.runInNewContext(src, { window: w, globalThis: w, URL });
  assert.equal(w.SuperAriKullanim.sayfaOzellik(), 'tarti');
  w.SuperAriKullanim.log('muayene');
  assert.ok(!store['superari.ozellikKullanim.kuyruk.v1']);
  w.SuperAriOzellik.acik = () => true;
  w.SuperAriKullanim.log('muayene');
  assert.ok(store['superari.ozellikKullanim.kuyruk.v1']);
});

test('k293: yönetici panel18 ve pwa zinciri', () => {
  assert.match(fs.readFileSync(p.join(R, 'apps/yonetici/panel18.js'), 'utf8'), /Özellik kullanımı/);
  assert.match(fs.readFileSync(p.join(R, 'apps/yonetici/index.html'), 'utf8'), /panel18\.js\?v=koloni-293/);
  assert.match(fs.readFileSync(p.join(R, 'apps/web/pwa.js'), 'utf8'), /ozellik-kullanim\.js/);
  assert.match(fs.readFileSync(p.join(R, 'apps/web/ozellik.js'), 'utf8'), /kullanim_takip: true/);
});

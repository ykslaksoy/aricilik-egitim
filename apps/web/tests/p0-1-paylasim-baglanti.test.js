/* P0-1: süreli salt okunur paylaşım bağlantısı */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const p = require('path');
const vm = require('vm');
const R = p.join(__dirname, '../../..');
const sw = fs.readFileSync(p.join(R, 'apps/web/sw.js'), 'utf8');

test('p0-1: migration tablo + RPC + ozellik kontrolü', () => {
  const m = fs.readFileSync(p.join(R, 'supabase/migrations/20261025130000_p0_paylasim_baglanti.sql'), 'utf8');
  assert.match(m, /kovan_paylasim/);
  assert.match(m, /sa_paylasim_olustur/);
  assert.match(m, /sa_paylasim_oku/);
  assert.match(m, /sa_paylasim_iptal/);
  assert.match(m, /paylasim_baglanti/);
  assert.match(m, /grant execute on function public\.sa_paylasim_oku\(uuid\) to anon/);
});

test('p0-1: yönetici panelinde paylasim hazır değil rozeti kalktı', () => {
  const j = fs.readFileSync(p.join(R, 'apps/yonetici/panel8.js'), 'utf8');
  assert.ok(!/paylasim_baglanti:\s*true/.test(j), 'HAZIR_DEGIL içinde paylasim_baglanti olmamalı');
});

test('p0-1: kovan + paylasim sayfası kablolama', () => {
  const kv = fs.readFileSync(p.join(R, 'apps/web/kovan.html'), 'utf8');
  assert.match(kv, /paylasim-baglanti\.js/);
  assert.match(kv, /kdShareBtn/);
  assert.match(kv, /SuperAriPaylasim\.ac/);
  const ph = fs.readFileSync(p.join(R, 'apps/web/paylasim.html'), 'utf8');
  assert.match(ph, /Salt okunur paylaşım/);
  assert.match(ph, /SuperAriPaylasim\.oku/);
  const js = fs.readFileSync(p.join(R, 'apps/web/paylasim-baglanti.js'), 'utf8');
  assert.match(js, /sa_paylasim_olustur/);
  assert.match(js, /sa_paylasim_oku/);
  assert.match(sw, /paylasim\.html/);
});

test('p0-1: yerel bağlantı oluşturma ve okuma', () => {
  const store = {};
  const ls = { getItem: (k) => store[k] ?? null, setItem: (k, v) => { store[k] = v; } };
  const hive = { id: 3, name: 'K-3', apiaryId: 1, sensors: { weight: { kg: 42.5, deltaKg: 0.2 } } };
  const w = {
    document: { getElementById() { return null; }, createElement() { return { innerHTML: '', firstChild: null, appendChild() {} }; }, body: {} },
    localStorage: ls,
    location: { origin: 'https://x.app', pathname: '/kovan.html' },
    SuperAriOzellik: { acik: (k) => k === 'paylasim_baglanti', yakinda() {} },
    SuperAriDemo: { hiveById: (id) => (String(id) === '3' ? hive : null), apiaryById: () => ({ name: 'Demo Arılık' }) },
    SuperAriBulut: { session: () => Promise.resolve(null) },
    navigator: {},
    crypto: { randomUUID: () => '11111111-1111-4111-8111-111111111111' }
  };
  vm.runInNewContext(fs.readFileSync(p.join(R, 'apps/web/paylasim-baglanti.js'), 'utf8'), { window: w, URL, crypto: w.crypto });
  return w.SuperAriPaylasim.olustur(3, 7).then(function (r) {
    assert.ok(r.url.includes('paylasim.html?t='));
    assert.ok(r.token);
    return w.SuperAriPaylasim.oku(r.token);
  }).then(function (row) {
    assert.ok(row);
    assert.equal(row.snapshot.hiveName, 'K-3');
    assert.equal(row.snapshot.apiaryName, 'Demo Arılık');
  });
});

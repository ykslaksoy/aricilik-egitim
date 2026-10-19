const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const p = require('path');
const vm = require('vm');
const R = p.join(__dirname, '../../..');

test('k292: paylasim_baglanti bayrağı migration + panel rozeti + ozellik varsayılanı', () => {
  const m = fs.readFileSync(p.join(R, 'supabase/migrations/20261019006000_k292_yapilacaklar_panel_paylasim.sql'), 'utf8');
  assert.match(m, /paylasim_baglanti/);
  assert.match(m, /Paylaşım bağlantısı \(paneli herkese açma\)/);
  assert.match(m, /Kapalıyken tüm paylaşım bağlantıları çalışmaz/);
  assert.match(m, /Yönetici paneli:/);
  const j = fs.readFileSync(p.join(R, 'apps/yonetici/panel8.js'), 'utf8');
  assert.match(j, /HAZIR_DEGIL/);
  assert.match(j, /paylasim_baglanti/);
  assert.match(j, /hazır değil/);
  assert.match(fs.readFileSync(p.join(R, 'apps/yonetici/index.html'), 'utf8'), /panel8\.js\?v=koloni-292/);
  const store = {};
  const ls = { getItem: (k) => store[k] ?? null, setItem: (k, v) => { store[k] = v; } };
  const doc = { readyState: 'complete', addEventListener() {}, getElementById() { return null; } };
  const w = { document: doc, localStorage: ls, location: { href: 'https://x.app/ana.html' }, URL, setTimeout() {} };
  vm.runInNewContext(fs.readFileSync(p.join(R, 'apps/web/ozellik.js'), 'utf8'), { window: w, URL });
  assert.equal(w.SuperAriOzellik.acik('paylasim_baglanti'), false);
  assert.equal(w.SuperAriOzellik.VARSAYILAN.paylasim_baglanti, false);
});

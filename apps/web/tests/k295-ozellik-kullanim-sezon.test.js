const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const p = require('path');
const vm = require('vm');
const R = p.join(__dirname, '../../..');

test('k295: migration arılık/dönem + sezon RPC + toplam sütunlar', () => {
  const m = fs.readFileSync(p.join(R, 'supabase/migrations/20261019009000_k295_ozellik_kullanim_sezon.sql'), 'utf8');
  assert.match(m, /arilik_id/);
  assert.match(m, /donem_etiket/);
  assert.match(m, /konum_ad/);
  assert.match(m, /acilis_toplam/);
  assert.match(m, /sa_ozellik_kullanim_sezon/);
  assert.match(m, /toplam_7/);
});

test('k295: donemBaglam göç ve kışlatma', () => {
  const src = fs.readFileSync(p.join(R, 'apps/web/ozellik-kullanim.js'), 'utf8');
  assert.match(src, /donemBaglam/);
  assert.match(src, /konum_ad/);
  assert.match(src, /Adsız konum/);
  assert.match(src, /kislak/);
  const store = { 'superari.ana.selectedApiary': JSON.stringify({ id: 'a1' }) };
  const ls = { getItem: (k) => store[k] ?? null, setItem: (k, v) => { store[k] = v; } };
  const D = {
    apiaries: [{ id: 'a1', name: 'Test Arılık', place: 'Yayla 1' }],
    goc: {
      list: () => [
        { kind: 'tasi', apiaryId: 'a1', date: '2026-06-01', reason: 'yayla', toName: 'Yayla 2' },
        { kind: 'tasi', apiaryId: 'a1', date: '2026-10-01', reason: 'kislak', toName: 'Kışlık' }
      ],
      locHistory: () => []
    }
  };
  const w = {
    localStorage: ls, SuperAriDemo: D, document: { readyState: 'complete', addEventListener() {}, visibilityState: 'visible' },
    navigator: { onLine: true }, addEventListener() {}, setTimeout: () => 0, setInterval: () => 0
  };
  vm.runInNewContext(src, { window: w, globalThis: w });
  var mid = w.SuperAriKullanim.donemBaglam('2026-07-15T12:00:00.000Z');
  assert.equal(mid.donem_tipi, 'konum');
  assert.equal(mid.donem_etiket, 'Konum 2');
  assert.equal(mid.konum_ad, 'Yayla 2');
  var kis = w.SuperAriKullanim.donemBaglam('2026-11-15T12:00:00.000Z');
  assert.equal(kis.donem_tipi, 'kislatma');
  assert.equal(kis.donem_etiket, 'Kışlatma');
  assert.equal(kis.konum_ad, 'Kışlık');
});

test('k295: panel18 sezon raporu ve cache bust', () => {
  const j = fs.readFileSync(p.join(R, 'apps/yonetici/panel18.js'), 'utf8');
  assert.match(j, /Sezon raporu/);
  assert.match(j, /sa_ozellik_kullanim_sezon/);
  assert.match(j, /acilis_toplam/);
  assert.match(j, /Konum.*·/);
  assert.match(fs.readFileSync(p.join(R, 'apps/yonetici/index.html'), 'utf8'), /panel18\.js\?v=koloni-296/);
});

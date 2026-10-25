/* koloni-299: günlük tarlacı + nektar endeksi — modül, panel, migration, arılık/bugün kartı */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const R = path.join(__dirname, '../../..');
const W = path.join(R, 'apps/web');

test('k299: migration kural + yapılacaklar güncelleme', () => {
  const m = fs.readFileSync(path.join(R, 'supabase/migrations/20261025120000_k299_nektar_endeks.sql'), 'utf8');
  assert.match(m, /endeks_tar_tam/);
  assert.match(m, /Günlük endeks \(önizleme\)/);
  assert.match(m, /uzman tahmini/);
});

test('k299: yönetici panel10 Günlük endeks bölümü', () => {
  const p = fs.readFileSync(path.join(R, 'apps/yonetici/panel10.js'), 'utf8');
  assert.match(p, /Günlük endeks \(önizleme\)/);
  assert.match(p, /endeksIrTam/);
  assert.match(p, /endeksNektarTamKg/);
  assert.match(fs.readFileSync(path.join(R, 'apps/yonetici/index.html'), 'utf8'), /panel10\.js\?v=koloni-299/);
});

test('k299: ORS_SENSOR endeks anahtarları', () => {
  const d = fs.readFileSync(path.join(W, 'demo-data.js'), 'utf8');
  assert.match(d, /endeksIrTam: 600/);
  assert.match(d, /endeksNektarTamKg: 1\.5/);
  assert.match(d, /endeksIrTabanGun: 7/);
});

test('k299: SuperAriNektarEndeks demo özet', () => {
  const store = {};
  const ls = { getItem: (k) => store[k] ?? null, setItem: (k, v) => { store[k] = v; } };
  const w = { localStorage: ls, window: null, document: { addEventListener() {}, getElementById() { return null; } }, console, setTimeout() {} };
  w.window = w;
  vm.createContext(w);
  vm.runInContext(fs.readFileSync(path.join(W, 'demo-data.js'), 'utf8'), w);
  vm.runInContext(fs.readFileSync(path.join(W, 'nektar-endeks.js'), 'utf8'), w);
  const NE = w.SuperAriNektarEndeks;
  assert.ok(NE && NE.apiarySummary);
  const s = NE.apiarySummary('a1');
  assert.ok(s.n >= 1);
  assert.ok(s.birlesik != null && s.birlesik >= 0 && s.birlesik <= 100);
  assert.ok(s.tarlaci != null && s.nektar != null);
  const h = w.SuperAriDemo.loadHives().filter((x) => String(x.apiaryId) === 'a1')[0];
  const day = NE.hiveDay(h);
  assert.ok(day.kaynak.length >= 1);
  assert.match(NE.cardHtml(s), /Nektar akımı/);
});

test('k299: arilik ve bugün sayfaları kartı yükler', () => {
  const ar = fs.readFileSync(path.join(W, 'arilik.html'), 'utf8');
  assert.match(ar, /nektar-endeks\.js\?v=koloni-299/);
  assert.match(ar, /SuperAriNektarEndeks\.cardHtml/);
  const bg = fs.readFileSync(path.join(W, 'bugun.html'), 'utf8');
  assert.match(bg, /bgNektar/);
  assert.match(bg, /nektar-endeks\.js/);
  assert.ok(fs.readFileSync(path.join(W, 'sw.js'), 'utf8').includes('"/nektar-endeks.js"'));
});

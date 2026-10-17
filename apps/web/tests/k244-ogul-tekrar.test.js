/* koloni-244: Oğul eğilimi sayfasında tekrarlar — «Oğul izleme» düğmesi Orta ile aynıydı, mevsim notu başı her bölge için tekrarlanıyordu,
   oğul görünümünde «Tümü» / «Sensör kaynaklı» aynı listeyi veriyordu, ırk satırda iki kez, ayrıntıda «Ana arı karakteri» başlık + madde ön eki ve iki aynı açıklama. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const W = path.join(__dirname, '..');
const U = fs.readFileSync(path.join(W, 'uyarilar.html'), 'utf8');
const O = fs.readFileSync(path.join(W, 'ogul.js'), 'utf8');

test('k244: «Oğul izleme» ayrı düğmesi yok; duzey=izleme Orta’yı açar', () => {
  assert.ok(!/Oğul izleme · '\s*\+\s*cnt/.test(U), 'Oğul izleme sayacı Orta ile aynı — tek düğme kalmalı');
  assert.ok(/duzey === 'izleme' && l\.key === 'orta'/.test(U));
  assert.ok(/var want = duzey === 'izleme' \? 'orta' : duzey/.test(U));
});

test('k244: mevsim notu ortak başla bir kez', () => {
  assert.ok(/seasonGrp\[ph0\]\.push\(item\)/.test(U));
  assert.ok(/esc\(seasonTxt\)/.test(U));
  assert.ok(!/Object\.keys\(seasons\)\.join/.test(U));
});

test('k244: oğul görünümünde Tümü / Sensör kaynaklı süzgeci yok (aynı listeyi veriyordu)', () => {
  assert.ok(/#filterChips:empty \{ display:none; \}/.test(U), 'boş süzgeç kutusu yer kaplamamalı (koloni-245)');
  assert.ok(/filterChipsEl && view === 'ogul'\) \{[\s\S]{0,200}filterChipsEl\.innerHTML = ''/.test(U));
});

test('k244: ırk satırda nedende varsa tekrar edilmez', () => {
  assert.ok(/indexOf\('Ana arı karakteri:'\) === 0/.test(U));
});

test('k244: ayrıntı sayfası — başlık ön eki ve çift açıklama yok', () => {
  assert.ok(/li\(kar, 'Ana arı karakteri: '\)/.test(O));
  assert.ok(!/Irk, kovanın sıkışıklığı, oğul mevsimi ve ana yaşıyla birlikte/.test(O));
  assert.ok(/Oğul riski tahminidir/.test(O));
});

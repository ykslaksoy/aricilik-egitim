const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const K = require('../konum-onay.js');
const web = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(web, f), 'utf8');

test('dokunma yalnız düzenleme modunda pini taşır', () => {
  assert.strictEqual(K.tapMovesPin({ editMode: false }), false);
  assert.strictEqual(K.tapMovesPin({}), false);
  assert.strictEqual(K.tapMovesPin({ editMode: true }), true);
});

test('onay mesajı eski ve yeni koordinatı gösterir', () => {
  const m = K.message({ lat: 36.58, lon: 29.08 }, { lat: 36.5812345, lon: 29.0954321 });
  assert.match(m, /^Konum değişsin mi\?/);
  assert.match(m, /Eski: 36\.580000, 29\.080000/);
  assert.match(m, /Yeni: 36\.581235, 29\.095432/);
  assert.match(K.message(null, { lat: 1, lon: 2 }), /Eski: yok/);
});

test('İptal → false, Tamam → true', () => {
  let seen = '';
  assert.strictEqual(K.confirmChange({ lat: 1, lon: 2 }, { lat: 3, lon: 4 }, (t) => { seen = t; return false; }), false);
  assert.match(seen, /Konum değişsin mi/);
  assert.strictEqual(K.confirmChange(null, { lat: 3, lon: 4 }, () => true), true);
  assert.ok(K.samePoint({ lat: 1, lon: 2 }, { lat: 1, lon: 2 }));
});

test('arilik.html: harita dokunuşu düzenleme modu dışında pini taşımaz, kayıt onaylı', () => {
  const s = read('arilik.html');
  assert.ok(s.includes('konum-onay.js'));
  assert.ok(!s.includes('if (!pickMode) startPickMode();'), 'dokunma artık düzenleme modunu kendiliğinden açmamalı');
  assert.ok(s.includes('tapMovesPin({ editMode: pickMode })'));
  assert.ok(s.includes('>Konumu düzenle</button>'));
  assert.ok(s.includes('SuperAriKonumOnay.confirmChange(oldP, c)'));
  assert.ok(s.includes('draggable: !!pickMode'));
});

test('ariliklar.html: yeni arılık eklerken konum onayı', () => {
  const s = read('ariliklar.html');
  assert.ok(s.includes('konum-onay.js'));
  assert.ok(s.includes('SuperAriKonumOnay.confirmChange(null, { lat: lat, lon: lon })'));
});

test('sw önbelleği konum-onay.js içerir', () => {
  assert.ok(read('sw.js').includes('"/konum-onay.js"'));
});

test('arılık kartı Cins parçası bölünmez (nowrap span)', () => {
  const s = read('koloni.js');
  assert.ok(s.includes(".kol-line .kol-nw{white-space:nowrap;}"));
  assert.ok(s.includes("nw('🐝 Cins: ' + (brParts[0] || '—'))"));
});

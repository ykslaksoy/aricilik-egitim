/* Stok alım talebi — besleme dönüşümü ve kovan başı üst sınır (koloni-63). */
const assert = require('assert');
const T = require('../stok-talep.js');
const near = (a, b, e) => assert.ok(Math.abs(a - b) <= (e || 0.05), a + ' ≠ ' + b);

// 2:1 şurup: 2 kg şeker + 1 kg su = 3 kg, yoğunluk ≈ 1,33 → ≈ 2,25 L → 1 L'de ≈ 0,89 kg şeker (L ≠ kg şeker)
near(2 / (3 / 1.33), T.FEED.surup21.sugarKg, 0.01);
near(T.syrupSugar(10, 'surup21'), 8.9);
near(T.syrupSugar(10, 'surup11'), 6.2);

// Kışlık açık (kg bal/stok) → L şurup: 1 L 2:1 ≈ 0,8 kg stok. 8 kg açık → 10 L → 8,9 kg şeker
let f = T.feedFromDeficit(8, 'surup21');
assert.strictEqual(f.L, 10); near(f.sugarKg, 8.9); assert.strictEqual(f.capped, false);
// Büyük açık kovan başı 15 L ile sınırlanır (fazlası kek / birleştirme)
f = T.feedFromDeficit(20, 'surup21');
assert.strictEqual(f.rawL, 25); assert.strictEqual(f.L, 15); assert.strictEqual(f.capped, true); near(f.sugarKg, 13.4);
// 1:1 ilkbahar en çok 6 L
assert.strictEqual(T.feedFromDeficit(10, 'surup11').L, 6);
// Açık yok → 0
assert.strictEqual(T.feedFromDeficit(0).L, 0);

// Eski hata örneği: 2 kovan, 48 L gerekli → ×1,2 → 58 L → 52 kg. Yeni: kovan başı en çok 15 L, pay yalnız tahmine bir kez
near(T.HIVE_CAP.seker, 13.4);
assert.ok(2 * T.HIVE_CAP.seker < 27);

// capHive: muayene (m) payısız, tahmin (t) × (1 + T); toplam sınırı aşamaz; pay bir kez
let c = T.capHive(0, 10, 0.2, 13.4);           // 10 × 1,2 = 12 ≤ 13,4 → değişmez
assert.deepStrictEqual([c.m, c.t, c.capped], [0, 10, false]);
c = T.capHive(0, 20, 0.2, 13.4);               // 24 > 13,4 → t = 13,4 / 1,2
near(c.t * 1.2, 13.4, 1e-9); assert.ok(c.capped);
c = T.capHive(22, 0, 0.2, 13.4);               // muayene bulgusu da sınırı aşamaz
assert.strictEqual(c.m, 13.4);
c = T.capHive(5, 5, 0.2, 13.4);                // 5 + 6 = 11 ≤ 13,4
assert.deepStrictEqual([c.m, c.t], [5, 5]);
c = T.capHive(3, 1, 0.2, null);                // sınır yok
assert.deepStrictEqual([c.m, c.t, c.capped], [3, 1, false]);
console.log('stok-talep-besleme: OK');

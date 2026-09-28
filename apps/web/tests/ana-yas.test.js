/* Ana arı değişim yaşı (ırka göre) — plan, renk, uyarılar. demo-data.js tarayıcısız (vm) yüklenir. */
const assert = require('assert');
const vm = require('vm');
const fs = require('fs');
const path = require('path');
const store = {};
const ls = { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; }, key: (i) => Object.keys(store)[i], get length() { return Object.keys(store).length; } };
const win = { localStorage: ls, addEventListener() {}, removeEventListener() {}, dispatchEvent() {}, CustomEvent: function () {}, Event: function () {}, console };
win.window = win; win.self = win;
vm.createContext(win);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'demo-data.js'), 'utf8'), win);
const D = win.SuperAriDemo;
const C = D.colony;

/* Irk profilleri (kullanıcı kuralı: Buckfast 2 yıl; Anadolu/Kafkas 3; melezler/İtalyan/Karadeniz 2; bilinmeyen 2) */
const prof = (b) => C.queenProfile(b);
assert.strictEqual(prof('Buckfast').ideal, 2);
assert.strictEqual(prof('Belfast').label, 'Buckfast');
assert.strictEqual(prof('Buckfast').risk, 'cok-yuksek');
assert.strictEqual(prof('Karniyol × Muğla').ideal, 2);
assert.strictEqual(prof('Karniyol × Muğla').risk, 'yuksek');
assert.strictEqual(prof('Kafkas × Karniyol').risk, 'yuksek');
assert.strictEqual(prof('İtalyan').risk, 'yuksek');
assert.strictEqual(prof('Kafkas × Karadeniz').risk, 'orta');
assert.strictEqual(prof('Karadeniz').risk, 'orta');
assert.strictEqual(prof('Anadolu').ideal, 3);
assert.strictEqual(prof('Anadolu').risk, 'dusuk');
assert.strictEqual(prof('Kafkas').ideal, 3);
assert.strictEqual(prof('KAFKAS').ideal, 3);
assert.strictEqual(prof('').ideal, 2);
assert.strictEqual(prof('Yerel melez').known, false);
assert.strictEqual(prof('Muğla').ideal, 2);

const P = (breed, year, date) => C.queenPlan({ breed, queenYear: year }, date);
/* Bilinmiyor */
let p = P('Kafkas', null, '2026-09-28');
assert.strictEqual(p.key, 'bilinmiyor'); assert.strictEqual(p.tone, 'gray'); assert.ok(/elle/.test(p.text));
/* Genç ana */
p = P('Kafkas × Karniyol', 2026, '2026-09-28');
assert.strictEqual(p.key, 'iyi'); assert.strictEqual(p.tone, 'green'); assert.strictEqual(p.dueDate, '2028-04-01');
/* Yaklaşıyor: vadeye ≤ 60 gün (1 Şubat – 31 Mart) */
p = P('Kafkas × Karniyol', 2025, '2027-02-15');
assert.strictEqual(p.key, 'yaklasiyor'); assert.strictEqual(p.tone, 'yellow'); assert.strictEqual(p.severity, 'low');
assert.strictEqual(P('Kafkas × Karniyol', 2025, '2027-01-15').key, 'iyi');
/* Değişim zamanı: 2. yaş sarı */
p = P('Kafkas × Karniyol', 2024, '2026-09-28');
assert.strictEqual(p.key, 'zamani'); assert.strictEqual(p.tone, 'yellow'); assert.strictEqual(p.severity, 'medium');
assert.strictEqual(P('Buckfast', 2024, '2026-05-01').key, 'zamani');
/* 3. yaş: renk ırk riskine göre */
assert.strictEqual(P('Kafkas × Karniyol', 2023, '2026-09-28').tone, 'red');
assert.strictEqual(P('Kafkas × Karniyol', 2023, '2026-09-28').key, 'gecti');
assert.strictEqual(P('Buckfast', 2023, '2026-09-28').tone, 'red');
assert.strictEqual(P('İtalyan', 2023, '2026-09-28').tone, 'red');
assert.strictEqual(P('Kafkas × Karadeniz', 2023, '2026-09-28').tone, 'yellow');
assert.strictEqual(P('Karadeniz', 2023, '2026-09-28').key, 'gecti');
p = P('Anadolu', 2023, '2026-09-28');
assert.strictEqual(p.key, 'zamani'); assert.strictEqual(p.tone, 'green'); assert.strictEqual(p.severity, 'low');
assert.strictEqual(P('Kafkas', 2024, '2026-09-28').key, 'iyi');
assert.strictEqual(P('Kafkas', 2024, '2027-03-01').key, 'yaklasiyor');
/* 4+ yaş: her ırkta kırmızı, gecikti */
p = P('Anadolu', 2022, '2026-09-28');
assert.strictEqual(p.key, 'gecti'); assert.strictEqual(p.tone, 'red'); assert.strictEqual(p.severity, 'high');
assert.strictEqual(P('Kafkas × Karadeniz', 2022, '2026-09-28').tone, 'red');
/* 1 Nisan öncesi: etkin yaş bir eksik */
assert.strictEqual(P('Kafkas × Karniyol', 2024, '2026-03-15').key, 'yaklasiyor');
assert.ok(/ilkbahar/i.test(C.QUEEN_SEASON_NOTE));

/* queenStatus 'Yenile' planla uyumlu */
assert.strictEqual(C.queenStatus({ breed: 'Kafkas', queenYear: new Date().getFullYear() - 5 }), 'Yenile');
assert.strictEqual(C.queenStatus({ breed: 'Kafkas', queenYear: new Date().getFullYear() }), null);
assert.strictEqual(C.queenStatus({ breed: 'Kafkas' }), 'Bilinmiyor');

/* Uyarılar: demo modda Demo etiketli, türü 'ana', kırmızı kovan başına */
const all = D.alerts.filter((a) => a.type === 'ana');
assert.ok(all.length > 0, 'ana uyarısı yok');
all.forEach((a) => { assert.strictEqual(a.demo, true, 'Demo etiketi yok: ' + a.title); assert.ok(a.queen); });
assert.ok(all.some((a) => a.queen === 'bilinmiyor' && /ana yılını girin/.test(a.title)));
const h = D.loadHives().find((x) => /Karniyol/.test(x.breed || ''));
C.updateHive(h.id, { queenYear: new Date().getFullYear() - 4 }, 'correct');
const red = D.alerts.filter((a) => a.type === 'ana' && a.hiveId === h.id);
assert.strictEqual(red.length, 1); assert.strictEqual(red[0].severity, 'high');
console.log('ana-yas: ok');

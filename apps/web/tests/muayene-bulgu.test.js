/* Muayene bulgularından otomatik görevler (koloni-61): Hayır modunda ve atlanan kartlarda sessizce kaydedilir. */
const assert = require('assert');
const A = require('../bakim-akis.js');
const F = (c) => A.findings(c);
const tags = (r) => r.add.map((x) => x.tag).sort();

// Anasız + acil meme + oğul + hastalık + zayıf + yağma + güve notu
let r = F({ ans: { ana: 'hicbiri', yavru: 'yok', meme: 'acil', ogul: 2, hastalik: 'var', giris: 'yagma', cerceve: { bee: 3, brood: 0 } }, bee: 3, cap: 10, sk: 'yaz', kat: 0, body: 1, notes: { yer: 'dipte mum güvesi var' } });
assert.deepStrictEqual(tags(r), ['ana', 'guve', 'hastalik', 'meme', 'ogul', 'yagma', 'zayif']);
assert.ok(r.add.find((x) => x.tag === 'ana').title.startsWith('Anasız'));
assert.strictEqual(r.add.find((x) => x.tag === 'ana').pri, 1);
assert.ok(/2 çerçeve/.test(r.add.find((x) => x.tag === 'ogul').title));

// Temiz muayene: hiçbir görev yok, önceki otomatik görevler kapanır (resolve)
r = F({ ans: { ana: 'anaYumurta', yavru: 'duzenli', meme: 'yok', ogul: 0, hastalik: 'yok', giris: 'normal', yer: 'bol' }, bee: 7, cap: 20, sk: 'yaz', kat: 1, body: 1 });
assert.deepStrictEqual(r.add, []);
assert.deepStrictEqual(r.resolve.sort(), ['ana', 'hastalik', 'meme', 'ogul', 'olu', 'yagma', 'yer', 'zayif']);

// Ana görülmedi ama yavru var → 4 gün sonra kontrol; sessiz değiştirme
r = F({ ans: { ana: 'hicbiri', yavru: 'duzenli', meme: 'yenileme' }, bee: 6, cap: 10, sk: 'yaz' });
assert.strictEqual(r.add.find((x) => x.tag === 'ana').days, 4);
assert.strictEqual(r.add.find((x) => x.tag === 'meme').pri, 3);

// Yer dar (büyüme mevsimi), kat takılı
r = F({ ans: { yer: 'dolu' }, bee: 9, cap: 10, sk: 'akim', kat: 1, body: 1 });
assert.ok(/1 kat daha/.test(r.add.find((x) => x.tag === 'yer').title));
// Sonbahar: arı kat için az → bal katını al
r = F({ ans: {}, bee: 7, cap: 20, sk: 'sonbahar', kat: 1, body: 1 });
assert.ok(/Bal katını al/.test(r.add.find((x) => x.tag === 'yer').title));

// Ana yaşı zamanı; kışlık stok kritik (besleme görevi yoksa)
r = F({ ans: {}, sk: 'sonbahar', queenPlan: { key: 'gecti', age: 3, ideal: 2, label: 'Buckfast', tone: 'red' }, winter: { key: 'kritik', kg: 6, target: 15 } });
assert.deepStrictEqual(tags(r), ['anayas', 'kislik']);
assert.strictEqual(r.add.find((x) => x.tag === 'anayas').pri, 1);
r = F({ ans: {}, sk: 'sonbahar', winter: { key: 'kritik', kg: 6, target: 15 }, feedTask: true });
assert.deepStrictEqual(tags(r), []); // besleme görevi zaten var → kışlık ayrıca yazılmaz

// Dup kalıpları mevcut görev başlıklarını yakalar; kart → etiket eşlemesi
assert.ok(A.FIND_DUP.ana.test(A.fold('Anasız görünüyor: ana ver — Kovan 5')));
assert.ok(A.FIND_DUP.ogul.test(A.fold('Oğul memesi: bölme yap veya yer aç — Kovan 5')));
assert.ok(A.FIND_DUP.anayas.test(A.fold('Ana arıyı değiştir (3 yaş)')));
assert.ok(A.FIND_DUP.anayas.test(A.fold('Ana arıyı yenile — Kovan 106 (2 yaş)')));
assert.ok(!A.FIND_DUP.olu.test(A.fold('Kovan dolu')));
assert.deepStrictEqual(A.CARD_TAGS.ana, ['ana', 'meme', 'ogul', 'anayas']);
assert.ok(A.CARD_TAGS.kapi.includes('yagma'));
console.log('muayene-bulgu: ok');

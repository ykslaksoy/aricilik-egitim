/* node tests/sesle-parser.test.js — Sesle muayene Türkçe ayrıştırıcı birim testi */
'use strict';
const assert = require('assert');
const P = require('../sesle-muayene.js');
let n = 0;
function eq(a, b, m) { assert.deepStrictEqual(a, b, m); n++; }
// sayılar
eq(P.parseNumber('sekiz çerçeve'), 8);
eq(P.parseNumber('on iki'), 12);
eq(P.parseNumber('yirmi beş'), 25);
eq(P.parseNumber('7 çerçeve'), 7);
eq(P.parseNumber('ON'), 10);
eq(P.parseNumber('dört'), 4);
eq(P.parseNumber('hiç'), null);
// çerçeve adımı
eq(P.parse('cerceve', 'sekiz çerçeve'), { frames: { bee: 8, brood: null } });
eq(P.parse('cerceve', 'sekiz arılı üç yavrulu'), { frames: { bee: 8, brood: 3 } });
eq(P.parse('cerceve', 'üç yavrulu sekiz arılı'), { frames: { bee: 8, brood: 3 } });
eq(P.parse('cerceve', 'on bir arılı dört yavrulu'), { frames: { bee: 11, brood: 4 } });
eq(P.parse('cerceve', 'altı', { sub: 'brood' }), { frames: { bee: null, brood: 6 } });
eq(P.parse('cerceve', 'bilmem ki'), { none: true });
// seçenekler
eq(P.parse('ana', 'ana arı görüldü'), { value: 'ana' });
eq(P.parse('ana', 'yumurta var'), { value: 'yumurta' });
eq(P.parse('ana', 'ana arı görüldü yumurta var'), { value: 'anaYumurta' });
eq(P.parse('ana', 'ana var yumurta yok'), { value: 'ana' });
eq(P.parse('ana', 'hayır'), { value: 'hicbiri' });
eq(P.parse('ana', 'Evet'), { value: 'yumurta' });
eq(P.parse('giris', 'güçlü'), { value: 'yogun' });
eq(P.parse('giris', 'orta'), { value: 'normal' });
eq(P.parse('giris', 'zayıf'), { value: 'zayif' });
eq(P.parse('stok', 'bol'), { value: 'bol' });
eq(P.parse('stok', 'orta'), { value: 'orta' });
eq(P.parse('stok', 'zayıf'), { value: 'az' });
eq(P.parse('huy', 'çok sakin'), { value: '5' });
eq(P.parse('huy', 'sakin'), { value: '4' });
eq(P.parse('huy', 'çok sinirli'), { value: '1' });
eq(P.parse('huy', 'üç'), { value: '3' });
eq(P.parse('hastalik', 'hayır yok'), { value: 'yok' });
eq(P.parse('hastalik', 'evet'), { value: 'var' });
eq(P.parse('varroa', 'bozuk kanatlı arılar var'), { value: 'cok' });
eq(P.parse('yavru', 'düzenli'), { value: 'duzenli' });
eq(P.parse('yavru', 'yavru yok'), { value: 'yok' });
eq(P.parse('anayas', 'geçen yıl'), { value: '1' });
eq(P.parse('anayas', 'bu yıl'), { value: '0' });
eq(P.parse('meme', 'oğul memesi var'), { value: 'ogul' });
eq(P.parse('yer', 'dolmak üzere'), { value: 'dolmak' });
// komutlar
eq(P.parse('ana', 'geç'), { cmd: 'skip' });
eq(P.parse('ana', 'atla'), { cmd: 'skip' });
eq(P.parse('giris', 'geri'), { cmd: 'back' });
eq(P.parse('giris', 'tekrar'), { cmd: 'repeat' });
eq(P.parse('summary', 'kaydet'), { cmd: 'save' });
eq(P.parse('summary', 'kaydet ve sıradaki'), { cmd: 'saveNext' });
eq(P.parse('giris', 'sıradaki kovan'), { cmd: 'saveNext' });
eq(P.parse('giris', 'dur'), { cmd: 'stop' });
eq(P.parse('summary', 'merhaba'), { none: true });
eq(P.parse('giris', 'not kapakta çatlak var'), { note: 'kapakta çatlak var' });
eq(P.parse('giris', ''), { none: true });
/* Bal / oğul memesi: tam çerçeve sayısı (koloni-58) */
eq(P.parse('stok', 'dört', { count: { max: 30 } }), { value: 4 });
eq(P.parse('stok', '6 çerçeve', { count: { max: 30 } }), { value: 6 });
eq(P.parse('stok', 'on iki', { count: { max: 30 } }), { value: 12 });
eq(P.parse('ogul', 'yok', { count: { max: 20 } }), { value: 0 });
eq(P.parse('ogul', 'hiç yok', { count: { max: 20 } }), { value: 0 });
eq(P.parse('ogul', 'iki çerçevede var', { count: { max: 20 } }), { value: 2 });
eq(P.parse('ogul', 'sıfır', { count: { max: 20 } }), { value: 0 });
eq(P.parse('ogul', 'geç', { count: { max: 20 } }), { cmd: 'skip' });
eq(P.parse('stok', 'bol', { count: { max: 30 } }), { none: true });
console.log('sesle-parser: ' + n + ' test geçti');

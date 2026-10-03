/* koloni-72: Rulamit-VA tütsü plakası — ayrı kalem (kutu), şerit değil; tahmine kendiliğinden girmez; stok adı şeride sayılmaz; etiket yalnız Teknovet sayfasından. */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const W = path.join(__dirname, '..') + path.sep;

/* ilaç kataloğu */
const ctx = { window: {} }; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(W + 'ilac-katalog.js', 'utf8'), ctx);
const I = ctx.window.SuperAriIlac;
const va = I.byId('rulamitva');
assert.ok(va && va.group === 'amitraz' && va.dose === null, 'Rulamit-VA şerit dozu yok (öneri / tahmin dışı)');
assert.ok(/Tütsü/.test(va.form) && /265 mg/.test(va.active));
assert.strictEqual(va.source, 'https://teknovet.com.tr/tr/urunler/antiparazitler/rulamit-va');
assert.deepStrictEqual([va.label.puffsPerHive, va.label.repeats, va.label.repeatsHigh, va.label.intervalDays, va.label.hivesPerMinute, va.withdrawalDays], [7, 3, 4, 3, 10, 30]);
assert.ok(/3 alüminyum folyo poşet/.test(va.label.pack) && /Haziran–Eylül/.test(va.season) && /14 °C/.test(va.season));
assert.strictEqual(JSON.stringify(va.durationDays), '[6,9]');
assert.ok(!I.doseFor('rulamitva', 8).ok && /Şerit dozu yok/.test(I.doseFor('rulamitva', 8).reason));
assert.strictEqual(I.detect('Rulamit-VA tütsü').id, 'rulamitva');
assert.strictEqual(I.detect('rulamit va').id, 'rulamitva');
assert.strictEqual(I.detect('Rulamit şerit').id, 'rulamit');
assert.ok(I.LIST.indexOf(va) < I.LIST.indexOf(I.byId('rulamit')));

/* talep kataloğu: eşleşme + tahmin dışı */
const src = fs.readFileSync(W + 'stok-talep.js', 'utf8');
assert.ok(/key: 'amitraz_tutsu'[^\n]*unit: 'kutu'[^\n]*scope: 'apiary'/.test(src));
const m = /re: (\/rulamit va[^\n]*?\/), *\n/.exec(src) || /key: 'amitraz_tutsu'[^\n]*re: (\/[^\n]*?\/),/.exec(src);
assert.ok(m, 'amitraz_tutsu re');
const re = eval(m[1]);
const strip = /amitraz|beeraz|rulamit|vamitrat/;
['rulamit va', 'rulamit va 3 poset', 'amitraz tutsu plakasi'].forEach((n) => assert.ok(re.test(n), n));
['rulamit', 'beeraz', 'vamitrat va', 'rulamit serit'].forEach((n) => assert.ok(!re.test(n), n + ' tütsüye sayılmamalı'));
assert.ok(src.indexOf("key: 'amitraz_tutsu'") < src.indexOf("key: 'serit_amitraz'"), 'tütsü şeritten önce eşleşir');
/* tahmin (apiaryNeeds) hiçbir yerde amitraz_tutsu eklemez */
assert.ok(!/add\('amitraz_tutsu'/.test(src), 'tahmine kendiliğinden eklenmez');
/* stok birimi + şablon */
assert.ok(/STOCK_UNITS = \[[^\]]*'kutu'/.test(fs.readFileSync(W + 'demo-data.js', 'utf8')));
assert.ok(/\{ n: 'Amitraz tütsü plakası \(Rulamit-VA\)', u: 'kutu' \}/.test(fs.readFileSync(W + 'stok.html', 'utf8')));
/* fiyat */
const REF = JSON.parse(fs.readFileSync(W + 'data/fiyat-ref.json', 'utf8'));
const it = REF.items.find((x) => x.key === 'amitraz_tutsu');
assert.ok(it && it.ref === 130 && it.unit === 'kutu' && it.n === 1);
assert.ok(!REF.items.find((x) => x.key === 'serit_amitraz').sources.some((s) => /aslanpetek/.test(s.url)), 'Aslan Petek şeritten çıktı');
console.log('rulamitva: tamam');

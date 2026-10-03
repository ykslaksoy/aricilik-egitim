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
const strip = /amitraz|beeraz|rulamit/;
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

/* koloni-73: Rulamit şerit dozu Teknovet etiketinden; Vamitrat-VA yakma şeridi (tütsü), şerit sayılmaz */
const ru = I.byId('rulamit');
assert.ok(ru.verified === true && ru.dose && ru.dose.type === 'fixed' && ru.dose.qty === 2 && ru.dose.unit === 'serit');
assert.ok(/500 mg/.test(ru.active) && /1000 mg/.test(ru.dose.note) && /Langstroth/.test(ru.dose.note));
assert.deepStrictEqual([ru.durationDays[0], ru.durationDays[1], ru.preFlowDays, ru.withdrawal], [42, 70, 42, 'tedaviBoyunca']);
assert.ok(/Bal için 0 gün/.test(ru.withdrawalText) && /1 ya da 5 alüminyum folyo poşet/.test(ru.pack) && /10 kovan içi şerit/.test(ru.pack));
assert.strictEqual(ru.source, 'https://www.teknovet.com.tr/tr/urunler/antiparazitler/rulamit');
assert.deepStrictEqual([I.doseFor('rulamit', 5).ok, I.doseFor('rulamit', 5).qty], [true, 2]);
const vm2 = I.byId('vamitratva');
assert.ok(vm2.dose === null && vm2.name === 'Vamitrat-VA' && /20 mg/.test(vm2.active) && /yakılan/.test(vm2.form));
assert.deepStrictEqual([vm2.label.perHive, vm2.label.repeats, vm2.label.repeatsHigh, vm2.label.intervalDays, vm2.withdrawalDays], [1, 3, 4, 3, 30]);
assert.strictEqual(vm2.source, 'https://teknovet.com.tr/tr/urunler/antiparazitler/vamitrat-va');
assert.ok(/3 alüminyum folyo poşet/.test(vm2.label.pack) && /10 kovan içi şerit/.test(vm2.label.pack));
assert.ok(!I.doseFor('vamitratva', 8).ok && /Şerit dozu yok/.test(I.doseFor('vamitratva', 8).reason));
assert.strictEqual(I.detect('Vamitrat-VA').id, 'vamitratva');
assert.ok(/key: 'amitraz_yakma'[^\n]*unit: 'şerit'[^\n]*scope: 'apiary'[^\n]*manual: true/.test(src));
const ym = /key: 'amitraz_yakma'[^\n]*re: (\/[^\n]*?\/),/.exec(src); assert.ok(ym);
const yre = eval(ym[1]);
const sm = /key: 'serit_amitraz'[^\n]*re: (\/[^\n]*?\/) \}/.exec(src); assert.ok(sm);
const sre = eval(sm[1]);
['vamitrat va', 'vamitrat', 'amitraz yakma seridi'].forEach((n) => assert.ok(yre.test(n), n));
assert.ok(!/vamitrat/.test(sm[1]), 'serit_amitraz re vamitrat içermez');
['rulamit', 'beeraz', 'rulamit va'].forEach((n) => assert.ok(!yre.test(n), n));
assert.ok(src.indexOf("key: 'amitraz_yakma'") < src.indexOf("key: 'serit_amitraz'"));
assert.ok(!/add\('amitraz_yakma'/.test(src), 'yakma şeridi tahmine kendiliğinden eklenmez');
assert.ok(/\{ n: 'Amitraz yakma şeridi \(Vamitrat-VA\)', u: 'şerit' \}/.test(fs.readFileSync(W + 'stok.html', 'utf8')));
const yit = REF.items.find((x) => x.key === 'amitraz_yakma');
assert.ok(yit && yit.ref === null && yit.n === 0 && yit.sources.length === 0 && /^Kaynak yok/.test(yit.note));
console.log('rulamitva: tamam');

// Donanım: alternatif yalnız AYNI yazılımla çalışıp aynı işi görürse (kullanıcı kuralı 18.10.2026).
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function el() { return { innerHTML: '', textContent: '', value: '', style: {}, className: '', id: '', querySelector: () => el(), querySelectorAll: () => [], appendChild() {}, insertAdjacentHTML() {}, addEventListener() {}, contains: () => false, getAttribute: () => null }; }
function yukle() {
  const src = fs.readFileSync(path.join(__dirname, '../../yonetici/donanim.js'), 'utf8');
  const store = {};
  const w = { location: { search: '?demo=1' }, URLSearchParams, localStorage: { getItem: (k) => store[k] || null, setItem: (k, v) => { store[k] = String(v); } }, fetch: () => Promise.reject(new Error('yok')), confirm: () => true, console };
  w.window = w; w.document = { getElementById: () => el(), createElement: () => el(), activeElement: null };
  vm.createContext(w); vm.runInContext(src, w);
  return w;
}
const ids = (k) => JSON.parse(JSON.stringify(k.adaylarListe.map((c) => c.parcalar.map((p) => p.ad).join(' + '))));

test('DS1822, ADXL355, ESP32-S3 kartı aday/alternatif değil; kalanlar korunur', () => {
  const w = yukle(), T = w.SA_DONANIM_TEST, d = JSON.parse(JSON.stringify(w.SA_DONANIM_TASLAK));
  T.normalize(d);
  const k = (id) => d.kalemler.find((x) => x.id === id);
  const hepsi = JSON.stringify(d.kalemler.map((x) => [ids(x), (x.alternatifler || []).map((a) => a.ad)]));
  assert.ok(!/DS1822|ADXL355|ESP32-S3|ayrı LoRa/.test(hepsi), hepsi);
  assert.deepStrictEqual(ids(k('node')), ['LilyGO T-Weigh']);
  assert.deepStrictEqual(ids(k('titresim')), ['ADXL345']);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(k('giris_sicak').alternatifler.map((a) => a.ad))), ['Analog Devices MAX31820', 'Analog Devices DS18S20']);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(k('isi_nem').alternatifler.map((a) => a.ad))), ['Sensirion SHT45-AD1B', 'Sensirion SHT43-ADCB', 'Sensirion SHT40-AD1B', 'Sensirion SHT40-AD1F']);
  const inm = k('ses').alternatifler.find((a) => /INMP441/.test(a.ad));
  assert.strictEqual(inm.durum, 'uzman');
  assert.match(T.swDurum('TDK INMP441').t, /yapılacak/);
});

test('yedek düzen: T-Weigh + ADXL345, firmware #error değil', () => {
  const w = yukle(), T = w.SA_DONANIM_TEST, d = JSON.parse(JSON.stringify(w.SA_DONANIM_TASLAK));
  T.normalize(d);
  const y = d.duzenler.find((z) => z.id === 'yedek'), k = (id) => d.kalemler.find((x) => x.id === id);
  const ad = (kid) => k(kid).adaylarListe.find((c) => c.id === y.secim[kid]).parcalar.map((p) => p.ad).join(' + ');
  assert.strictEqual(ad('node'), 'LilyGO T-Weigh');
  assert.strictEqual(ad('titresim'), 'ADXL345');
  assert.strictEqual(ad('isi_nem'), 'Sensirion SHT41');
  assert.match(ad('ses'), /INMP441/);
  assert.ok(!/#error/.test(y.firmware));
});

test('kayıtlı eski veri yüklenince temizlenir', () => {
  const w = yukle(), T = w.SA_DONANIM_TEST, d = JSON.parse(JSON.stringify(w.SA_DONANIM_TASLAK));
  T.normalize(d);
  const k = (id) => d.kalemler.find((x) => x.id === id), y = d.duzenler[1];
  k('node').adaylarListe.push({ id: 'node-esp32-s3-kart', secili: false, parcalar: [{ ad: 'ESP32-S3 kartı' }, { ad: 'ayrı LoRa' }, { ad: 'HX711' }] });
  k('titresim').adaylarListe.push({ id: 'titresim-adxl355', secili: false, parcalar: [{ ad: 'ADXL355' }] });
  k('giris_sicak').alternatifler.push({ ad: 'Analog Devices DS1822', durum: 'uyumlu' });
  k('titresim').alternatifler.push({ ad: 'ADXL355', durum: 'uyumlu' });
  k('ses').alternatifler = [{ ad: 'TDK INMP441', durum: 'uyumlu' }];
  y.secim.node = 'node-esp32-s3-kart'; y.secim.titresim = 'titresim-adxl355';
  y.firmware = 'DUZEN=2 (sürücüler yok → derleme #error ile durur)';
  assert.strictEqual(T.normalize(d), true);
  assert.deepStrictEqual(ids(k('node')), ['LilyGO T-Weigh']);
  assert.deepStrictEqual(ids(k('titresim')), ['ADXL345']);
  assert.ok(!k('giris_sicak').alternatifler.some((a) => /DS1822/.test(a.ad)));
  assert.ok(!k('titresim').alternatifler.length);
  assert.strictEqual(k('ses').alternatifler[0].durum, 'uzman');
  assert.strictEqual(y.secim.node, k('node').adaylarListe[0].id);
  assert.strictEqual(y.secim.titresim, k('titresim').adaylarListe[0].id);
  assert.ok(!/#error/.test(y.firmware));
});

test('USD fiyatın yanında TL', () => {
  const T = yukle().SA_DONANIM_TEST, K = { tarih: '16.10.2026', kurlar: { USD: 49.4463, EUR: 55.618 } };
  assert.match(T.fiyatKisa({ tutar: 1.87, para: 'USD', tarih: '2026-10-18' }, K), /1,87 USD ≈ 92,46 TL/);
  assert.match(T.metinTL('T-Weigh 20,88 USD (lilygo.cc, 17.10.2026)', K), /20,88 USD ≈ 1\.032,44 TL/);
  assert.match(T.metinTL('ADXL345 1ku 3,74 USD\'den', null), /kur: Veri yok/);
  assert.strictEqual(T.metinTL('Veri yok', K), '');
});

test('maliyet: 1 kovan ve 1 gateway ayrı; arılık = kovan × N + gateway', () => {
  const w = yukle(), T = w.SA_DONANIM_TEST, d = JSON.parse(JSON.stringify(w.SA_DONANIM_TASLAK));
  T.normalize(d);
  T.fiyatKisa(null, { tarih: '16.10.2026', kurlar: { USD: 49.4463, EUR: 55.618 } }); // kuru ayarla
  const h1 = T.hesap(d, 'ana', 1), h10 = T.hesap(d, 'ana', 10);
  // gateway: T-Beam 4410 + A7670E 2034,11 + dış SHT41 5,95 USD
  assert.ok(Math.abs(h1.gatewayTL - h1.gatewayKorumaTL - (4410 + 2034.11 + 5.95 * 49.4463)) < 0.01, String(h1.gatewayTL));
  // kovan: T-Weigh 20,88 USD + SHT41 5,95 USD + DS18B20 76,49 + SPH0645 415,80 + ADXL345 155,38
  assert.ok(Math.abs(h1.kovanTL - h1.kovanKorumaTL - ((20.88 + 5.95) * 49.4463 + 76.49 + 415.8 + 155.38)) < 0.01, String(h1.kovanTL));
  assert.ok(Math.abs(h10.tot - (h1.kovanTL * 10 + h1.gatewayTL)) < 0.01);
  assert.ok(h1.kovanEksik > 0); // yük hücresi, pil, kutu: Veri yok
});

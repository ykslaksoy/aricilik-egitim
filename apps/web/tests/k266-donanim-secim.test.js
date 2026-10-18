// Önizleme (onizleme/donanim-secim): Donanım aday listesi, düzenler, satın alma hesabı, TCMB kur ayrıştırma.
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

test('aday metni yapıya çevrilir, özgün metin korunur', () => {
  const w = yukle(), T = w.SA_DONANIM_TEST, d = JSON.parse(JSON.stringify(w.SA_DONANIM_TASLAK));
  const once = d.kalemler.map((k) => k.adaylar);
  assert.strictEqual(T.normalize(d), true);
  assert.strictEqual(JSON.stringify(d.kalemler.map((k) => k.adaylar)), JSON.stringify(once));
  const k = (id) => d.kalemler.find((x) => x.id === id);
  const isi = k('isi_nem').adaylarListe;
  assert.strictEqual(isi.length, 2);
  assert.strictEqual(isi[0].secili, true); assert.strictEqual(isi[0].parcalar[0].ad, 'Sensirion SHT41');
  assert.match(isi[0].parcalar[0].ozellik, /0x44/);
  assert.strictEqual(isi[1].secili, false); assert.strictEqual(isi[1].parcalar[0].ad, 'SHT31-DIS');
  const gw = k('gateway').adaylarListe[0].parcalar.map((p) => p.ad);
  assert.strictEqual(JSON.stringify(gw), JSON.stringify(['LilyGO T-Beam V1.2', 'SIMCom A7670E']));
  assert.strictEqual(k('kamera').adaylarListe.length, 0);
  assert.strictEqual(d.duzenler.map((z) => z.id).join(','), 'ana,yedek');
  assert.strictEqual(d.duzenler[1].secim.isi_nem, isi[1].id);
  // alternatifler: SHT31 uyumsuz, SHT4x uyumlu
  const alt = k('isi_nem').alternatifler;
  assert.ok(alt.find((a) => /SHT45/.test(a.ad)).durum === 'uyumlu');
  assert.ok(alt.find((a) => /SHT31/.test(a.ad)).durum === 'uyumsuz');
});

test('satın alma: fiyatsız parça toplama girmez, dahil parça sayılmaz', () => {
  const w = yukle(), T = w.SA_DONANIM_TEST, d = JSON.parse(JSON.stringify(w.SA_DONANIM_TASLAK));
  T.normalize(d);
  const h = T.hesap(d, 'ana', 2);
  const hx = h.L.find((x) => x.r.p.ad === 'HX711 ×4'); assert.strictEqual(hx.adet, null);
  const yh = h.L.find((x) => /yük hücresi/.test(x.r.p.ad)); assert.strictEqual(yh.adet, 8); assert.strictEqual(yh.top, null);
  const tb = h.L.find((x) => /T-Beam/.test(x.r.p.ad)); assert.strictEqual(tb.adet, 1); assert.strictEqual(tb.top, 4410);
  assert.ok(h.eksik.some((x) => /yük hücresi/.test(x.r.p.ad)));
  // kur yokken USD fiyatlı T-Weigh «Veri yok» (uydurulmaz)
  assert.strictEqual(h.L.find((x) => /T-Weigh/.test(x.r.p.ad)).top, null);
});

test('yazılım durumu', () => {
  const T = yukle().SA_DONANIM_TEST;
  assert.strictEqual(T.swDurum('Sensirion SHT45-AD1B').d, 'taslak');
  assert.strictEqual(T.swDurum('DS18B20 su geçirmez prob').d, 'kut');
  assert.strictEqual(T.swDurum('ADXL345').d, 'yok');
});

test('TCMB today.xml ayrıştırma', () => {
  const { ayikla } = require('../../../api/kur.js');
  const xml = '<Tarih_Date Tarih="16.10.2026" Date="10/16/2026"><Currency CrossOrder="0" Kod="USD" CurrencyCode="USD"><Unit>1</Unit><ForexBuying>49.3573</ForexBuying><ForexSelling>49.4463</ForexSelling></Currency><Currency CrossOrder="9" Kod="EUR" CurrencyCode="EUR"><Unit>1</Unit><ForexBuying>55.5179</ForexBuying><ForexSelling>55.6180</ForexSelling></Currency></Tarih_Date>';
  const o = ayikla(xml);
  assert.strictEqual(o.tarih, '16.10.2026');
  assert.strictEqual(o.kurlar.USD, 49.4463); assert.strictEqual(o.kurlar.EUR, 55.618);
});

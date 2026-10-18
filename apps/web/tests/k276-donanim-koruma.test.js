// Donanım › Koruma / dış ortam (önizleme onizleme/donanim-koruma, 18.10.2026).
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
const KUR = { tarih: '16.10.2026', kurlar: { USD: 49.4463, EUR: 55.618 } };

test('koruma kalemi eklenir, düzenlerde seçilir, kutu çift sayılmaz', () => {
  const w = yukle(), T = w.SA_DONANIM_TEST, d = JSON.parse(JSON.stringify(w.SA_DONANIM_TASLAK));
  assert.strictEqual(T.normalize(d), true);
  const k = d.kalemler.find((x) => x.id === 'koruma');
  assert.ok(k, 'koruma kalemi yok');
  assert.strictEqual(d.kalemler[d.kalemler.length - 1].id, 'kamera');
  for (const z of d.duzenler) assert.strictEqual(z.secim.koruma, 'koruma-set');
  const kutu = d.kalemler.find((x) => x.id === 'kutu').adaylarListe[0].parcalar[0];
  assert.ok(kutu.miktar.dahil, 'kutu kalemi koruma kutusuyla çift sayılıyor');
  // ikinci normalize değişiklik yapmaz; kullanıcı silerse geri eklenmez
  assert.strictEqual(T.normalize(d), false);
  d.kalemler = d.kalemler.filter((x) => x.id !== 'koruma');
  T.normalize(d);
  assert.ok(!d.kalemler.some((x) => x.id === 'koruma'));
});

test('fiyatlar kaynaklı; fiyatsız parça null (Veri yok), uydurma yok', () => {
  const T = yukle().SA_DONANIM_TEST;
  for (const p of T.KORUMA_PARCA) {
    if (p.fiyat) { assert.ok(p.fiyat.url && /^https:\/\//.test(p.fiyat.url), p.ad); assert.ok(p.fiyat.magaza && p.fiyat.tarih, p.ad); assert.strictEqual(p.fiyat.para, 'TL', p.ad); }
  }
  const ad = (re) => T.KORUMA_PARCA.find((p) => re.test(p.ad));
  assert.strictEqual(ad(/SF2/).fiyat, null);
  assert.strictEqual(ad(/Akustik PTFE/).fiyat, null);
  assert.strictEqual(ad(/Isıtmalı pil/).fiyat, null);
  assert.strictEqual(ad(/LoRa anten/).fiyat, null);
  assert.strictEqual(ad(/SE-212/).fiyat.tutar, 460.87);
});

test('maliyet: koruma 1 kovan / 1 gateway ayrı, soğuk bölge eki yalnız soğukta', () => {
  const w = yukle(), T = w.SA_DONANIM_TEST, d = JSON.parse(JSON.stringify(w.SA_DONANIM_TASLAK));
  T.normalize(d); T.fiyatKisa(null, KUR);
  const h = T.hesap(d, 'ana', 1, false), hs = T.hesap(d, 'ana', 1, true);
  // kovan: SE-212 460,87 + tapa 40,11 + 4 rakor 9,08 + silika 6,00
  assert.ok(Math.abs(h.kovanKorumaTL - (460.87 + 40.11 + 4 * 9.08 + 6)) < 0.01, String(h.kovanKorumaTL));
  // gateway: SE-056 684,16 + tapa 40,11 + 3 rakor + vernik 983,31 + silika 6 + 4G anten 245,12
  assert.ok(Math.abs(h.gatewayKorumaTL - (684.16 + 40.11 + 3 * 9.08 + 983.31 + 6 + 245.12)) < 0.01, String(h.gatewayKorumaTL));
  assert.ok(Math.abs(h.sogukTL - 11.26) < 0.01);
  assert.ok(h.sogukEksik >= 1); // ısıtmalı paket: Veri yok
  assert.ok(Math.abs((hs.tot - h.tot) - 11.26) < 0.01, 'soğuk bölge eki yalnız soğukta toplama girer');
  assert.strictEqual(h.kovanTL > h.kovanKorumaTL, true);
});

test('dış ortam kararları: her kalemde karar + kaynak; pil soğukta uygun değil', () => {
  const w = yukle(), T = w.SA_DONANIM_TEST;
  for (const id of ['node', 'isi_nem', 'giris_sicak', 'dis_isi_nem', 'tarti', 'ses', 'titresim', 'gateway', 'aku', 'kutu']) {
    const L = T.DIS[id]; assert.ok(L && L.length, id);
    for (const x of L) { assert.ok(['uygun', 'koruma', 'degil', 'veri'].includes(x.k), id); assert.ok(x.s.length || x.ut, id + ' kaynaksız ve uzman tahmini değil'); assert.ok(x.e && x.kd && x.f, id + ' bölge notu eksik'); }
  }
  assert.strictEqual(T.DIS.aku[0].k, 'degil');
  assert.match(T.DIS.aku[0].n, /−10…60 °C/);
  assert.match(T.DIS.gateway[0].n, /SX1276/);
  const html = T.disHtml({ id: 'isi_nem' });
  assert.match(html, /Korumayla uygun/); assert.match(html, /sensirion\.com/);
  assert.strictEqual(T.disHtml({ id: 'koruma' }), '');
});

test('soğuk bölge ölçütü ve yazılım durumu', () => {
  const T = yukle().SA_DONANIM_TEST;
  assert.strictEqual(T.sogukMu({ name: 'Palandöken Yayla Arılığı' }), true);
  assert.strictEqual(T.sogukMu({ name: 'Kayaköy', il: 'Muğla', altitude: 200 }), false);
  assert.strictEqual(T.sogukMu({ name: 'X', altitude: 1500 }), true);
  assert.strictEqual(T.sogukMu({ name: 'Cimil' }), true);
  assert.match(T.swDurum('10K NTC termistör (pil sıcaklığı)').t, /yapılacak/);
  assert.match(T.swDurum('PTFE nefes tapası M12').t, /gerekmez/);
});

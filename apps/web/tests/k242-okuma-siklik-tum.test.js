/* koloni-242: diğer sensörlerin okuma sıklığı — ses/titreşim 3 dk, IR 5 dk, giriş + dış 30 dk, pil 4 sa, kamera 24 sa, gateway 10 dk; kural çözünürlüğü; Onayla. */
const assert = require('assert'), fs = require('fs'), path = require('path');
const W = path.join(__dirname, '..');
const mem = {};
globalThis.localStorage = { getItem: k => k in mem ? mem[k] : null, setItem: (k, v) => { mem[k] = String(v); }, removeItem: k => { delete mem[k]; }, key: i => Object.keys(mem)[i], get length() { return Object.keys(mem).length; } };
globalThis.window = globalThis;
globalThis.document = { readyState: 'complete', addEventListener() {}, getElementById() { return null; }, createElement() { return { setAttribute() {}, appendChild() {}, textContent: '', style: {} }; }, head: { appendChild() {} }, documentElement: { setAttribute() {}, classList: { add() {} } } };
globalThis.addEventListener = () => {};
globalThis.dispatchEvent = () => true;
globalThis.CustomEvent = function () {};
globalThis.setInterval = () => 0;
globalThis.navigator = { serviceWorker: { ready: Promise.resolve({}) } };

['demo-data.js', 'device-runtime.js', 'pil-model.js', 'sensor-polling.js', 'plan-planlayici.js'].forEach(f => require(path.join(W, f)));
const C = globalThis.SuperAriDemo.colony, P = globalThis.SuperAriSensorPolling, M = globalThis.SuperAriPilModel, Plan = globalThis.SuperAriPlan2;
const T = C.ORS_SENSOR, A = C.ORS_SENSOR_ADLAR;
const VAR = { okumaSesDk: 3, okumaTitDk: 3, okumaIrDk: 5, okumaGirisSicakDk: 30, okumaDisHavaDk: 30, okumaPilDk: 240, okumaKameraDk: 1440, okumaGatewayDk: 10 };
Object.keys(VAR).forEach(k => { assert.strictEqual(T[k], VAR[k], k); assert.ok(/uzman tahmini|Ramsey 2020/.test(A[k]), 'kaynak/uzman ' + k); });
assert.match(A.okumaTitDk, /Ramsey 2020/);
/* eski 3 değer korunur */
assert.strictEqual(T.okumaIsiNemDk, 30); assert.strictEqual(T.okumaTartiDk, 15); assert.strictEqual(T.okumaEsekHizliDk, 2);

/* sensor-polling varsayılanları tek kaynaktan */
assert.strictEqual(P.defaultIntervalMs('ses'), 180000);
assert.strictEqual(P.defaultIntervalMs('titresim'), 180000);
assert.strictEqual(P.defaultIntervalMs('ir'), 300000);
assert.strictEqual(P.defaultIntervalMs('isi_nem', 'giris'), 1800000);
assert.strictEqual(P.defaultIntervalMs('dis_isi_nem'), 1800000);
assert.strictEqual(P.defaultIntervalMs('kamera_kovan'), 86400000);
assert.strictEqual(P.defaultIntervalMs('gateway'), 600000);
assert.strictEqual(P.batteryIntervalMs(), 14400000);
assert.strictEqual(P.defaultIntervalMs('tarti'), 900000);
/* yönetici değişikliği okunur (giriş ayrı, iç etkilenmez) */
C.ogulSkor().sensor.okumaGirisSicakDk = 20;
assert.strictEqual(P.resolveIntervalMs({ id: 'gx', tip: 'isi_nem', yer: 'giris' }), 1200000);
assert.strictEqual(P.resolveIntervalMs({ id: 'ix', tip: 'isi_nem' }), 1800000);
C.ogulSkor().sensor.okumaGirisSicakDk = 30;
C.ogulSkor().sensor.okumaPilDk = 60; assert.strictEqual(P.batteryIntervalMs(), 3600000); C.ogulSkor().sensor.okumaPilDk = 240;
/* 3 / 5 / 10 dk seçilebilir ve saklanır (eski 5 dk alt sınırı kalktı) */
assert.ok(P.presetsForTip('ses').some(p => p.ms === 180000));
assert.ok(P.presetsForTip('titresim').some(p => p.ms === 180000));
assert.ok(P.presetsForTip('ir').some(p => p.ms === 300000));
assert.ok(P.setDeviceInterval('dev-x', 180000)); assert.strictEqual(P.resolveIntervalMs({ id: 'dev-x', tip: 'ses' }), 180000);

/* kural çözünürlüğü */
assert.deepStrictEqual(P.kuralCozunurluk('titresim', 180000), []);
assert.ok(P.kuralCozunurluk('titresim', 14400000).some(x => /oğul hazırlığı/i.test(x.kural)), 'gece spektrumu 4 saatte bozulur');
assert.deepStrictEqual(P.kuralCozunurluk('ir', 300000), []);
assert.ok(P.kuralCozunurluk('ir', 900000).some(x => /Oğul çıktı/.test(x.kural)), 'IR 15 dk oğul çıktıyı bozar');
assert.ok(P.kuralCozunurluk('ir', 3600000).some(x => /İlaçlama/.test(x.kural)), 'IR 1 saat ilaçlamayı bozar');
assert.deepStrictEqual(P.kuralCozunurluk('gateway', 600000), []);
assert.deepStrictEqual(P.kuralCozunurluk('tarti', 900000), []);
assert.strictEqual(P.kuralGerek('ses'), null, 'ses olayları olay tabanlı — aralık kısıtı yok');
P.okumaOzet().forEach(x => assert.ok(x.tamam, 'varsayılan tamam: ' + x.ad));

/* pil modeli: varsayılan aralık sunucu ile aynı tablo; seyreltme yalnız Onayla, soruda bozulan kural yazılır */
assert.strictEqual(M.okumaMs('ir', T), 300000);
const Dev = globalThis.SuperAriDevices;
const tit = Dev.listDevices().filter(d => d.tip === 'titresim')[0];
assert.ok(tit, 'demo titreşim');
const n = Date.now(), D = 864e5;
const r = Plan.bataryaPlan(tit, { gecmis: [{ t: n - 10 * D, p: 60 }, { t: n, p: 20 }], kalmaBitis: new Date(n + 60 * D).toISOString().slice(0, 10) });
assert.strictEqual(r.aralikMs, 180000);
assert.ok(r.oneriMs > 180000 && r.soru && /Onaylıyor musun/.test(r.soru));
if (r.oneriMs > 3600000) assert.ok(/çalışmaz/.test(r.soru) && r.kuralUyari.length, 'bozulan kural soruda');
assert.strictEqual(P.resolveIntervalMs(tit), 180000, 'Onayla olmadan değişmez');
Plan.aralikOnayla(tit, r.oneriMs);
assert.strictEqual(P.resolveIntervalMs(tit), r.oneriMs, 'Onayla sonrası');
const sa = require(path.join(W, '../api/src/services/sensorAnalysis.js'));
assert.ok(sa);

/* panel + migration + firmware + README + kopya eşitliği */
const panel = fs.readFileSync(path.join(W, '../yonetici/panel10.js'), 'utf8');
Object.keys(VAR).forEach(k => assert.ok(panel.includes("'" + k + "'"), 'panel ' + k));
assert.ok(panel.includes('Kural çözünürlüğü'));
const mig = fs.readFileSync(path.join(W, '../../supabase/migrations/20261018010000_k242_okuma_siklik_tum.sql'), 'utf8');
Object.keys(VAR).forEach(k => assert.ok(new RegExp("'" + k + "'," + VAR[k]).test(mig), 'mig ' + k));
assert.ok((mig.match(/\('Okuma sıklığı:/g) || []).length >= 8, '8 Yapılacaklar');
const fw = fs.readFileSync(path.join(W, '../../firmware/node/src/config.h'), 'utf8');
['MIC_SPECTRUM_INTERVAL_MS 180000', 'VIB_SPECTRUM_INTERVAL_MS 180000', 'IR_COUNT_INTERVAL_MS 300000', 'ENTRANCE_TEMP_INTERVAL_MS 1800000', 'OUTDOOR_TEMP_HUM_INTERVAL_MS 1800000', 'BATTERY_INTERVAL_MS 14400000', 'CAMERA_INTERVAL_MS 86400000'].forEach(x => assert.ok(fw.includes(x), x));
assert.ok(fs.readFileSync(path.join(W, '../../firmware/gate/src/config.h'), 'utf8').includes('GATEWAY_UPLOAD_INTERVAL_MS 600000'));
const rd = fs.readFileSync(path.join(W, '../../firmware/node/README.md'), 'utf8');
['MIC_SPECTRUM_INTERVAL_MS', 'VIB_SPECTRUM_INTERVAL_MS', 'IR_COUNT_INTERVAL_MS', 'Ramsey'].forEach(x => assert.ok(rd.includes(x), 'README ' + x));
assert.strictEqual(fs.readFileSync(path.join(W, 'demo-data.js'), 'utf8'), fs.readFileSync(path.join(W, '../yonetici/demo-data.js'), 'utf8'));
assert.strictEqual(fs.readFileSync(path.join(W, 'pil-model.js'), 'utf8'), fs.readFileSync(path.join(W, '../yonetici/pil-model.js'), 'utf8'));
assert.strictEqual(fs.readFileSync(path.join(W, 'degisiklik-kaydi.js'), 'utf8'), fs.readFileSync(path.join(W, '../yonetici/degisiklik-kaydi.js'), 'utf8'));
['kovanlar.html', 'ayarlar.html', 'bakim-akis.html', 'ayarlar-eski.html'].forEach(f => assert.ok(/pil-model\.js[^]*sensor-polling\.js/.test(fs.readFileSync(path.join(W, f), 'utf8')), 'pil-model önce ' + f));
const v = JSON.parse(fs.readFileSync(path.join(W, 'version.json'), 'utf8')).version;
assert.ok(Number(v.split('-')[1]) >= 242, v);
console.log('k242-okuma-siklik-tum ok');

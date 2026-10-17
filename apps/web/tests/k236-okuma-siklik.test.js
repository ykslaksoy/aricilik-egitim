/* koloni-236: varsayılan okuma sıklığı — ısı/nem 30 dk, tartı 15 dk; eşek hızlı; Onayla seyreltmesi tabanı kullanır; uzman tahmini. */
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

['demo-data.js', 'device-runtime.js', 'sensor-polling.js', 'pil-model.js', 'plan-planlayici.js'].forEach(f => require(path.join(W, f)));
const C = globalThis.SuperAriDemo.colony;
const P = globalThis.SuperAriSensorPolling;
const Plan = globalThis.SuperAriPlan2;
const T = C.ORS_SENSOR;

assert.strictEqual(T.okumaIsiNemDk, 30);
assert.strictEqual(T.okumaTartiDk, 15);
assert.strictEqual(T.okumaEsekHizliDk, 2);
['okumaIsiNemDk', 'okumaTartiDk', 'okumaEsekHizliDk'].forEach(k => assert.match(C.ORS_SENSOR_ADLAR[k], /uzman tahmini/, k));

assert.strictEqual(P.DEFAULT_INTERVAL_MS.tarti, 900000);
assert.strictEqual(P.DEFAULT_INTERVAL_MS.isi_nem, 1800000);
assert.strictEqual(P.defaultIntervalMs('tarti'), 900000);
assert.strictEqual(P.defaultIntervalMs('isi_nem'), 1800000);
assert.strictEqual(P.defaultIntervalMs('dis_isi_nem'), 1800000);

const Dev = globalThis.SuperAriDevices;
const tarti = Dev.listDevices().filter(d => d.tip === 'tarti' && d.hiveId === 101)[0];
const isi = Dev.listDevices().filter(d => d.tip === 'isi_nem' && d.hiveId === 101)[0];
assert.ok(tarti && isi);
assert.strictEqual(P.resolveIntervalMs(tarti), 900000);
assert.strictEqual(P.resolveIntervalMs(isi), 1800000);

/* yönetici / canlı ayar (ogulSkor.sensor) okunur */
C.ogulSkor().sensor.okumaTartiDk = 60;
assert.strictEqual(P.defaultIntervalMs('tarti'), 3600000);
C.ogulSkor().sensor.okumaTartiDk = 15;
C.ORS_SENSOR.okumaTartiDk = 15;

/* eşek burst — setInterval yok; doğrudan planla */
P.scheduleEsekTempBurst(101);
const bu = P.burstUntil();
assert.ok(bu['101'] > Date.now(), 'burst penceresi');

/* pil planı tabanı = resolveIntervalMs; seyreltme yalnız Onayla */
const n = Date.now(), D = 864e5;
const h = [{ t: n - 10 * D, p: 80 }, { t: n, p: 50 }];
let r = Plan.bataryaPlan({ id: 'd1', apiaryId: 'a1', tip: 'isi_nem' }, { gecmis: h, aralikMs: P.resolveIntervalMs(isi), kalmaBitis: null });
assert.ok(r.oneriMs == null || r.oneriMs > P.resolveIntervalMs(isi), 'öneri tabandan seyrek');
Plan.aralikOnayla({ id: isi.id, apiaryId: isi.apiaryId || 'a1' }, 14400000);
assert.strictEqual(P.resolveIntervalMs(isi), 14400000, 'Onayla sonrası');

/* panel + migration + firmware */
const panel = fs.readFileSync(path.join(W, '../yonetici/panel10.js'), 'utf8');
['okumaIsiNemDk', 'okumaTartiDk', 'okumaEsekHizliDk', 'Okuma sıklığı'].forEach(x => assert.ok(panel.includes(x), x));
const mig = fs.readFileSync(path.join(W, '../../supabase/migrations/20261017210000_k236_okuma_siklik.sql'), 'utf8');
assert.ok(/okumaIsiNemDk.*30/.test(mig) && /okumaTartiDk.*15/.test(mig) && /yapilacaklar/.test(mig));
const fw = fs.readFileSync(path.join(W, '../../firmware/node/src/config.h'), 'utf8');
assert.ok(/WEIGHT_INTERVAL_MS 900000/.test(fw) && /TEMP_HUM_INTERVAL_MS 1800000/.test(fw));
assert.strictEqual(fs.readFileSync(path.join(W, 'demo-data.js'), 'utf8'), fs.readFileSync(path.join(W, '../yonetici/demo-data.js'), 'utf8'));
assert.ok(Number(String(JSON.parse(fs.readFileSync(path.join(W, 'version.json'), 'utf8')).version).replace(/^koloni-/,''))>=236,'sürüm en az koloni-236');
console.log('k236-okuma-siklik ok');

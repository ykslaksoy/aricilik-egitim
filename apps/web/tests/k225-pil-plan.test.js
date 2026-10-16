/* koloni-225: pil planı — erken sıklık önerisi (ayrılış / bal sezonu sonu / tarih yok), gateway, şarj sonrası geri dönüş, sessiz cihaz, tek model. */
const assert = require('assert'), path = require('path'), fs = require('fs'), W = path.join(__dirname, '..');
const LS = {}; globalThis.localStorage = { getItem: k => LS[k] ?? null, setItem: (k, v) => { LS[k] = String(v); }, removeItem: k => { delete LS[k]; } };
let tasks = [];
globalThis.SuperAriDemo = { colony: { ORS_SENSOR: { batTabanOran: 0.3, batIlkGun: 7, batIlkDusus: 2, batOrtaGun: 14, batYuksekGun: 7, gwOrtaGun: 7, gwYuksekGun: 3, batErkenGun: 30, batSezonArtiGun: 7, batGorevOnceGun: 2, batSarjArtis: 30, batBittiPct: 10 } },
  apiaryById: id => ({ id, il: 'Muğla', ilce: 'Marmaris' }), taskStore: { all: () => tasks, add: t => tasks.push(Object.assign({ id: tasks.length + 1 }, t)), remove: id => { tasks = tasks.filter(t => t.id !== id); } } };
require(path.join(W, 'pil-model.js')); require(path.join(W, 'plan-planlayici.js'));
const P = globalThis.SuperAriPlan2, D = 864e5, n = Date.now();
const h = [{ t: n - 10 * D, p: 80 }, { t: n, p: 60 }]; /* %2/gün → saatte birle 30 gün */
let r = P.bataryaPlan({ id: 'd1', apiaryId: 'a1' }, { gecmis: h, aralikMs: 3600000, kalmaBitis: new Date(n + 50 * D).toISOString().slice(0, 10) });
assert.strictEqual(r.kalanGun, 30); assert.ok(r.oneriMs > 3600000 && /Onaylıyor musun/.test(r.soru), 'ayrılışa 50 gün: 7 günden çok önce öneri');
assert.ok(!/Hz|%20|7 gün/.test(r.soru));
r = P.bataryaPlan({ id: 'd1', apiaryId: 'a1' }, { gecmis: [{ t: n - 10 * D, p: 90 }, { t: n, p: 80 }], aralikMs: 3600000, kalmaBitis: null });
assert.ok(!r.oneriMs, 'tarih yok, 80 gün yeter → öneri yok');
r = P.bataryaPlan({ id: 'd1', apiaryId: 'a1' }, { gecmis: h, aralikMs: 3600000, kalmaBitis: null });
assert.ok(!r.oneriMs, 'tam 30 gün: < 30 değil');
r = P.bataryaPlan({ id: 'd1', apiaryId: 'a1' }, { gecmis: [{ t: n - 10 * D, p: 80 }, { t: n, p: 50 }], aralikMs: 3600000, kalmaBitis: null });
assert.ok(r.oneriMs && /Taşınma tarihi girilmedi/.test(r.soru), '<30 gün fallback');
globalThis.SuperAriDemo.colony.ORS_SENSOR.batErkenGun = 10; /* kaydedilen değer izlenir */
r = P.bataryaPlan({ id: 'd1', apiaryId: 'a1' }, { gecmis: [{ t: n - 10 * D, p: 80 }, { t: n, p: 50 }], aralikMs: 3600000, kalmaBitis: null });
assert.ok(!r.oneriMs); globalThis.SuperAriDemo.colony.ORS_SENSOR.batErkenGun = 30;
/* sezon sonu + 7: çiçek takvimi */
globalThis.SuperAriCicek = { donem: () => ({ durum: 'var', ay1: 4, ay2: 12 }) };
const hd = P.hedefTarih('a9'); const y = new Date().getFullYear(); assert.strictEqual(hd.kaynak, 'sezon'); assert.strictEqual(hd.tarih, y + 1 + '-01-07');
/* gateway: 5 gün → orta (≤7), insan cihazında 5 gün → yüksek */
const g5 = [{ t: n - 10 * D, p: 60 }, { t: n, p: 20 }], g = [{ t: n - 10 * D, p: 60 }, { t: n, p: 10 }];
assert.strictEqual(P.bataryaPlan({ id: 'g1', tip: 'gateway' }, { gecmis: g5, aralikMs: 3600000, kalmaBitis: null }).severity, 'medium');
assert.strictEqual(P.bataryaPlan({ id: 'k1', tip: 'aku_kovan' }, { gecmis: g5, aralikMs: 3600000, kalmaBitis: null }).severity, 'high');
/* sessiz cihaz */
assert.strictEqual(P.bataryaPlan({ id: 'k1', status: 'kopuk' }, { gecmis: g, aralikMs: 3600000, kalmaBitis: null }).bitmis, 'Pil bitmiş olabilir');
/* devre dışı */
assert.strictEqual(P.bataryaPlan({ id: 'k1', disabled: true }, { gecmis: g }).durum, 'devre_disi');
/* görev: gerçek geçmiş (pilGecmis) ile, bitiş −2 gün */
globalThis.SuperAriSensorPolling = { readBatteryStore: () => [{ deviceId: 'k2', at: new Date(n - 10 * D).toISOString(), batteryPct: 60 }, { deviceId: 'k2', at: new Date(n).toISOString(), batteryPct: 10 }], resolveIntervalMs: () => 3600000, setDeviceInterval: () => true };
r = P.bataryaPlan({ id: 'k2', apiaryId: 'a1', name: 'Termometre' });
assert.ok(tasks.some(t => /Pili değiştir \/ şarj et/.test(t.title)), 'görev'); assert.strictEqual(tasks.filter(t => /\[pil:k2\]/.test(t.note)).length, 1);
/* şarj sonrası geri dönüş önerisi (onayla) */
P.aralikOnayla({ id: 'k2', apiaryId: 'a1' }, 14400000);
assert.strictEqual(P.komutlar()[0].eskiMs, 3600000);
globalThis.SuperAriSensorPolling.readBatteryStore = () => [{ deviceId: 'k2', at: new Date(n - 3 * D).toISOString(), batteryPct: 10 }, { deviceId: 'k2', at: new Date(n + 60000).toISOString(), batteryPct: 95 }];
globalThis.SuperAriSensorPolling.resolveIntervalMs = () => 14400000;
r = P.bataryaPlan({ id: 'k2', apiaryId: 'a1' });
assert.ok(r.geri && r.oneriMs === 3600000 && /şarj edildi/.test(r.soru));
/* sunucu aynı modeli kullanır */
const S = require(path.join(W, '../api/src/services/sensorAnalysis.js'));
assert.strictEqual(S.pilKalanGun([{ ts: new Date(n - 10 * D).toISOString(), battery: 80 }], { ts: new Date(n).toISOString(), battery: 60 }), 30);
const m = fs.readFileSync(path.join(W, '../../supabase/migrations/20261017120000_k225_pil_aralik.sql'), 'utf8');
assert.ok(/sa_degisiklik_cihaz_aralik/.test(m) && /'cihaz_aralik'\]/.test(m));
assert.strictEqual(fs.readFileSync(path.join(W, 'demo-data.js'), 'utf8'), fs.readFileSync(path.join(W, '../yonetici/demo-data.js'), 'utf8'));
console.log('k224 ok');

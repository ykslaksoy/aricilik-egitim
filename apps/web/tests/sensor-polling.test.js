/* Sensör zamanlayıcı: aralık çözümü ve 6 ay saklama */
const assert = require('assert');
const path = require('path');
const W = path.join(__dirname, '..') + path.sep;
const RealDate = Date;
const FIX = new RealDate('2026-10-09T12:00:00+03:00').getTime();
class FakeDate extends RealDate {
  constructor(...a) { if (a.length) super(...a); else super(FIX); }
  static now() { return FIX; }
}
globalThis.Date = FakeDate;
const mem = {};
globalThis.window = globalThis;
globalThis.localStorage = {
  getItem: (k) => (k in mem ? mem[k] : null),
  setItem: (k, v) => { mem[k] = String(v); },
  removeItem: (k) => { delete mem[k]; },
  key: (i) => Object.keys(mem)[i],
  get length() { return Object.keys(mem).length; }
};
globalThis.document = {
  readyState: 'complete',
  addEventListener() {},
  getElementById() { return null; },
  createElement() { return { setAttribute() {}, appendChild() {}, textContent: '' }; },
  head: { appendChild() {} },
  documentElement: { setAttribute() {}, classList: { add() {} } }
};
globalThis.addEventListener = () => {};
globalThis.dispatchEvent = () => {};
globalThis.setInterval = () => 0;
globalThis.navigator = { serviceWorker: { ready: Promise.resolve({}) } };

['demo-data.js', 'device-runtime.js', 'sensor-polling.js'].forEach((f) => require(W + f));

const P = globalThis.SuperAriSensorPolling;
const Dev = globalThis.SuperAriDevices;

assert.strictEqual(P.RETENTION_DAYS, 183);
assert.strictEqual(P.defaultIntervalMs('tarti'), 3600000);
assert.strictEqual(P.defaultIntervalMs('isi_nem'), 900000);

const dev = Dev.listDevices().filter((d) => d.tip === 'tarti' && d.hiveId === 101)[0];
assert.ok(dev, 'demo tartı');
assert.strictEqual(P.resolveIntervalMs(dev), 3600000);
P.setDeviceInterval(dev.id, 14400000);
assert.strictEqual(P.resolveIntervalMs(dev), 14400000);
P.setApiaryInterval('a1', 'tarti', 43200000);
assert.strictEqual(P.resolveIntervalMs(dev), 14400000, 'cihaz öncelikli');

assert.strictEqual(P.maxPointsForInterval(3600000), Math.ceil((183 * 86400000) / 3600000));

const oldAt = '2025-01-01T08:00';
const key = P.storageKey('tarti');
mem[key] = JSON.stringify([
  { hiveId: 101, at: oldAt, kg: 30, type: 'tarti' },
  { hiveId: 101, at: '2026-10-09T11:00', kg: 38, type: 'tarti' }
]);
const removed = P.pruneTip('tarti');
assert.ok(removed >= 1);
const left = P.readStore('tarti');
assert.strictEqual(left.length, 1);
assert.ok(left[0].at.indexOf('2026-10-09') === 0);

mem['superari.workMode'] = 'demo';
P.appendReading({ type: 'tarti', hiveId: 101, deviceId: dev.id, at: '2026-10-09T12:00', kg: 38.5, demo: true });
assert.ok(P.readStore('tarti').length >= 2);

console.log('sensor-polling ok');

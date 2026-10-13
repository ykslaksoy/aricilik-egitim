const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const W = path.join(__dirname, '..');

function loadNav(store) {
  const ls = {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
    key: (i) => Object.keys(store)[i],
    get length() { return Object.keys(store).length; }
  };
  const w = {
    localStorage: ls,
    document: {
      readyState: 'complete',
      body: { classList: { add() {}, remove() {}, contains() { return false; } }, hasAttribute() { return false; }, getAttribute() { return ''; }, querySelector() { return null; }, querySelectorAll() { return []; } },
      documentElement: { classList: { add() {}, contains() { return false; } }, style: { setProperty() {} }, getAttribute() { return null; } },
      getElementById() { return null; },
      querySelector() { return null; },
      querySelectorAll() { return []; },
      createElement() { return { style: {}, classList: { add() {} }, setAttribute() {}, appendChild() {} }; },
      head: { appendChild() {} },
      addEventListener() {}
    },
    location: { pathname: '/ana.html', search: '', hash: '' },
    history: { replaceState() {} },
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent() { return true; },
    CustomEvent: function (n, o) { this.type = n; this.detail = o && o.detail; },
    Event: function (n) { this.type = n; },
    navigator: { userAgent: 'test' },
    console,
    setTimeout,
    clearTimeout,
    requestAnimationFrame: (fn) => setTimeout(fn, 0)
  };
  w.window = w; w.self = w; w.global = w;
  vm.createContext(w);
  // Extract only SuperAriPin block by running a stub of nav helpers
  const nav = fs.readFileSync(path.join(W, 'nav.js'), 'utf8');
  assert.ok(nav.includes('SuperAriPin'), 'nav exports SuperAriPin');
  assert.ok(nav.includes("PIN_LOCK_KEY = 'superari.ana.arilikLock'"));
  assert.ok(nav.includes("PIN_SCOPE_KEY = 'superari.bakim.scope'"));
  // Minimal eval of pin helpers
  const m = nav.match(/\/\* k133:[\s\S]*?global\.SuperAriPin = \{[\s\S]*?\};/);
  assert.ok(m, 'pin block found');
  vm.runInContext(m[0], w);
  return { w, store: store };
}

const store = {};
const { w } = loadNav(store);
assert.ok(w.SuperAriPin);
w.SuperAriPin.write('a1', 0);
assert.strictEqual(store['superari.bakim.scope'], 'a1');
const lock = JSON.parse(store['superari.ana.arilikLock']);
assert.strictEqual(lock.locked, true);
assert.strictEqual(lock.id, 'a1');
assert.strictEqual(w.SuperAriPin.read().id, 'a1');
w.SuperAriPin.clear();
assert.strictEqual(store['superari.bakim.scope'], 'all');
assert.strictEqual(store['superari.ana.arilikLock'], undefined);
assert.strictEqual(w.SuperAriPin.read(), null);

const ana = fs.readFileSync(path.join(W, 'ana.html'), 'utf8');
assert.ok(ana.includes('k133: sabitleme kalıcı'), 'ana restores pin');
assert.ok(!/Her açılışta konum açık: sabitleme yok/.test(ana), 'ana no longer clears pin on boot');
assert.ok(ana.includes('dokununca sabitlemeyi kaldır'), 'ana label unpin');

const ks = fs.readFileSync(path.join(W, 'kapsam.js'), 'utf8');
assert.ok(ks.includes('bindLabelUnpin') || ks.includes('data-pin-bound'), 'kapsam label unpin');
assert.ok(ks.includes('pinRead()'), 'kapsam reads pin');

const bk = fs.readFileSync(path.join(W, 'bakim.html'), 'utf8');
assert.ok(bk.includes('pinRead'), 'bakim pin');
assert.ok(bk.includes('data-pin-bound'), 'bakim label unpin');

const kss = fs.readFileSync(path.join(W, 'ks-sayfa.js'), 'utf8');
assert.ok(kss.includes('k133: Ana sabitlemesi'), 'ks-sayfa prefers pin');

console.log('k133 ok');

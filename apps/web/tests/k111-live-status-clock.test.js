/* k111: durum şeridi saati canlı yerel HH:MM */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const nav = fs.readFileSync(path.join(root, 'nav.js'), 'utf8');
const ana = fs.readFileSync(path.join(root, 'ana.html'), 'utf8');

assert.ok(nav.includes('function ensureStatusClock') && nav.includes('function paintStatusClocks'), 'k111 clock');
assert.ok(nav.includes('visibilitychange') && nav.includes('pageshow'), 'refresh on focus');
assert.ok(nav.includes('paintStatusClocks()') && nav.includes('setInterval(paintStatusClocks'), 'interval');
assert.ok(ana.includes('liveStatusClock') || ana.includes('statusClock'), 'ana clock hook');
assert.ok(ana.includes('koloni-114'), 'cache bust');
console.log('k111-live-status-clock ok');

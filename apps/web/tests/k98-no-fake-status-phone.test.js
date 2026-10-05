/* k98 legacy soft: k99 supersedes hide-on-phone; keep getBattery ban + Ana helper */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const nav = fs.readFileSync(path.join(root, 'nav.js'), 'utf8');
assert.ok(nav.includes('function isAnaPage'));
assert.ok(nav.includes('sa-page-ana') || nav.includes('sa-iphone12'));
assert.ok(!nav.includes('navigator.getBattery'), 'getBattery invent yok');
const bk = fs.readFileSync(path.join(root, 'bk-kabuk.css'), 'utf8');
assert.ok(bk.includes('status-bar'));
console.log('k98-no-fake-status-phone ok (softened for k99)');

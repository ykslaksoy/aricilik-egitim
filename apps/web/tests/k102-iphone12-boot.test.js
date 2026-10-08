/* k102: sa-iphone12-boot — pwa sonunda eksik sayfalara bk-kabuk + nav */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const boot = fs.readFileSync(path.join(root, 'sa-iphone12-boot.js'), 'utf8');
const pwa = fs.readFileSync(path.join(root, 'pwa.js'), 'utf8');
const bk = fs.readFileSync(path.join(root, 'bk-kabuk.js'), 'utf8');
const nav = fs.readFileSync(path.join(root, 'nav.js'), 'utf8');
assert.ok(boot.includes('bk-kabuk.js'), 'boot loads kabuk');
assert.ok(pwa.includes('sa-iphone12-boot.js'), 'pwa injects boot');
assert.ok(bk.includes('auth-phone'), 'bk wraps auth');
assert.ok(bk.includes('sa-auto-wrap'), 'bk generic wrap');
assert.ok(boot.includes("var v = 'koloni-106'"), 'boot default cache tag koloni-106');
assert.ok(nav.includes('saPhoneStage'), 'stage wrapper');
assert.ok(nav.includes('overflow:visible!important'), 'unified scroll screen');
console.log('k102-iphone12-boot ok');

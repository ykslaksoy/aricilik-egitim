/* k109: iPhone UA / iPad touch — masaustu cerceve kapali */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const nav = fs.readFileSync(path.join(root, 'nav.js'), 'utf8');
const bk = fs.readFileSync(path.join(root, 'bk-kabuk.js'), 'utf8');
const ana = fs.readFileSync(path.join(root, 'ana.html'), 'utf8');

assert.ok(nav.includes('function isTouchMobileDevice') && nav.includes('function isDesktopShell'), 'k109 helpers');
assert.ok(nav.includes('Macintosh') && nav.includes('maxTouchPoints'), 'iPad desktop UA');
assert.ok(nav.includes('isDesktopShell()'), 'desktop shell gate');
const fit = nav.slice(nav.indexOf('function fitIphone12Shell'), nav.indexOf('function ensureStatusStrip'));
assert.ok(/remove\('sa-shell-framed'\)/.test(fit), 'mobile strips framed class');
assert.ok(bk.includes('function isRealMobile') && bk.includes('iPhone'), 'bk-kabuk mobile UA');
assert.ok(ana.includes('nav.js?v=koloni-110'), 'ana cache bust nav');
console.log('k109-mobile-ua-shell ok');

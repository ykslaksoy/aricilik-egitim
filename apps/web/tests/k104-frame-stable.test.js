/* k104: cerceve kalici — viewport fixed telefon yok; saat/tabbar cerceve icinde */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const nav = fs.readFileSync(path.join(root, 'nav.js'), 'utf8');
const bk = fs.readFileSync(path.join(root, 'bk-kabuk.css'), 'utf8');
assert.ok(nav.includes('k104'), 'k104 marker');
/* k113: gercek telefonda cerceve yine viewport'a sabit (inset 0) — alt menu dipte; masaustunde 390x844 sahne */
assert.ok(nav.includes('k113'), 'superseded by k113 pinned nav');
assert.ok(nav.includes('border-radius:44px!important'), 'visible frame');
assert.ok(nav.includes('layoutPhoneStage'), 'stage layout on desktop');
const fit = nav.slice(nav.indexOf('function fitIphone12Shell'), nav.indexOf('function ensureStatusStrip'));
assert.ok(nav.includes('k108') && /classList\.add\('sa-phone-mobile'\)[\s\S]{0,400}unwrapPhoneStage/.test(fit), 'k108 mobile unwraps stage');
assert.ok((bk.includes('k104') || bk.includes('k108')) && !bk.includes('position: fixed !important; top: 0 !important; left: 0 !important; right: 0 !important; bottom: 0 !important'), 'bk no fixed phone');
console.log('k104-frame-stable ok');

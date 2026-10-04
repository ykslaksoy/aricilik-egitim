/* node tests/sesle-ses.test.js — Sesli mod: tr-TR sesleri arasından en kaliteli sesin otomatik seçimi (Enhanced/Premium → Google → Natural → cihaz üstü varsayılan) */
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const S = require('../sesle-muayene.js');
const V = (name, lang, o) => Object.assign({ name, lang, voiceURI: (o && o.uri) || name, localService: true, default: false }, o || {});
const ios = [V('Yelda', 'tr-TR', { uri: 'com.apple.voice.compact.tr-TR.Yelda', default: true }), V('Yelda (Gelişmiş)', 'tr-TR', { uri: 'com.apple.voice.enhanced.tr-TR.Yelda' }),
  V('Cem', 'tr-TR', { uri: 'com.apple.voice.compact.tr-TR.Cem' }), V('Samantha', 'en-US', { uri: 'com.apple.voice.premium.en-US.Samantha' })];
assert.strictEqual(S.bestTrVoice(ios).name, 'Yelda (Gelişmiş)', 'iOS: Enhanced/Gelişmiş önce; başka dilin Premium sesi seçilmez');
const iosEn = [V('Cem (Enhanced)', 'tr-TR', { uri: 'com.apple.voice.enhanced.tr-TR.Cem' }), V('Yelda', 'tr-TR', { default: true })];
assert.strictEqual(S.bestTrVoice(iosEn).name, 'Cem (Enhanced)');
const android = [V('Türkçe Türkiye', 'tr-TR', { default: true }), V('Google Türkçe', 'tr-TR', { localService: false }), V('Google US English', 'en-US', { localService: false })];
assert.strictEqual(S.bestTrVoice(android).name, 'Google Türkçe', 'Android: Google Türkçe (ağ) yerel varsayılandan önce');
const edge = [V('Microsoft Tolga - Turkish (Turkey)', 'tr-TR', { default: true }), V('Microsoft Emel Online (Natural) - Turkish (Turkey)', 'tr-TR', { localService: false })];
assert.strictEqual(S.bestTrVoice(edge).name, 'Microsoft Emel Online (Natural) - Turkish (Turkey)');
const local = [V('eSpeak Turkish', 'tr'), V('Ses B', 'tr_TR'), V('Ses A', 'tr-TR', { default: true })];
assert.strictEqual(S.bestTrVoice(local).name, 'Ses A', 'yalnız cihaz üstü: varsayılan tr; eSpeak en sona');
assert.strictEqual(S.bestTrVoice([V('Alex', 'en-US')]), null, 'tr ses yoksa null (tarayıcı varsayılanı)');
assert.strictEqual(S.bestTrVoice([]), null);
/* kullanıcının Ses ayarındaki seçimi cihazda varsa korunur; yoksa en iyisi */
assert.strictEqual(S.bestTrVoice(ios, 'com.apple.voice.compact.tr-TR.Cem').name, 'Cem');
assert.strictEqual(S.bestTrVoice(ios, 'yok-boyle-ses').name, 'Yelda (Gelişmiş)');
assert.deepStrictEqual(S.sortTrVoices(android).map((v) => v.name), ['Google Türkçe', 'Türkçe Türkiye']);
/* voiceschanged dinlenir (iOS sesleri geç yükler); arayüze yeni alan eklenmedi */
const src = fs.readFileSync(path.join(__dirname, '..', 'sesle-muayene.js'), 'utf8');
assert.ok(/addEventListener\('voiceschanged', refresh\)/.test(src));
console.log('sesle-ses ok');

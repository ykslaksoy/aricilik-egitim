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
/* öncelik: Gelişmiş > Yelda/Cem (compact da) > Google Türkçe > herhangi tr */
assert.strictEqual(S.bestTrVoice([V('Google Türkçe', 'tr-TR', { localService: false }), V('Cem', 'tr-TR', { uri: 'com.apple.voice.compact.tr-TR.Cem' })]).name, 'Cem');
assert.strictEqual(S.bestTrVoice([V('Google Türkçe', 'tr-TR', { localService: false }), V('Tolga', 'tr-TR', { default: true })]).name, 'Google Türkçe');
/* seslendirme metni: emoji / sembol atılır, birimler okunur */
const T = S.speechText;
assert.strictEqual(T('🍯 Şurup 2:1, 3 L · stok ≈ 12,5 kg'), 'Şurup ikiye bir, 3 litre, stok yaklaşık 12,5 kilogram');
assert.strictEqual(T('Şurup 1:1 · saat 12:10'), 'Şurup bire bir, saat 12:10');
assert.strictEqual(T('Fiyat: ₺120 › Alım talebi'), 'Fiyat: 120 lira, Alım talebi');
assert.strictEqual(T('Bulaşma %3 — eşik 2%'), 'Bulaşma yüzde 3, eşik yüzde 2');
assert.strictEqual(T('✓ Kovan 101 tamam ⚠️'), 'Kovan 101 tamam');
assert.strictEqual(T('½ bardak (≈300 arı)'), 'yarım bardak ( yaklaşık 300 arı)'.replace('( ', '('));
assert.strictEqual(T('alkol / pudra şekeri'), 'alkol ya da pudra şekeri');
assert.strictEqual(T('2 gövde + 1 kat'), '2 gövde ve 1 kat');
assert.strictEqual(T('Lütfen bekleyin'), 'Lütfen bekleyin', 'L harfi sözcük içinde değişmez');
assert.strictEqual(T('🐝'), '');
/* tüm konuşmalar tek yardımcıdan: bakim-akis kendi utterance'ını kurmaz */
const ak = fs.readFileSync(path.join(__dirname, '..', 'bakim-akis.js'), 'utf8');
assert.ok(!/new global\.SpeechSynthesisUtterance/.test(ak) && /VS\.speak\(text/.test(ak));
/* voiceschanged dinlenir (iOS sesleri geç yükler); arayüze yeni alan eklenmedi */
const src = fs.readFileSync(path.join(__dirname, '..', 'sesle-muayene.js'), 'utf8');
assert.ok(/addEventListener\('voiceschanged', refresh\)/.test(src));
console.log('sesle-ses ok');

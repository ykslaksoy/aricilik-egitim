/* k94: iPhone «Ses de olmamış, gelişmiş seçilmemiş» — seçilen Ali (Cem) / Petek (Yelda) her konuşmada yeniden çözülür:
   Premium > Gelişmiş > standart > compact; kayıtlı compact voiceURI sabitlenmez; yerelleştirilmiş «(Gelişmiş)» eki; voiceschanged beklenir. */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const S = require('../sesle-muayene.js');
const V = (name, uri, o) => Object.assign({ name, lang: 'tr-TR', voiceURI: uri || name, localService: true, default: false }, o || {});
const yC = V('Yelda', 'com.apple.voice.compact.tr-TR.Yelda', { default: true });
const yE = V('Yelda (Gelişmiş)', 'com.apple.voice.enhanced.tr-TR.Yelda');
const yP = V('Yelda (Premium)', 'com.apple.voice.premium.tr-TR.Yelda');
const cC = V('Cem', 'com.apple.voice.compact.tr-TR.Cem');
const cE = V('Cem (Gelişmiş)', 'com.apple.voice.enhanced.tr-TR.Cem');
const en = V('Samantha', 'com.apple.voice.premium.en-US.Samantha', { lang: 'en-US' });

/* kayıtlı compact Yelda → aynı ailenin Gelişmiş sürümü (Cem'e kaymaz) */
assert.strictEqual(S.bestTrVoice([yC, yE, cC, cE, en], yC.voiceURI).name, 'Yelda (Gelişmiş)');
/* kayıtlı compact kimlik listede yoksa bile aile korunur */
assert.strictEqual(S.bestTrVoice([yE, cE], yC.voiceURI).name, 'Yelda (Gelişmiş)');
assert.strictEqual(S.bestTrVoice([cC, cE, yC], 'com.apple.voice.compact.tr-TR.Cem').name, 'Cem (Gelişmiş)');
/* Premium > Gelişmiş > compact */
assert.strictEqual(S.bestTrVoice([yC, yE, yP], yC.voiceURI).name, 'Yelda (Premium)');
assert.deepStrictEqual([yC, yE, yP].map(S.voiceTier), [0, 2, 3]);
/* yerelleştirilmiş ekler + voiceURI'de işaret olmayan ad */
assert.strictEqual(S.bestTrVoice([V('Yelda', 'Yelda'), V('Yelda (Geliştirilmiş)', 'Yelda (Geliştirilmiş)')], 'Yelda').name, 'Yelda (Geliştirilmiş)');
assert.strictEqual(S.bestTrVoice([V('Yelda', 'Yelda'), V('Yelda (Enhanced)', 'x.enhanced.y')], 'Petek').name, 'Yelda (Enhanced)', 'Petek = Yelda ailesi');
assert.strictEqual(S.voiceFamily(V('Yelda (İyileştirilmiş)', 'abc')), 'yelda', 'bilinmeyen yerel ek de aileyi bozmaz');
/* eski iOS ttsbundle biçimi */
assert.strictEqual(S.bestTrVoice([V('Yelda', 'com.apple.ttsbundle.Yelda-compact'), V('Yelda (Gelişmiş)', 'com.apple.ttsbundle.Yelda-premium')], 'com.apple.ttsbundle.Yelda-compact').voiceURI, 'com.apple.ttsbundle.Yelda-premium');
/* yalnız tr seslerinden */
assert.strictEqual(S.bestTrVoice([en, yC]).name, 'Yelda');
/* liste: aile başına tek, en iyi sürüm */
assert.deepStrictEqual(S.uniqueTrVoices([yC, yE, yP, cC]).map((v) => v.name).sort(), ['Cem', 'Yelda (Premium)']);

/* tarayıcı: kayıtlı compact seçim + sesler geç yüklenir → konuşma Gelişmiş sesle yapılır; Ayarlar «Kullanılan» bilgisi */
{
  let voices = [yC, cC];
  const listeners = {};
  const spoken = [];
  const store = { 'superari.sesleSes.v1': yC.voiceURI, 'superari.sesleSesSoruldu.v1': '2026-10-01' };
  const win = {
    navigator: { userAgent: 'iPhone' },
    localStorage: { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; } },
    speechSynthesis: {
      getVoices: () => voices.map((v) => Object.assign({}, v)), /* iOS gibi: her çağrıda yeni nesneler */
      addEventListener: (t, f) => { (listeners[t] = listeners[t] || []).push(f); },
      removeEventListener: (t, f) => { listeners[t] = (listeners[t] || []).filter((x) => x !== f); },
      speak: (u) => { spoken.push(u); }, cancel: () => {}
    },
    SpeechSynthesisUtterance: function (t) { this.text = t; },
    setTimeout, clearTimeout, Promise, Object, String, Number, Math, Date, RegExp, Array, JSON
  };
  win.window = win;
  const ctx = vm.createContext(win);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'sesle-muayene.js'), 'utf8'), ctx);
  const SS = win.SuperAriSesle;
  assert.strictEqual(SS.activeVoice().name, 'Yelda', 'Gelişmiş yüklü değilken standart');
  assert.ok(!SS.activeVoice().enhanced && SS.activeVoice().apple);
  assert.ok(/Sözlü İçerik › Sesler › Türkçe/.test(SS.ENH_NOTE), 'iPhone yükleme yolu');
  /* kullanıcı Gelişmiş Yelda'yı indirdi: voiceschanged sonrası aynı kayıtla Gelişmiş seçilir */
  voices = [yC, yE, cC, cE];
  (listeners.voiceschanged || []).forEach((f) => f());
  const av = SS.activeVoice();
  assert.strictEqual(av.name, 'Yelda (Gelişmiş)'); assert.strictEqual(av.nick, 'Petek'); assert.ok(av.enhanced);
  SS.speak('Kovan 12', { noGate: true });
  assert.strictEqual(spoken.length, 1);
  assert.strictEqual(spoken[0].voice.voiceURI, yE.voiceURI, 'konuşma Gelişmiş Yelda ile');
  assert.strictEqual(spoken[0].lang, 'tr-TR');
  /* eski (bayat) seçenek nesnesiyle konuşma da yeniden çözülür */
  const stale = { source: 'device', id: yC.voiceURI, ref: Object.assign({}, yC) };
  SS.speak('Kovan 13', { voice: stale, noGate: true });
  assert.strictEqual(spoken[1].voice.voiceURI, yE.voiceURI);
}
/* Ayarlar «Kullanılan:» satırı */
const ay = fs.readFileSync(path.join(__dirname, '..', 'ayarlar.html'), 'utf8');
assert.ok(/Kullanılan: /.test(ay) && /activeVoice/.test(ay) && /Gelişmiş sürüm yüklü değil/.test(ay));
console.log('k94-ses-gelismis ok');

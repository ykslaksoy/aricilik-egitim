/**
 * SüperArı — Sesle muayene (eller serbest). Kolay muayene sihirbazını sesle yönetir.
 * Tarayıcının ücretsiz Web Speech API'si: SpeechRecognition (tr-TR) + speechSynthesis (tr-TR). Ücretli servis yok.
 * Not: Chrome/Android'de tanıma tarayıcının kendi hizmetiyle yapılır (internet gerekebilir); desteklenmeyen tarayıcıda dokunmatik mod.
 * SuperAriSesle.parse(stepId, metin, opts) saf fonksiyondur (node birim testi: tests/sesle-parser.test.js).
 */
(function (root) {
  'use strict';
  /* ---------------- ayrıştırıcı (saf) ---------------- */
  function lower(s) { return String(s == null ? '' : s).replace(/I/g, 'ı').replace(/İ/g, 'i').toLowerCase(); }
  function fold(s) {
    return lower(s).replace(/[çğıöşüâîû]/g, function (c) { return { 'ç': 'c', 'ğ': 'g', 'ı': 'i', 'ö': 'o', 'ş': 's', 'ü': 'u', 'â': 'a', 'î': 'i', 'û': 'u' }[c]; })
      .replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  }
  function toks(s) { var f = fold(s); return f ? f.split(' ') : []; }
  var UNITS = { sifir: 0, bir: 1, iki: 2, uc: 3, dort: 4, bes: 5, alti: 6, yedi: 7, sekiz: 8, dokuz: 9 };
  var TENS = { on: 10, yirmi: 20, otuz: 30, kirk: 40, elli: 50 };
  /** Metindeki sayılar (rakam veya Türkçe sözcük): [{ n, at }] (at = token sırası). */
  function numbers(text) {
    var t = toks(text), out = [];
    for (var i = 0; i < t.length; i++) {
      var w = t[i];
      if (/^\d+$/.test(w)) { out.push({ n: Number(w), at: i }); continue; }
      if (TENS[w] != null) {
        var n = TENS[w];
        if (i + 1 < t.length && UNITS[t[i + 1]] != null && UNITS[t[i + 1]] > 0) { n += UNITS[t[i + 1]]; out.push({ n: n, at: i }); i++; continue; }
        out.push({ n: n, at: i }); continue;
      }
      if (UNITS[w] != null) out.push({ n: UNITS[w], at: i });
    }
    return out;
  }
  function parseNumber(text) { var n = numbers(text); return n.length ? n[0].n : null; }
  /** tokens içinde phrase (sözcük sınırlı) var mı → konum veya -1 */
  function findPhrase(t, phrase) {
    var p = toks(phrase); if (!p.length) return -1;
    outer: for (var i = 0; i + p.length <= t.length; i++) { for (var j = 0; j < p.length; j++) if (t[i + j] !== p[j]) continue outer; return i; }
    return -1;
  }
  var COMMANDS = [
    ['kaydet ve siradaki', 'saveNext'], ['kaydet siradaki', 'saveNext'], ['siradaki kovan', 'saveNext'], ['kaydet ve gec', 'saveNext'], ['sonraki kovan', 'saveNext'],
    ['siradaki', 'next'], ['kaydet', 'save'], ['tekrar', 'repeat'], ['tekrarla', 'repeat'], ['bir daha', 'repeat'],
    ['geri', 'back'], ['onceki', 'back'], ['atla', 'skip'], ['gec', 'skip'], ['pas', 'skip'], ['bilmiyorum', 'skip'],
    ['dur', 'stop'], ['bitir', 'stop'], ['sesi kapat', 'stop'], ['durdur', 'stop']
  ];
  /* Adım seçenekleri için eş anlamlılar (katlanmış biçimde yazılabilir). Uzun eşleşme kazanır. */
  var SYN = {
    giris: { yogun: ['yogun', 'polen tasiyor', 'guclu', 'cok trafik'], normal: ['normal', 'orta', 'idare eder'], zayif: ['zayif', 'sessiz', 'az trafik'], olu: ['olu', 'surunen', 'olu ari'], yagma: ['yagma', 'kavga'] },
    ana: {
      anaYumurta: ['ana ve yumurta', 'ana ari ve yumurta', 'ikisi de', 'ana yumurta', 'ana gordum yumurta var', 'ana ari goruldu yumurta var', 'ana var yumurta var'],
      yumurta: ['yumurta var', 'yumurta gordum', 'yumurta', 'yumurta goruldu'],
      ana: ['ana ari goruldu', 'ana goruldu', 'ana var', 'ana gordum', 'ana ari var', 'ana var yumurta yok', 'ana gordum yumurta yok'],
      larva: ['larva', 'kapali yavru', 'yalniz larva', 'sadece larva'],
      hicbiri: ['hicbiri', 'ne ana ne yumurta', 'goremedim', 'gorulmedi', 'hic yok', 'anasiz']
    },
    yavru: { duzenli: ['duzenli', 'dolu', 'iyi', 'guzel'], biraz: ['biraz', 'boslukli', 'biraz bosluk', 'az bosluk', 'bosluklu'], daginik: ['daginik', 'cok bosluk', 'kotu', 'bozuk'], yok: ['yavru yok', 'yok', 'hic yavru yok'] },
    kapali: { iyi: ['duzgun', 'iyi', 'normal', 'kubbeli', 'temiz'], birkac: ['birkac', 'az', 'birkac delik'], cok: ['cok', 'cok delik', 'cokuk', 'cok cokuk'] },
    stok: { az: ['az', 'dusuk', 'zayif', 'yok gibi', 'bitmis'], orta: ['orta', 'idare eder', 'normal'], bol: ['bol', 'cok', 'iyi', 'guclu', 'dolu'] },
    meme: { yok: ['yok', 'meme yok', 'gormedim'], ogul: ['ogul', 'alt kenar', 'ogul memesi', 'kenarda'], yenileme: ['sessiz', 'petek ortasi', 'ortada', 'yenileme', 'sessiz ana degistirme'], acil: ['acil', 'genc larva', 'acil meme'] },
    varroa: { yok: ['gorulmedi', 'yok', 'temiz', 'gormedim'], az: ['birkac', 'az', 'birkac akar'], cok: ['cok', 'cok akar', 'bozuk kanat', 'bozuk kanatli'], sayim: ['sayim', 'sayacagim', 'sayim yapacagim'] },
    hastalik: { yok: ['yok', 'temiz', 'belirti yok', 'saglikli'], var: ['var', 'supheli', 'belirti var', 'hastalik var'] },
    huy: { '5': ['cok sakin', 'uysal', 'cok uysal'], '4': ['sakin'], '3': ['orta', 'normal', 'idare eder'], '2': ['sinirli', 'huysuz'], '1': ['cok sinirli', 'saldirgan', 'cok huysuz'] },
    yer: { bol: ['bol', 'bol yer', 'yer var', 'bos'], dolmak: ['dolmak', 'dolmak uzere', 'dolmak uzre', 'az yer'], dolu: ['dolu', 'sikisik', 'dar', 'yer yok'], kat: ['kat', 'ballik', 'kat takili', 'bal kati'] },
    kutu: { iyi: ['iyi', 'saglam', 'normal'], catlak: ['catlak', 'aralik'], nem: ['nem', 'nemli', 'kuf', 'kuflu'], yer: ['gunes', 'ruzgar', 'su baskini', 'yer sorunu'] },
    anayas: { '0': ['bu yil', 'bu sene', 'yeni ana', 'genc'], '1': ['gecen yil', 'gecen sene', 'bir yasinda'], '2': ['iki yas', 'iki yasinda', 'yasli', 'eski'], '?': ['bilinmiyor', 'bilmiyorum emin degilim', 'emin degilim'] },
    petek: { yeni: ['yeni', 'acik renk', 'acik'], orta: ['orta', 'normal'], eski: ['eski', 'koyu', 'kara'] },
    genel: { iyi: ['iyi', 'guzel', 'guclu'], orta: ['orta', 'normal', 'idare eder'], kotu: ['kotu', 'zayif', 'sorunlu'] }
  };
  var YES = { hastalik: 'var', ana: 'yumurta', meme: null, varroa: 'az' };
  var NO = { hastalik: 'yok', ana: 'hicbiri', meme: 'yok', varroa: 'yok', kapali: 'iyi', yavru: 'yok' };
  function matchOption(stepId, text, opts) {
    var t = toks(text), syn = SYN[stepId] || {}, best = null;
    function consider(v, ph) { var at = findPhrase(t, ph); if (at < 0) return; var len = toks(ph).length; if (!best || len > best.len) best = { value: v, len: len, at: at }; }
    Object.keys(syn).forEach(function (v) { syn[v].forEach(function (ph) { consider(v, ph); }); });
    (opts || []).forEach(function (o) { consider(o[0], o[1]); });
    if (stepId === 'ana' && best && (best.value === 'ana' || best.value === 'yumurta')) {
      var hasAna = findPhrase(t, 'ana') >= 0, egg = findPhrase(t, 'yumurta var') >= 0 || (findPhrase(t, 'yumurta') >= 0 && findPhrase(t, 'yumurta yok') < 0);
      if (hasAna && egg && findPhrase(t, 'yumurta yok') < 0) best = { value: 'anaYumurta', len: 9 };
    }
    if (!best) {
      if (findPhrase(t, 'evet') >= 0 && YES[stepId]) return YES[stepId];
      if ((findPhrase(t, 'hayir') >= 0 || findPhrase(t, 'yok') >= 0) && NO[stepId]) return NO[stepId];
      var n = parseNumber(text);
      if (n != null && stepId === 'huy' && n >= 1 && n <= 5) return String(n);
      if (n != null && stepId === 'anayas' && n >= 0 && n <= 2) return String(n);
      return null;
    }
    return best.value;
  }
  function parseFrames(text) {
    var t = toks(text), ns = numbers(text), bee = null, brood = null;
    ns.forEach(function (x) {
      var nxt = t.slice(x.at + 1, x.at + 3).join(' ');
      if (/\byavru/.test(nxt)) { if (brood == null) brood = x.n; }
      else if (/\bari/.test(nxt) || /\bcerceve/.test(nxt)) { if (bee == null) bee = x.n; }
    });
    var rest = ns.filter(function (x) { return x.n !== bee && x.n !== brood; }).map(function (x) { return x.n; });
    if (bee == null && rest.length) bee = rest.shift();
    if (brood == null && rest.length && bee != null) brood = rest.shift();
    if (bee == null && brood == null) return null;
    return { bee: bee, brood: brood };
  }
  /**
   * Bir söyleyişi çözümle. stepId: kolay-muayene adımı ('cerceve' sayı adımı, 'summary' özet).
   * Dönüş: { cmd } | { value } | { frames:{bee,brood} } | { note } | { none:true }
   */
  function parse(stepId, text, opts) {
    opts = opts || {};
    var t = toks(text);
    if (!t.length) return { none: true };
    if (t[0] === 'not' && t.length > 1) return { note: String(text).trim().replace(/^\s*not[\s:,]*/i, '') };
    /* adım yanıtı komuttan önce: «geçen yıl» gibi ifadeler «geç» sanılmasın (sözcük sınırı zaten korur) */
    for (var i = 0; i < COMMANDS.length; i++) {
      if (findPhrase(t, COMMANDS[i][0]) >= 0) {
        var cmd = COMMANDS[i][1];
        /* «yok» gibi kısa yanıtlarla çakışmaz; «bir daha» yalnız tek başına söylenirse tekrar sayılır */
        if (COMMANDS[i][0] === 'bir daha' && t.length > 2) continue;
        return { cmd: cmd };
      }
    }
    if (stepId === 'summary') return { none: true };
    /* Sayı adımları (bal / oğul memeli çerçeve): tam sayı; «yok», «hiç» → 0 */
    if (opts.count) {
      var cn = parseNumber(text);
      if (cn != null) return { value: cn };
      if (findPhrase(t, 'yok') >= 0 || findPhrase(t, 'hic') >= 0 || findPhrase(t, 'hic yok') >= 0) return { value: 0 };
      return { none: true };
    }
    if (stepId === 'cerceve' || opts.stepper) {
      if (opts.sub === 'brood') { var nb = parseNumber(text); return nb != null ? { frames: { bee: null, brood: nb } } : { none: true }; }
      var fr = parseFrames(text); return fr ? { frames: fr } : { none: true };
    }
    var v = matchOption(stepId, text, opts.options);
    return v != null ? { value: v } : { none: true };
  }

  /* ---------------- Ses seçimi (saf; node testi: tests/sesle-ses.test.js) ----------------
   * tr-TR sesleri arasından en kalitelisi: 1) Enhanced / Gelişmiş / Premium (iOS Yelda / Cem Enhanced),
   * 2) Google Türkçe (Android / Chrome, ağ / neural), 3) Edge «Online (Natural)», 4) cihaz üstü (localService) varsayılan tr ses. Compact / eSpeak en sona. */
  function voiceRank(v) {
    if (!v) return -999;
    var n = String(v.name || '') + ' ' + String(v.voiceURI || ''), r = 0;
    if (/enhanced|premium|gelişmiş|gelismis|geliştirilmiş|yüksek kalite|high quality/i.test(n)) r += 100;
    if (/google/i.test(n)) r += 60 + (v.localService === false ? 5 : 0);
    if (/natural|neural/i.test(n)) r += 55;
    if (/yelda|cem\b/i.test(n)) r += 5;
    if (v['default']) r += 3;
    if (v.localService) r += 2; /* çevrimdışı da çalışır */
    if (/^tr[-_]TR$/i.test(v.lang || '')) r += 1;
    if (/compact|espeak/i.test(n)) r -= 30;
    return r;
  }
  function sortTrVoices(list) {
    return (list || []).filter(function (v) { return v && /^tr([-_]|$)/i.test(String(v.lang || '')); })
      .sort(function (a, b) { return voiceRank(b) - voiceRank(a) || String(a.name).localeCompare(String(b.name)); });
  }
  /** Kayıtlı seçim (Ses ayarı) cihazda varsa o; yoksa en kaliteli tr ses; hiç yoksa null. */
  function bestTrVoice(list, savedId) {
    var l = sortTrVoices(list);
    if (savedId) { for (var i = 0; i < l.length; i++) if (l[i].voiceURI === savedId || l[i].name === savedId) return l[i]; }
    return l[0] || null;
  }

  var API = { parse: parse, parseNumber: parseNumber, numbers: numbers, parseFrames: parseFrames, matchOption: matchOption, fold: fold, voiceRank: voiceRank, sortTrVoices: sortTrVoices, bestTrVoice: bestTrVoice };
  if (typeof module !== 'undefined' && module.exports) { module.exports = API; return; }

  /* ---------------- tarayıcı: ses denetleyicisi ---------------- */
  var global = root;
  var SR = global.SpeechRecognition || global.webkitSpeechRecognition;
  function supported() { return !!(SR && global.speechSynthesis); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  var css = '.km-voice{background:#2b1a0e;color:#fff;padding:10px 12px;display:grid;gap:6px;}' +
    '.kv-top{display:flex;align-items:center;gap:8px;}.kv-state{font-weight:800;font-size:14px;flex:1;min-width:0;}.kv-dot{width:12px;height:12px;border-radius:50%;background:#868e96;flex:none;}' +
    '.kv-dot.on{background:#fa5252;animation:kvp 1s ease-in-out infinite alternate;}@keyframes kvp{to{opacity:.35}}.kv-dot.say{background:#fab005;}' +
    '.kv-step{font-size:13px;color:#f3e2c8;}.kv-tr{font-size:22px;font-weight:800;line-height:1.25;min-height:28px;overflow-wrap:anywhere;}' +
    '.kv-parsed{font-size:14px;color:#b2f2bb;font-weight:700;}.kv-btns{display:flex;gap:6px;flex-wrap:wrap;}' +
    '.kv-btns button{font:inherit;font-size:14px;font-weight:800;border-radius:10px;padding:8px 12px;border:1px solid #f3e2c8;background:transparent;color:#fff;cursor:pointer;min-height:40px;}' +
    '.kv-btns button.pri{background:#e56f1c;border-color:#e56f1c;}.kv-help{font-size:12px;color:#f3e2c8;}' +
    '.kv-voices{display:grid;gap:6px;background:#3a2515;border-radius:10px;padding:8px;}.kv-voices label{display:grid;gap:4px;font-size:12px;color:#f3e2c8;font-weight:700;}' +
    '.kv-voices select{font:inherit;font-size:14px;border-radius:8px;padding:8px;max-width:100%;min-width:0;}.kv-voices button{justify-self:start;font:inherit;font-size:14px;font-weight:800;border-radius:10px;padding:8px 12px;border:1px solid #f3e2c8;background:transparent;color:#fff;min-height:40px;}' +
    '.km-voice.unsup{background:#fff4e6;color:#8a4b00;border-bottom:1px solid #ffd8a8;font-size:14px;}';
  function ensureCss() { if (document.getElementById('kvCss')) return; var s = document.createElement('style'); s.id = 'kvCss'; s.textContent = css; document.head.appendChild(s); }
  var active = null;
  /* ---- Ses seçimi: cihazdaki en doğal Türkçe ses (ücretsiz, cihaz üstü) ---- */
  var VOICE_KEY = 'superari.sesleSes.v1';
  function trVoices() {
    var vs = []; try { vs = global.speechSynthesis.getVoices() || []; } catch (e) { vs = []; }
    if (vs.length) voiceCache = vs; else vs = voiceCache; /* iOS: sesler geç yüklenir → son bilinen liste */
    return sortTrVoices(vs);
  }
  function savedVoiceId() { try { return localStorage.getItem(VOICE_KEY) || ''; } catch (e) { return ''; } }
  function trVoice() { return bestTrVoice(trVoices(), savedVoiceId()); }
  /* sesler geç yüklenebilir (iOS Safari): voiceschanged ile önbelleği yenile, yüklemeyi şimdiden tetikle */
  var voiceCache = [];
  try {
    if (global.speechSynthesis) {
      var refresh = function () { try { var l = global.speechSynthesis.getVoices() || []; if (l.length) voiceCache = l; } catch (e) { /* ignore */ } };
      if (global.speechSynthesis.addEventListener) global.speechSynthesis.addEventListener('voiceschanged', refresh);
      else global.speechSynthesis.onvoiceschanged = refresh;
      refresh();
    }
  } catch (e) { /* ignore */ }
  function utter(text) {
    var u = new global.SpeechSynthesisUtterance(text); u.lang = 'tr-TR'; u.rate = 1.02; u.pitch = 1.0;
    var v = trVoice(); if (v) { u.voice = v; u.lang = v.lang; }
    return u;
  }
  /* ---- Doğal konuşma metinleri ---- */
  function lastVowel(w) { var m = String(w).toLocaleLowerCase('tr').match(/[aeıioöuü](?=[^aeıioöuü]*$)/); return m ? m[0] : 'e'; }
  function qParticle(w) { return { a: 'mı', 'ı': 'mı', e: 'mi', i: 'mi', o: 'mu', u: 'mu', 'ö': 'mü', 'ü': 'mü' }[lastVowel(w)]; }
  function shortLabel(l) { return String(l || '').replace(/ \+ /g, ' ve ').split(' (')[0].split(' — ')[0].split(' / ')[0].split(', ')[0].trim(); }
  function lowerFirst(t) { return t ? t.charAt(0).toLocaleLowerCase('tr') + t.slice(1) : t; }
  var SAY_Q = {
    giris: 'Önce girişe bakalım. Trafik yoğun mu, normal mi, zayıf mı? Ölü arı ya da yağma varsa onu söyleyin.',
    ana: 'Ana arıyı ya da yumurtayı gördünüz mü?',
    yavru: 'Yavru düzeni nasıl? Düzenli mi, biraz boşluklu mu, dağınık mı?',
    kapali: 'Kapalı yavru kapakları düzgün mü, yoksa delikli, çökük olanlar var mı?',
    cerceve: 'Kaç çerçeve arıyla kaplı, kaçında yavru var? Mesela, sekiz arılı üç yavrulu.',
    stok: 'Kaç çerçevede bal var? Sayıyı söyleyin.',
    ogul: 'Kaç çerçevede oğul memesi var? Yoksa yok deyin.',
    meme: 'Başka ana memesi var mı? Petek ortasında mı, acil meme mi, yoksa yok mu?',
    varroa: 'Varroa gördünüz mü? Yok, birkaç ya da çok diyebilirsiniz.',
    hastalik: 'Hastalık belirtisi var mı?',
    huy: 'Arılar nasıldı? Sakin mi, sinirli mi?',
    yer: 'Kovanda yer var mı, yoksa dolmak üzere mi?',
    kutu: 'Kovan kutusu ve yeri iyi mi? Çatlak, nem ya da yer sorunu var mı?',
    anayas: 'Ana arı kaç yaşında? Bu yıl mı, geçen yıl mı, daha eski mi?',
    petek: 'Petekler yeni mi, orta mı, eski mi?',
    genel: 'Son olarak, genel izleniminiz nasıl? İyi, orta ya da kötü.'
  };
  function naturalQ(c) {
    if (c.id && SAY_Q[c.id]) return SAY_Q[c.id];
    var q = String(c.def.q || '').replace(/\s*\/\s*/g, ' ve ').replace(/\s*\(.*?\)\s*/g, ' ').trim();
    if (!c.def.opts) return q;
    var labs = c.def.opts.slice(0, 4).map(function (o) { return lowerFirst(shortLabel(o[1])); });
    var asks = labs.map(function (l) { return l + ' ' + qParticle(l); });
    return q.replace(/\?$/, '') + '? ' + asks.join(', ').replace(/^./, function (x) { return x.toLocaleUpperCase('tr'); }) + '?';
  }
  var ACKS = ['Tamam', 'Anladım', 'Peki'];
  var ackI = 0;
  function ack(label) { var a = ACKS[ackI++ % ACKS.length]; return a + ', ' + lowerFirst(shortLabel(label)) + '.'; }
  function showUnsupported(api) {
    ensureCss();
    var bar = api.bar(); if (!bar) return;
    bar.hidden = false; bar.className = 'km-voice unsup';
    bar.innerHTML = '<b>🎙 Sesle muayene bu tarayıcıda desteklenmiyor.</b> (iPhone’da bazı tarayıcılar ve Firefox ses tanımayı desteklemez; Android’de Chrome, iPhone’da Safari deneyin.) Dokunarak devam edebilirsiniz; notları klavyenin mikrofon tuşuyla yazdırabilirsiniz.' +
      '<div class="kv-btns" style="margin-top:6px;"><button type="button" data-kv-close style="color:#8a4b00;border-color:#8a4b00;">Tamam</button></div>';
    bar.querySelector('[data-kv-close]').onclick = function () { bar.hidden = true; };
  }
  /**
   * api (kolay-muayene.js sağlar): { bar(), cur(), answer(id,v), frames(bee,brood), back(), skip(), save(next), goNext(), note(text), optLabel(id,v), onRender }
   * opts.resume: sayfa geçişinden sonra — kullanıcı dokunuşu gerektiğinden «Sesle devam» düğmesi gösterilir.
   */
  function start(api, opts) {
    opts = opts || {};
    if (!supported()) { showUnsupported(api); return null; }
    ensureCss();
    if (active) active.stop(true);
    var bar = api.bar(); bar.hidden = false; bar.className = 'km-voice';
    bar.innerHTML = '<div class="kv-top"><span class="kv-dot" data-kv-dot></span><span class="kv-state" data-kv-state>Sesle muayene</span></div>' +
      '<div class="kv-step" data-kv-step></div><div class="kv-tr" data-kv-tr aria-live="polite"></div><div class="kv-parsed" data-kv-parsed></div>' +
      '<div class="kv-btns"><button type="button" data-kv-go class="pri" hidden>🎙 Sesle devam et</button><button type="button" data-kv-repeat>🔁 Tekrar</button><button type="button" data-kv-stop>⏹ Dur</button><button type="button" data-kv-vbtn>🔈 Ses seç</button></div>' +
      '<div class="kv-voices" data-kv-voices hidden><label>Türkçe ses<select data-kv-vsel></select></label>' +
      '<button type="button" data-kv-vtest>▶ Dene</button>' +
      '<p class="kv-help">Daha akıcı ses için — iPhone: Ayarlar › Erişilebilirlik › Seslendirme › Sesler › Türkçe › «Yelda (Gelişmiş)» indirin. Android: Ayarlar › Metin okuma › Google TTS › Türkçe yüksek kalite sesi indirin. Sonra buradan seçin.</p></div>' +
      '<div class="kv-help">Komutlar: «geç», «geri», «tekrar», «kaydet», «kaydet ve sıradaki», «dur», «not …»</div>';
    var $ = function (a) { return bar.querySelector('[data-kv-' + a + ']'); };
    /* Sayfanın tek mikrofon oturumu (mic-session.js): kovan / kart değişince yeni izin istenmez */
    var rec = global.SuperAriMic && global.SuperAriMic.supported() ? global.SuperAriMic.create() : new SR();
    if (global.SuperAriMic) global.SuperAriMic.warm();
    rec.lang = 'tr-TR'; rec.continuous = true; rec.interimResults = true; rec.maxAlternatives = 3;
    var st = { on: true, listening: false, speaking: false, sub: null, bee: null, busy: false, fails: 0, lastPrompt: '', prefix: '' };
    function state(txt, mode) { $('state').textContent = txt; var d = $('dot'); d.className = 'kv-dot' + (mode ? ' ' + mode : ''); }
    function listen() {
      if (!st.on || st.speaking) return;
      try { rec.start(); } catch (e) { /* zaten dinliyor */ }
    }
    function stopRec() { try { rec.abort(); } catch (e) { /* ignore */ } st.listening = false; }
    function speak(text, then) {
      stopRec(); st.speaking = true; state('Konuşuyor…', 'say');
      var done = false, fin = function () { if (done) return; done = true; st.speaking = false; if (!st.on) return; if (then) then(); else listen(); };
      try {
        global.speechSynthesis.cancel();
        var u = utter(text);
        u.onend = fin; u.onerror = fin;
        global.speechSynthesis.speak(u);
      } catch (e) { fin(); return; }
      setTimeout(fin, Math.min(15000, 1500 + text.length * 75)); /* onend gelmezse */
    }
    function optsText(c) {
      if (!c.def || !c.def.opts) return '';
      var labs = c.def.opts.map(function (o) { return lowerFirst(shortLabel(o[1])); });
      return ' ' + labs.slice(0, -1).join(', ').replace(/^./, function (x) { return x.toLocaleUpperCase('tr'); }) + ' ya da ' + labs[labs.length - 1] + ' diyebilirsiniz.';
    }
    function prompt() {
      if (!st.on) return;
      var c = api.cur(); st.sub = null; st.bee = null;
      $('parsed').textContent = ''; $('tr').textContent = '';
      var text;
      if (c.summary) {
        $('step').textContent = c.done ? 'Kaydedildi' : 'Özet';
        text = c.done ? 'Kaydettim. Sıradaki kovana geçelim mi? Sıradaki ya da dur deyin.' : 'Hepsi bu kadar. Kaydedeyim mi? Kaydet ya da kaydet ve sıradaki deyin.';
      } else {
        $('step').textContent = 'Adım ' + (c.i + 1) + ' / ' + c.n + ' · ' + c.def.q;
        text = naturalQ(c);
      }
      st.lastPrompt = text;
      var pre = st.prefix; st.prefix = '';
      speak(pre ? pre + ' ' + text : text);
    }
    /* Onay cümlesi bir sonraki soruyla birleştirilir («Tamam, yoğun. Ana arıyı gördünüz mü?»). */
    function after(msg, fn) {
      $('parsed').textContent = '✓ ' + msg;
      if (!fn) { speak(msg); return; }
      st.prefix = msg;
      stopRec();
      fn();
      setTimeout(function () { if (st.prefix && st.on) { var m = st.prefix; st.prefix = ''; speak(m); } }, 350);
    }
    function handle(text) {
      var c = api.cur(), id = c.summary ? 'summary' : c.id;
      var r = parse(id, text, { options: c.def && c.def.opts, stepper: c.def && c.def.stepper, count: c.def && c.def.count, sub: st.sub });
      if (r.cmd) {
        st.fails = 0;
        if (r.cmd === 'stop') { $('parsed').textContent = '✓ Durdu'; speak('Tamam, duruyorum.', function () { stop(); }); return; }
        if (r.cmd === 'repeat') { prompt(); return; }
        if (r.cmd === 'back') { after('Bir önceki soruya dönüyorum.', function () { api.back(); }); return; }
        if (r.cmd === 'skip') { after('Geçiyorum.', function () { if (c.summary) prompt(); else api.skip(); }); return; }
        if (r.cmd === 'save') { if (c.done) { prompt(); return; } after('Kaydediyorum.', function () { api.save(false); }); return; }
        if (r.cmd === 'saveNext' || r.cmd === 'next') {
          if (c.done) { after('Sıradaki kovan.', function () { api.goNext(); }); return; }
          after('Kaydettim, sıradaki kovana geçiyorum.', function () { api.save(true); }); return;
        }
      }
      if (r.note) { api.note(r.note); after('Notu ekledim.', null); return; }
      if (r.frames) {
        st.fails = 0;
        if (st.sub === 'brood') { var bee = st.bee; after('Tamam, ' + r.frames.brood + ' yavrulu.', function () { api.frames(bee, r.frames.brood); }); return; }
        if (r.frames.brood == null) { st.sub = 'brood'; st.bee = r.frames.bee; after(r.frames.bee + ' arılı. Peki kaçında yavru var?', null); return; }
        after('Tamam, ' + r.frames.bee + ' arılı, ' + r.frames.brood + ' yavrulu.', function () { api.frames(r.frames.bee, r.frames.brood); }); return;
      }
      if (r.value != null) { st.fails = 0; var lab = api.optLabel(id, r.value); after(ack(lab), function () { api.answer(id, r.value); }); return; }
      st.fails++;
      speak(st.fails > 1 ? 'Yine anlayamadım.' + (c.def && c.def.opts ? optsText(c) : ' Bir sayı söyleyin.') + ' İsterseniz geç deyin.' : 'Kusura bakmayın, anlayamadım. Tekrar söyler misiniz?');
    }
    rec.onstart = function () { st.listening = true; state('Dinliyorum…', 'on'); };
    rec.onresult = function (e) {
      var interim = '', fin = '';
      for (var i = e.resultIndex; i < e.results.length; i++) { var res = e.results[i]; if (res.isFinal) fin += res[0].transcript; else interim += res[0].transcript; }
      $('tr').textContent = (fin || interim) ? '«' + (fin || interim).trim() + '»' : '';
      if (fin.trim() && !st.speaking) handle(fin.trim());
    };
    rec.onerror = function (e) {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') { st.on = false; state('Mikrofon izni verilmedi', ''); $('tr').textContent = 'Tarayıcı ayarlarından mikrofon iznini açın; dokunarak devam edebilirsiniz.'; return; }
      if (e.error === 'network') { $('parsed').textContent = 'Ses tanıma için internet gerekebilir (tarayıcı hizmeti). Dokunarak devam edin.'; return; }
      if (e.error === 'no-speech') { if (st.on && !st.speaking) speak(api.cur().summary ? 'Sizi duyamadım. Kaydet deyin.' : 'Sizi duyamadım, tekrar söyler misiniz?'); }
    };
    rec.onend = function () { st.listening = false; if (st.on && !st.speaking) setTimeout(listen, 250); else if (!st.on) state('Durdu', ''); };
    function stop(silent) {
      st.on = false; stopRec(); try { global.speechSynthesis.cancel(); } catch (e) { /* ignore */ }
      api.onRender = null; active = null;
      if (!silent) { state('Durdu · dokunarak devam edin', ''); $('go').hidden = false; $('go').textContent = '🎙 Sesle yeniden başlat'; }
    }
    function fillVoices() {
      var sel = $('vsel'), list = trVoices(), cur = trVoice();
      sel.innerHTML = list.length ? list.map(function (v, i) {
        var tag = voiceRank(v) >= 55 ? ' · doğal' : '';
        return '<option value="' + esc(v.voiceURI || v.name) + '"' + (cur && (cur.voiceURI || cur.name) === (v.voiceURI || v.name) ? ' selected' : '') + '>' + esc(v.name) + (i === 0 ? ' (önerilen)' : '') + tag + '</option>';
      }).join('') : '<option value="">Cihazda Türkçe ses bulunamadı</option>';
    }
    $('vbtn').onclick = function () { var p = $('voices'); p.hidden = !p.hidden; if (!p.hidden) fillVoices(); };
    $('vsel').onchange = function () { try { localStorage.setItem(VOICE_KEY, this.value); } catch (e) { /* ignore */ } };
    $('vtest').onclick = function () {
      try { global.speechSynthesis.cancel(); global.speechSynthesis.speak(utter('Merhaba. Kovan yüz bir. Yavru düzeni nasıl? Düzenli mi, biraz boşluklu mu?')); } catch (e) { /* ignore */ }
    };
    try { global.speechSynthesis.addEventListener('voiceschanged', function () { if (!$('voices').hidden) fillVoices(); }); } catch (e) { /* ignore */ }
    $('stop').onclick = function () { stop(); };
    $('repeat').onclick = function () { if (!st.on) { restart(); return; } prompt(); };
    $('go').onclick = function () { restart(); };
    function restart() { $('go').hidden = true; st.on = true; api.onRender = prompt; active = ctl; prompt(); }
    var ctl = { stop: stop, handle: handle, prompt: prompt };
    active = ctl;
    api.onRender = prompt;
    try { global.speechSynthesis.getVoices(); } catch (e) { /* ignore */ }
    if (opts.resume) { state('Sesle muayene · devam için dokunun', ''); st.on = false; api.onRender = null; $('go').hidden = false; $('step').textContent = 'Önceki kovan kaydedildi.'; }
    else prompt();
    return ctl;
  }
  root.SuperAriSesle = { parse: parse, parseNumber: parseNumber, numbers: numbers, supported: supported, start: start, trVoices: trVoices, pickVoice: trVoice, voiceRank: voiceRank, stop: function () { if (active) active.stop(); } };
})(typeof window !== 'undefined' ? window : this);

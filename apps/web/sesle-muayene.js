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
    if (stepId === 'cerceve' || opts.stepper) {
      if (opts.sub === 'brood') { var nb = parseNumber(text); return nb != null ? { frames: { bee: null, brood: nb } } : { none: true }; }
      var fr = parseFrames(text); return fr ? { frames: fr } : { none: true };
    }
    var v = matchOption(stepId, text, opts.options);
    return v != null ? { value: v } : { none: true };
  }

  var API = { parse: parse, parseNumber: parseNumber, numbers: numbers, parseFrames: parseFrames, matchOption: matchOption, fold: fold };
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
    '.km-voice.unsup{background:#fff4e6;color:#8a4b00;border-bottom:1px solid #ffd8a8;font-size:14px;}';
  function ensureCss() { if (document.getElementById('kvCss')) return; var s = document.createElement('style'); s.id = 'kvCss'; s.textContent = css; document.head.appendChild(s); }
  var active = null;
  function trVoice() {
    var vs = []; try { vs = global.speechSynthesis.getVoices(); } catch (e) { vs = []; }
    return vs.filter(function (v) { return /^tr/i.test(v.lang); })[0] || null;
  }
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
      '<div class="kv-btns"><button type="button" data-kv-go class="pri" hidden>🎙 Sesle devam et</button><button type="button" data-kv-repeat>🔁 Tekrar</button><button type="button" data-kv-stop>⏹ Dur</button></div>' +
      '<div class="kv-help">Komutlar: «geç», «geri», «tekrar», «kaydet», «kaydet ve sıradaki», «dur», «not …»</div>';
    var $ = function (a) { return bar.querySelector('[data-kv-' + a + ']'); };
    var rec = new SR();
    rec.lang = 'tr-TR'; rec.continuous = true; rec.interimResults = true; rec.maxAlternatives = 3;
    var st = { on: true, listening: false, speaking: false, sub: null, bee: null, busy: false, fails: 0, lastPrompt: '' };
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
        var u = new global.SpeechSynthesisUtterance(text); u.lang = 'tr-TR'; u.rate = 1.05;
        var v = trVoice(); if (v) u.voice = v;
        u.onend = fin; u.onerror = fin;
        global.speechSynthesis.speak(u);
      } catch (e) { fin(); return; }
      setTimeout(fin, Math.min(15000, 1500 + text.length * 75)); /* onend gelmezse */
    }
    function optsText(c) {
      if (!c.def || !c.def.opts) return '';
      return ' Seçenekler: ' + c.def.opts.map(function (o) { return o[1].split(' (')[0]; }).join(', ') + '.';
    }
    function prompt() {
      if (!st.on) return;
      var c = api.cur(); st.sub = null; st.bee = null;
      $('parsed').textContent = ''; $('tr').textContent = '';
      var text;
      if (c.summary) {
        $('step').textContent = c.done ? 'Kaydedildi' : 'Özet';
        text = c.done ? 'Kaydedildi. Sıradaki kovan için sıradaki deyin, bitirmek için dur deyin.' : 'Özet hazır. Kaydetmek için kaydet, kaydedip sonraki kovana geçmek için kaydet ve sıradaki deyin.';
      } else {
        $('step').textContent = 'Adım ' + (c.i + 1) + ' / ' + c.n + ' · ' + c.def.q;
        text = c.def.stepper ? c.def.q + '. Arılı ve yavrulu çerçeve sayısını söyleyin, örneğin sekiz arılı üç yavrulu.' : c.def.q + optsText(c);
      }
      st.lastPrompt = text;
      speak(text);
    }
    function after(msg, fn) { $('parsed').textContent = '✓ ' + msg; speak(msg, fn); }
    function handle(text) {
      var c = api.cur(), id = c.summary ? 'summary' : c.id;
      var r = parse(id, text, { options: c.def && c.def.opts, stepper: c.def && c.def.stepper, sub: st.sub });
      if (r.cmd) {
        st.fails = 0;
        if (r.cmd === 'stop') { after('Sesle muayene durdu.', function () { stop(); }); return; }
        if (r.cmd === 'repeat') { prompt(); return; }
        if (r.cmd === 'back') { after('Geri.', function () { api.back(); }); return; }
        if (r.cmd === 'skip') { after('Atlandı.', function () { if (c.summary) prompt(); else api.skip(); }); return; }
        if (r.cmd === 'save') { if (c.done) { prompt(); return; } after('Kaydediliyor.', function () { api.save(false); }); return; }
        if (r.cmd === 'saveNext' || r.cmd === 'next') {
          if (c.done) { after('Sıradaki kovan.', function () { api.goNext(); }); return; }
          after('Kaydediliyor, sıradaki kovana geçiliyor.', function () { api.save(true); }); return;
        }
      }
      if (r.note) { api.note(r.note); after('Not eklendi.', null); return; }
      if (r.frames) {
        st.fails = 0;
        if (st.sub === 'brood') { var bee = st.bee; after(r.frames.brood + ' yavrulu çerçeve.', function () { api.frames(bee, r.frames.brood); }); return; }
        if (r.frames.brood == null) { st.sub = 'brood'; st.bee = r.frames.bee; after(r.frames.bee + ' arılı çerçeve. Yavrulu kaç?', null); return; }
        after(r.frames.bee + ' arılı, ' + r.frames.brood + ' yavrulu çerçeve.', function () { api.frames(r.frames.bee, r.frames.brood); }); return;
      }
      if (r.value != null) { st.fails = 0; var lab = api.optLabel(id, r.value); after(lab + '.', function () { api.answer(id, r.value); }); return; }
      st.fails++;
      speak('Anlayamadım' + (st.fails > 1 ? '. ' + (c.def && c.def.opts ? optsText(c) : 'Bir sayı söyleyin.') + ' Ya da geç deyin.' : ', tekrar söyler misiniz?'));
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
      if (e.error === 'no-speech') { if (st.on && !st.speaking) speak('Duyamadım. ' + (api.cur().summary ? 'Kaydet deyin.' : 'Tekrar söyler misiniz?')); }
    };
    rec.onend = function () { st.listening = false; if (st.on && !st.speaking) setTimeout(listen, 250); else if (!st.on) state('Durdu', ''); };
    function stop(silent) {
      st.on = false; stopRec(); try { global.speechSynthesis.cancel(); } catch (e) { /* ignore */ }
      api.onRender = null; active = null;
      if (!silent) { state('Durdu · dokunarak devam edin', ''); $('go').hidden = false; $('go').textContent = '🎙 Sesle yeniden başlat'; }
    }
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
  root.SuperAriSesle = { parse: parse, parseNumber: parseNumber, numbers: numbers, supported: supported, start: start, stop: function () { if (active) active.stop(); } };
})(typeof window !== 'undefined' ? window : this);

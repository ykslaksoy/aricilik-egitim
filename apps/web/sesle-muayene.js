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
   * tr-TR sesleri arasından en kalitelisi: 1) Enhanced / Gelişmiş / Premium (iOS Yelda / Cem Enhanced), 2) iOS sistem sesi Yelda / Cem,
   * 3) Google Türkçe (Android / Chrome, ağ / neural), 4) Edge «Online (Natural)», 5) herhangi bir tr ses (varsayılan / cihaz üstü önce). eSpeak en sona. */
  /* Siri sesleri (getVoices() içinde görünürse; iOS Safari'nin bunları verip vermediği varsayılmaz — ne gelirse listelenir) */
  /* Geliştirilmiş ses işaretleri: iOS adı yerelleştirir («Yelda (Gelişmiş)», «Yelda (Geliştirilmiş)», «Yelda (Enhanced)»);
     voiceURI'de «enhanced» / «premium» (com.apple.voice.enhanced.tr-TR.Yelda · eski iOS com.apple.ttsbundle.Yelda-premium) */
  var ENH_RE = /enhanced|premium|gelişmiş|gelismis|geliştirilmiş|gelistirilmis|iyileştirilmiş|yüksek kalite|high quality/i;
  /** Kalite katmanı: 3 Premium · 2 Geliştirilmiş · 1 standart · 0 compact */
  function voiceTier(v) {
    var n = String((v && v.name) || '') + ' ' + String((v && v.voiceURI) || '');
    if (/premium/i.test(n)) return 3;
    if (ENH_RE.test(n)) return 2;
    if (/compact/i.test(n)) return 0;
    return 1;
  }
  function isSiri(v) { var n = String((v && v.name) || ''), u = String((v && v.voiceURI) || ''); return /siri/i.test(n + ' ' + u) || /^(ses|voice)\s*\d+$/i.test(n.trim()); }
  function voiceRank(v) {
    if (!v) return -999;
    var n = String(v.name || '') + ' ' + String(v.voiceURI || ''), r = 0;
    if (isSiri(v)) r += 120; /* Siri görünürse: Geliştirilmiş Cem/Yelda'dan sonra, standart seslerden önce */
    if (ENH_RE.test(n)) r += 100;
    if (/premium/i.test(n)) r += 10; /* Premium > Geliştirilmiş > standart > compact */
    if (/google/i.test(n)) r += 60 + (v.localService === false ? 5 : 0);
    if (/natural|neural/i.test(n)) r += 55;
    if (/yelda|\bcem\b/i.test(n)) r += 70;
    if (v['default']) r += 3;
    if (v.localService) r += 2; /* çevrimdışı da çalışır */
    if (/^tr[-_]TR$/i.test(v.lang || '')) r += 1;
    if (/espeak/i.test(n)) r -= 40;
    if (/compact/i.test(n)) r -= 5; /* iOS «compact» Yelda/Cem yine Google'dan önce gelir */
    return r;
  }
  function sortTrVoices(list) {
    return (list || []).filter(function (v) { return v && /^tr([-_]|$)/i.test(String(v.lang || '')); })
      .sort(function (a, b) { return voiceRank(b) - voiceRank(a) || String(a.name).localeCompare(String(b.name)); });
  }
  /** Ses ailesi: aynı sesin standart / Geliştirilmiş / sıkıştırılmış sürümleri tek aile (iOS «com.apple.voice.enhanced.tr-TR.Cem» → «cem»). */
  function voiceFamily(v) {
    var u = String((v && v.voiceURI) || ''), m = /com\.apple\.[a-z.]*?\.(?:compact|enhanced|premium|super-compact|eloquence)?\.?[a-z]{2}[-_][a-z]{2}\.([^.\s]+)$/i.exec(u);
    if (m) return m[1].toLocaleLowerCase('tr');
    var tb = /com\.apple\.ttsbundle\.(?:siri_)?([^-_.\s]+)[-_](?:compact|premium|enhanced)/i.exec(u);
    if (tb) return tb[1].toLocaleLowerCase('tr');
    return String((v && v.name) || u).replace(/\s*\([^)]*\)\s*$/, ' ').replace(/\s*\((enhanced|premium|compact|gelişmiş|geliştirilmiş|yüksek kalite|high quality)\)\s*/ig, ' ').replace(/\b(enhanced|premium|compact)\b/ig, ' ').replace(/\s+/g, ' ').trim().toLocaleLowerCase('tr');
  }
  /** Her aileden yalnız en iyi sürüm (Geliştirilmiş varsa o, yoksa standart) — listede tek Cem, tek Yelda. */
  function uniqueTrVoices(list) {
    var seen = {};
    var l = sortTrVoices(list), best = {};
    l.forEach(function (v) { var f = voiceFamily(v), c = best[f]; if (!c || voiceTier(v) > voiceTier(c)) best[f] = v; });
    return l.filter(function (v) { var f = voiceFamily(v); if (seen[f] || best[f] !== v) return false; seen[f] = true; return true; });
  }
  /** Kayıtlı kimlikten ses ailesi: listede varsa o sesin ailesi; yoksa kimliğin kendisinden (voiceURI / ad / Ali · Petek). */
  function familyOfId(id, list) {
    id = String(id || ''); if (!id) return '';
    var l = list || [];
    for (var i = 0; i < l.length; i++) if (l[i] && (l[i].voiceURI === id || l[i].name === id)) return voiceFamily(l[i]);
    if (/^ali$/i.test(id)) return 'cem';
    if (/^petek$/i.test(id)) return 'yelda';
    return voiceFamily({ name: id, voiceURI: id });
  }
  /** Bir ailenin en iyi sürümü: Premium > Geliştirilmiş > standart > compact; eşitse tr-TR ve sıralama. */
  function bestOfFamily(list, fam) {
    var same = sortTrVoices(list).filter(function (v) { return voiceFamily(v) === fam; });
    same.sort(function (a, b) { return (voiceTier(b) - voiceTier(a)) || ((/^tr[-_]TR$/i.test(b.lang || '') ? 1 : 0) - (/^tr[-_]TR$/i.test(a.lang || '') ? 1 : 0)) || (voiceRank(b) - voiceRank(a)); });
    return same[0] || null;
  }
  /** Her konuşmada yeniden çözülür: kayıtlı seçimin AİLESİ (Ali = Cem, Petek = Yelda) cihazda varsa o ailenin en iyi sürümü
   *  (sonradan Geliştirilmiş indirildiyse o; kayıtlı compact voiceURI sabitlenmez). Aile yoksa en kaliteli tr ses; hiç yoksa null. */
  function bestTrVoice(list, savedId) {
    var u = uniqueTrVoices(list);
    if (savedId) { var f = familyOfId(savedId, list), b = f ? bestOfFamily(list, f) : null; if (b) return b; }
    return u[0] || null;
  }

  /* ---------------- Seslendirme metni (saf): emoji / sembol atılır, birimler okunur ---------------- */
  var EMOJI = /[\u{1F000}-\u{1FAFF}\u{2190}-\u{21FF}\u{2300}-\u{23FF}\u{2460}-\u{24FF}\u{25A0}-\u{27BF}\u{2900}-\u{297F}\u{2B00}-\u{2BFF}\u{3030}\u{303D}\u{FE0F}\u{200D}\u{20E3}]/gu;
  function speechText(t) {
    var s = String(t == null ? '' : t);
    s = s.replace(EMOJI, ' ').replace(/[✓✔✗✘•▪◦●○■□►▶◀▲▼★☆]/g, ' ');
    s = s.replace(/₺\s*(\d[\d.,]*)/g, '$1 lira').replace(/(\d)\s*₺/g, '$1 lira').replace(/₺/g, ' lira ').replace(/(^|[^A-Za-zÇĞİÖŞÜçğıöşü])TL(?![A-Za-zÇĞİÖŞÜçğıöşü0-9])/g, '$1lira');
    s = s.replace(/%\s*(\d+(?:[.,]\d+)?)/g, 'yüzde $1').replace(/(\d+(?:[.,]\d+)?)\s*%/g, 'yüzde $1').replace(/%/g, ' yüzde ');
    s = s.replace(/(\d)\s*kg(?![A-Za-zÇĞİÖŞÜçğıöşü0-9])/gi, '$1 kilogram').replace(/(^|[^A-Za-zÇĞİÖŞÜçğıöşü])kg(?![A-Za-zÇĞİÖŞÜçğıöşü0-9])/gi, '$1kilogram');
    s = s.replace(/(\d)\s*L(?![A-Za-zÇĞİÖŞÜçğıöşü0-9])/g, '$1 litre').replace(/(\d)\s*ml(?![A-Za-zÇĞİÖŞÜçğıöşü0-9])/gi, '$1 mililitre').replace(/(\d)\s*g(?![A-Za-zÇĞİÖŞÜçğıöşü0-9])/g, '$1 gram');
    s = s.replace(/(\d)\s*°\s*C(?![A-Za-zÇĞİÖŞÜçğıöşü0-9])/g, '$1 derece').replace(/°/g, ' derece ').replace(/(\d)\s*cm(?![A-Za-zÇĞİÖŞÜçğıöşü0-9])/g, '$1 santimetre').replace(/(\d)\s*mm(?![A-Za-zÇĞİÖŞÜçğıöşü0-9])/g, '$1 milimetre');
    s = s.replace(/(^|[^\d])2\s*:\s*1(?![\d])/g, '$1ikiye bir').replace(/(^|[^\d])1\s*:\s*1(?![\d])/g, '$1bire bir');
    s = s.replace(/½/g, 'yarım').replace(/≈|~/g, ' yaklaşık ').replace(/×/g, ' çarpı ').replace(/≥/g, ' en az ').replace(/≤/g, ' en çok ').replace(/(\s)\+(\s)/g, '$1ve$2');
    s = s.replace(/\s*[·›»«|]\s*/g, ', ').replace(/\s+[—–-]\s+/g, ', ').replace(/\s\/\s/g, ' ya da ').replace(/[“”"*_#<>\[\]{}]/g, ' ');
    s = s.replace(/\s+/g, ' ').replace(/\(\s+/g, '(').replace(/\s+\)/g, ')').replace(/\(\s*\)/g, ' ').replace(/\s+([,.!?;:])/g, '$1').replace(/([,;:])(?:\s*[,;:])+/g, '$1').replace(/^[\s,.;:]+|[\s,;:]+$/g, '');
    return s;
  }

  /* ---- Uygulamanın kendi ses adları: TEK tablo (sistem adı «Yelda / Cem / Ses 1» gösterilmez).
     Cihaz sesleri: Cem → Ali, Yelda → Petek (aile başına tek; Geliştirilmiş varsa o). «Sinan» ve «Çiçek» ileride eklenecek
     bulut / hazır kayıt sesleri için AYRILDI (cihaz seslerine verilmez). Tabloda olmayan cihaz sesleri (Google, Siri, Edge, Android…)
     kalite sırasına (eşitse voiceURI) göre yedek adları sırayla alır. ---- */
  var VOICE_NICKS = [
    { test: /\bcem\b/i, nick: 'Ali', g: 'erkek' },     /* Apple Cem (Geliştirilmiş varsa o) */
    { test: /yelda/i, nick: 'Petek', g: 'kadın' }      /* Apple Yelda (Geliştirilmiş varsa o) */
  ];
  var RESERVED_NICKS = ['Sinan', 'Çiçek']; /* bulut / MP3 kaynakları için */
  var VOICE_SPARE = ['Polen', 'Nektar', 'Yonca', 'Kekik', 'Melisa', 'Adaçayı', 'Gülhatmi', 'Kovan'];
  function voiceKey(v) { return String((v && (v.voiceURI || v.name)) || ''); }
  /** { nick, g, siri } — list (cihazın tr sesleri) verilirse aile başına tek ses üzerinden adlar sabitlenir; aynı ad ikinci kez çıkarsa « 2» eklenir. */
  function voiceNick(v, list) {
    if (!v) return { nick: 'Türkçe ses', g: '', siri: false };
    var fam = voiceFamily(v), all = uniqueTrVoices((list && list.length ? list : []).concat([v]));
    function base(x) {
      var nm = String(x.name || '').trim(), n = nm + ' ' + String(x.voiceURI || '');
      for (var i = 0; i < VOICE_NICKS.length; i++) if (VOICE_NICKS[i].test.test(nm) || VOICE_NICKS[i].test.test(n)) return { nick: VOICE_NICKS[i].nick, g: VOICE_NICKS[i].g };
      return null;
    }
    var sorted = all.slice().sort(function (a, b) { return voiceRank(b) - voiceRank(a) || (voiceKey(a) < voiceKey(b) ? -1 : (voiceKey(a) > voiceKey(b) ? 1 : 0)); }), spare = 0, used = {}, out = null;
    sorted.forEach(function (x) {
      var b = base(x) || { nick: VOICE_SPARE[spare % VOICE_SPARE.length] + (spare >= VOICE_SPARE.length ? ' ' + (Math.floor(spare / VOICE_SPARE.length) + 1) : ''), g: '', spare: true };
      if (b.spare) spare++;
      used[b.nick] = (used[b.nick] || 0) + 1; if (used[b.nick] > 1) b = { nick: b.nick + ' ' + used[b.nick], g: b.g };
      if (voiceFamily(x) === fam) out = { nick: b.nick, g: b.g, siri: isSiri(x) };
    });
    return out || { nick: 'Türkçe ses', g: '', siri: isSiri(v) };
  }
  function isEnhanced(v) { return voiceTier(v) >= 2; }
  /* ---- Ses KAYNAĞI bağımsız seçenek modeli: { id, source, nick, g, rank, enh, siri, natural, ref } ----
     source 'device' = cihaz sesi (speechSynthesis). İleride 'mp3' (hazır kayıt) / bulut kaynakları aynı modelle eklenir. */
  function deviceOptions(list) {
    var raw = list || [];
    return uniqueTrVoices(raw).map(function (v) {
      var nk = voiceNick(v, raw), r = voiceRank(v);
      return { id: voiceKey(v), source: 'device', nick: nk.nick, g: nk.g, siri: nk.siri, enh: isEnhanced(v), natural: r >= 55 && /natural|neural/i.test(String(v.name)), rank: r, ref: v };
    });
  }
  function optionTags(o, best) { return [o.siri ? 'Siri' : '', o.g, o.enh ? 'Geliştirilmiş' : '', o.natural ? 'doğal' : '', o.source !== 'device' && o.sourceLabel ? o.sourceLabel : '', best && o.id === best.id ? 'önerilen' : ''].filter(Boolean).join(' · '); }

  var API = { voiceTier: voiceTier, familyOfId: familyOfId, bestOfFamily: bestOfFamily, voiceNick: voiceNick, isSiri: isSiri, VOICE_NICKS: VOICE_NICKS, RESERVED_NICKS: RESERVED_NICKS, voiceFamily: voiceFamily, uniqueTrVoices: uniqueTrVoices, deviceOptions: deviceOptions, optionTags: optionTags, speechText: speechText, parse: parse, parseNumber: parseNumber, numbers: numbers, parseFrames: parseFrames, matchOption: matchOption, fold: fold, voiceRank: voiceRank, sortTrVoices: sortTrVoices, bestTrVoice: bestTrVoice };
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
    '.kv-voices{display:grid;gap:6px;background:#3a2515;border-radius:10px;padding:8px;}.kv-voices[hidden]{display:none;}.kv-voices label{display:grid;gap:4px;font-size:12px;color:#f3e2c8;font-weight:700;}' +
    '.kv-voices select{font:inherit;font-size:14px;border-radius:8px;padding:8px;max-width:100%;min-width:0;}.kv-voices button{justify-self:start;font:inherit;font-size:14px;font-weight:800;border-radius:10px;padding:8px 12px;border:1px solid #f3e2c8;background:transparent;color:#fff;min-height:40px;}' +
    '.km-voice.unsup{background:#fff4e6;color:#8a4b00;border-bottom:1px solid #ffd8a8;font-size:14px;}';
  function ensureCss() { if (document.getElementById('kvCss')) return; var s = document.createElement('style'); s.id = 'kvCss'; s.textContent = css; document.head.appendChild(s); }
  var active = null;
  /* ---- Ses seçimi: cihazdaki en doğal Türkçe ses (ücretsiz, cihaz üstü) ---- */
  var VOICE_KEY = 'superari.sesleSes.v1';
  /* Ayarlar › Ses seçimi: hız (cihaza özgü; sesler cihazdan cihaza değiştiği için bulut yerine bu cihazda saklanır) */
  var RATE_KEY = 'superari.sesleHiz.v1', RATES = { yavas: 0.85, normal: 1.12, hizli: 1.28 };
  function rateKey() { try { var k = localStorage.getItem(RATE_KEY) || 'normal'; return RATES[k] ? k : 'normal'; } catch (e) { return 'normal'; } }
  function setRate(k) { try { if (RATES[k] && k !== 'normal') localStorage.setItem(RATE_KEY, k); else localStorage.removeItem(RATE_KEY); } catch (e) { /* ignore */ } }
  function setVoice(id) { try { if (id) localStorage.setItem(VOICE_KEY, id); else localStorage.removeItem(VOICE_KEY); } catch (e) { /* ignore */ } }
  function trVoices() {
    var vs = []; try { vs = global.speechSynthesis.getVoices() || []; } catch (e) { vs = []; }
    if (vs.length) voiceCache = vs; else vs = voiceCache; /* iOS: sesler geç yüklenir → son bilinen liste */
    return sortTrVoices(vs);
  }
  function savedVoiceId() { try { return localStorage.getItem(VOICE_KEY) || ''; } catch (e) { return ''; } }
  function trVoice() { return bestTrVoice(trVoices(), savedVoiceId()); }
  /* ---- Ses kaynakları (kaynak bağımsız): 'device' yerleşik; addVoiceSource ile hazır kayıt (MP3) / bulut kaynağı eklenebilir.
     Kaynak: { label, options() → [seçenek], speak(seçenek, temizMetin, bitti) → true (çaldı) | false (bu metin yok → cihaz sesine düş) }.
     Cihaz dışı seçenek kimliği «kaynak:kimlik» biçimindedir (localStorage'da aynı anahtar). Şimdilik yalnız cihaz sesleri kayıtlı. ---- */
  var SOURCES = { device: { label: 'Cihaz sesi', options: function () { return deviceOptions(trVoices()); }, speak: null } };
  function addVoiceSource(key, impl) { if (key && key !== 'device' && impl && impl.options) SOURCES[key] = impl; }
  function voiceOptions() {
    var out = [];
    Object.keys(SOURCES).forEach(function (k) {
      var src = SOURCES[k], l = []; try { l = src.options() || []; } catch (e) { l = []; }
      l.forEach(function (o) { if (k !== 'device') { o.source = k; if (String(o.id).indexOf(k + ':') !== 0) o.id = k + ':' + o.id; o.sourceLabel = o.sourceLabel || src.label; } out.push(o); });
    });
    return out.sort(function (a, b) { return (b.rank || 0) - (a.rank || 0); });
  }
  /** Seçili seçenek: cihaz dışı kaynakta tam kimlik; cihaz sesinde kayıtlı seçimin AİLESİNİN en iyi sürümü (her çağrıda yeniden
   *  çözülür — eski compact voiceURI sabitlenmez); kayıt yoksa / aile cihazda yoksa en iyi seçenek. */
  function currentOption(opts) {
    var l = opts || voiceOptions(), id = savedVoiceId(); if (!l.length) return null;
    if (id) {
      for (var i = 0; i < l.length; i++) if (l[i].id === id && l[i].source !== 'device') return l[i];
      var all = trVoices(), f = familyOfId(id, all), v = f ? bestOfFamily(all, f) : null;
      if (v) {
        for (var j = 0; j < l.length; j++) if (l[j].source === 'device' && l[j].ref && voiceFamily(l[j].ref) === f) return l[j]; /* liste zaten aile başına en iyi sürümü taşır; konuşmada resolveDevice yeniden çözer */
      }
    }
    return l[0];
  }
  /** Konuşma anında kullanılacak gerçek cihaz sesi (Ayarlar › Ses seçimi «Kullanılan:» satırı için). */
  function activeVoice() {
    var o = currentOption(); if (!o || o.source !== 'device' || !o.ref) return null;
    var v = resolveDevice(o), t = voiceTier(v), nm = String(v.name || '').trim();
    var label = nm + (t >= 2 && !/\(/.test(nm) ? (t === 3 ? ' (Premium)' : ' (Gelişmiş)') : '');
    var fam = voiceFamily(v), apple = /com\.apple|yelda|\bcem\b/i.test(String(v.voiceURI || '') + ' ' + nm);
    return { voice: v, nick: o.nick, name: label, tier: t, enhanced: t >= 2, apple: apple, family: fam };
  }
  /** Seçenek → konuşma anındaki güncel ses nesnesi (iOS: getVoices() her çağrıda yeni nesne verebilir; eski nesne yok sayılabilir). */
  function resolveDevice(opt) {
    var all = trVoices(), f = opt && opt.ref ? voiceFamily(opt.ref) : '';
    return (f && bestOfFamily(all, f)) || (opt && opt.ref) || null;
  }
  /** Hazır kayıt (MP3) kaynağı iskeleti — örnek: addVoiceSource('mp3', mp3Source({ label: 'Hazır kayıt', voices: [{ id: 'sinan', nick: 'Sinan', g: 'erkek', rank: 300,
   *  base: 'ses/sinan/', clips: { 'kovan 12. varroa sayısını söyleyin.': 'demo.mp3' } }] })). Kaydı olmayan cümle cihaz sesiyle okunur. */
  function mp3Source(cfg) {
    cfg = cfg || {};
    var norm = function (t) { return String(t || '').toLocaleLowerCase('tr').replace(/\s+/g, ' ').trim(); };
    return { label: cfg.label || 'Hazır kayıt',
      options: function () { return (cfg.voices || []).map(function (v) { return { id: v.id, nick: v.nick, g: v.g || '', rank: v.rank != null ? v.rank : 300, voice: v }; }); },
      speak: function (opt, text, done) {
        var v = opt.voice || {}, f = v.clips && (v.clips[norm(text)] || v.clips[text]); if (!f || !global.Audio) return false;
        try { var a = new global.Audio(String(v.base || '') + f); a.onended = done; a.onerror = done; a.play().catch(done); return true; } catch (e) { return false; }
      } };
  }
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
  function utter(text, o) {
    o = o || {};
    var u = new global.SpeechSynthesisUtterance(speechText(text)); u.lang = 'tr-TR'; u.rate = RATES[o.rate] || RATES[rateKey()]; u.pitch = 1.0;
    var v = o.voice || trVoice(); if (v) { u.voice = v; u.lang = /^tr/i.test(v.lang) ? v.lang.replace('_', '-') : 'tr-TR'; }
    return u;
  }
  /** TEK seslendirme yardımcısı (Sesle muayene + öneri kartları): metin temizlenir, lang tr-TR, en iyi tr ses.
   *  iOS'ta sesler geç yüklenir: liste boşsa sessiz bir «kilit açma» konuşması yapılır ve voiceschanged en çok 1,2 sn beklenir.
   *  o.onend bir kez çağrılır (bitiş / hata / güvenlik süresi). */
  var voicesWaited = false, enhWaited = false;
  /* ---- İlk kullanımda ses seçimi: «Hangi sesi kullanalım?» (eldiven boyu; bir kez sorulur) ---- */
  var ASKED_KEY = 'superari.sesleSesSoruldu.v1', DEMO = 'Kovan 12. Varroa sayısını söyleyin. Etiket dozu: kovan başına iki şerit.';
  function asked() { try { return !!localStorage.getItem(ASKED_KEY); } catch (e) { return true; } }
  function markAsked() { try { localStorage.setItem(ASKED_KEY, new Date().toISOString().slice(0, 10)); } catch (e) { /* ignore */ } }
  function askPending() { return !!(global.speechSynthesis && global.document && document.body && !savedVoiceId() && !asked()); }
  var gate = null;
  function waitVoices(ms) {
    return new Promise(function (res) {
      if (trVoices().length) { res(); return; }
      var syn = global.speechSynthesis, done = false, fin = function () { if (done) return; done = true; try { syn.removeEventListener('voiceschanged', fin); } catch (e) { /* ignore */ } res(); };
      try { syn.addEventListener('voiceschanged', fin); } catch (e) { /* ignore */ }
      setTimeout(fin, ms || 1200);
    });
  }
  /** Geriye uyum: cihaz sesi için görünen ad / etiketler (uygulamanın takma adı; sistem adı gösterilmez). */
  function voiceLabel(v, best, list) {
    var L0 = list || trVoices(), nk = voiceNick(v, L0), r = voiceRank(v);
    return { name: nk.nick, g: nk.g, siri: nk.siri, enh: isEnhanced(v), best: !!best && voiceFamily(v) === voiceFamily(best), natural: r >= 55 && /natural|neural/i.test(v.name) };
  }
  function voiceTags(L) { return [L.siri ? 'Siri' : '', L.g, L.enh ? 'Geliştirilmiş' : '', L.natural ? 'doğal' : '', L.best ? 'önerilen' : ''].filter(Boolean).join(' · '); }
  /** Geliştirilmiş Türkçe ses yüklü değilse (Apple cihaz) kısa indirme notu gösterilir. */
  var ENH_PATH = 'Ayarlar › Erişilebilirlik › Sözlü İçerik › Sesler › Türkçe';
  var ENH_NOTE = 'Daha doğal ses için iPhone ' + ENH_PATH + '’den Cem / Yelda (Gelişmiş) sürümünü indirin.';
  function needEnhNote(list) {
    var L = list || trVoices(), apple = L.some(function (v) { return /com\.apple|yelda|\bcem\b/i.test(String(v.voiceURI || '') + ' ' + String(v.name || '')); }) || /iPhone|iPad|Macintosh/.test(String((global.navigator || {}).userAgent || ''));
    return apple && !L.some(isEnhanced);
  }
  /** Ses seçilmemişse bir kez sorar (birden çok seçenek varsa ya da Geliştirilmiş ses notu gerekiyorsa); Promise seçim / otomatik ile çözülür. */
  function ensureVoice() {
    if (!askPending()) return Promise.resolve();
    if (gate) return gate;
    gate = waitVoices(1200).then(function () {
      var opts = voiceOptions();
      if (!opts.length || (opts.length === 1 && !needEnhNote())) { markAsked(); return; } /* seçilecek / önerilecek bir şey yok */
      return new Promise(function (res) { showPicker(opts, res); });
    }).then(function () { gate = null; }, function () { gate = null; });
    return gate;
  }
  function showPicker(opts, done) {
    var best = opts[0], sel = best;
    if (!document.getElementById('kvPickCss')) {
      var cs = document.createElement('style'); cs.id = 'kvPickCss';
      cs.textContent = '.kvp-back{position:fixed;inset:0;z-index:2147483000;background:rgba(30,18,8,.55);display:flex;align-items:flex-end;justify-content:center;}' +
        '.kvp{background:#fffaf2;width:100%;max-width:560px;max-height:100%;overflow:auto;border-radius:20px 20px 0 0;padding:16px 14px calc(16px + env(safe-area-inset-bottom));display:grid;gap:12px;box-sizing:border-box;font-family:inherit;color:#2a1a0e;}' +
        '.kvp h2{margin:0;font-size:22px;}.kvp p{margin:0;font-size:15px;line-height:1.4;color:#5c4632;}' +
        '.kvp-v{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:10px;width:100%;min-height:72px;border-radius:16px;border:2px solid #d8c4a4;background:#fff;font:inherit;font-size:19px;font-weight:800;color:#2a1a0e;text-align:left;padding:10px 14px;cursor:pointer;box-sizing:border-box;}' +
        '.kvp-v small{display:block;font-size:14px;font-weight:700;color:#7a6048;margin-top:2px;}.kvp-v .pl{font-size:15px;font-weight:800;color:#1c5fa8;white-space:nowrap;}' +
        '.kvp .kvp-note{font-size:14px;color:#1c4f80;background:#e7f5ff;border-radius:12px;padding:8px 10px;}.kvp-v.on{border-color:#e56f1c;background:#fff1de;box-shadow:inset 0 0 0 1px #e56f1c;}' +
        '.kvp-ok{min-height:72px;border-radius:16px;border:0;background:#e56f1c;color:#fff;font:inherit;font-size:21px;font-weight:900;cursor:pointer;}' +
        '.kvp-auto{min-height:64px;border-radius:16px;border:2px solid #b8a386;background:#fff;color:#2a1a0e;font:inherit;font-size:17px;font-weight:800;cursor:pointer;}';
      document.head.appendChild(cs);
    }
    var back = document.createElement('div'); back.className = 'kvp-back'; back.id = 'kvPick';
    function row(o, i) {
      var tags = optionTags(o, best), on = o === sel;
      return '<button type="button" class="kvp-v' + (on ? ' on' : '') + '" data-kvp="' + i + '" aria-pressed="' + on + '"><span>' + (on ? '✓ ' : '') + esc(o.nick) + (tags ? '<small>' + esc(tags) + '</small>' : '') + '</span><span class="pl">▶ dinle</span></button>';
    }
    function draw() {
      back.innerHTML = '<div class="kvp" role="dialog" aria-modal="true" aria-label="Hangi sesi kullanalım?"><h2>🔊 Hangi sesi kullanalım?</h2><p>Dokununca kısa bir cümle okunur. Beğendiğinizi seçip «Bunu kullan»a basın. Sonra Ayarlar › Ses seçimi’nden değiştirebilirsiniz.</p>' + (needEnhNote() ? '<p class="kvp-note">ℹ️ ' + esc(ENH_NOTE) + '</p>' : '') +
        opts.map(row).join('') + '<button type="button" class="kvp-ok" data-kvp-ok>✓ Bunu kullan</button><button type="button" class="kvp-auto" data-kvp-auto>Otomatik seçsin (önerilen ses)</button></div>';
    }
    draw();
    document.body.appendChild(back);
    function close(id) { if (id !== undefined) setVoice(id); markAsked(); try { global.speechSynthesis.cancel(); } catch (e) { /* ignore */ } back.remove(); done(); }
    back.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('button') : null; if (!b) return;
      if (b.hasAttribute('data-kvp')) { sel = opts[Number(b.getAttribute('data-kvp'))]; draw(); speakTr(DEMO, { voice: sel, noGate: true }); return; }
      if (b.hasAttribute('data-kvp-ok')) { close(sel.id); return; }
      if (b.hasAttribute('data-kvp-auto')) { close(undefined); }
    });
  }
  function speakTr(text, o) {
    o = o || {};
    /* ilk sesli kullanımda (ses seçilmemişse) önce «Hangi sesi kullanalım?» — seçim bitince konuşur */
    if (!o.voice && !o.noGate && askPending()) { ensureVoice().then(function () { speakTr(text, Object.assign({}, o, { noGate: true })); }); return; }
    var syn = global.speechSynthesis, ended = false, timer = null;
    function end() { if (ended) return; ended = true; if (timer) clearTimeout(timer); if (o.onend) o.onend(); }
    var clean = speechText(text);
    /* seçenek çöz: o.voice = seçenek ({source}) | SpeechSynthesisVoice | yok → kayıtlı / en iyi seçenek */
    var opt = o.voice && o.voice.source ? o.voice : (o.voice ? null : currentOption());
    if (opt && opt.source !== 'device' && SOURCES[opt.source] && SOURCES[opt.source].speak && clean) {
      try { if (syn) syn.cancel(); } catch (e) { /* ignore */ }
      var played = false; try { played = SOURCES[opt.source].speak(opt, clean, end); } catch (e) { played = false; }
      if (played) { timer = setTimeout(end, 30000); return; }
      opt = null; /* bu cümlenin kaydı yok → cihaz sesi */
    }
    if (opt && opt.source === 'device') o = Object.assign({}, o, { voice: resolveDevice(opt) });
    else if (o.voice && o.voice.source) o = Object.assign({}, o, { voice: null });
    if (!syn || !global.SpeechSynthesisUtterance || !clean) { setTimeout(end, 0); return; }
    function go(extra) {
      try { syn.cancel(); } catch (e) { /* ignore */ }
      var u; try { u = utter(clean, o); } catch (e) { end(); return; }
      u.onend = end; u.onerror = end;
      try { syn.speak(u); } catch (e) { end(); return; }
      timer = setTimeout(end, Math.min(25000, 2000 + clean.length * 90 + (extra || 0))); /* onend gelmezse */
    }
    /* iOS: Geliştirilmiş sesler listeye geç düşebilir — seçili ailenin Geliştirilmiş sürümü henüz yoksa oturumda bir kez kısa bekle, sonra yeniden çöz */
    if (trVoices().length && !enhWaited && o.voice && !isEnhanced(o.voice) && /com\.apple|yelda|\bcem\b/i.test(String(o.voice.voiceURI || '') + ' ' + String(o.voice.name || ''))) {
      enhWaited = true;
      var fam0 = voiceFamily(o.voice), doneE = false;
      var goE = function () { if (doneE) return; doneE = true; try { syn.removeEventListener('voiceschanged', goE); } catch (e) { /* ignore */ } var b = bestOfFamily(trVoices(), fam0); if (b) o = Object.assign({}, o, { voice: b }); go(0); };
      try { syn.addEventListener('voiceschanged', goE); } catch (e) { /* ignore */ }
      setTimeout(goE, 700);
      return;
    }
    if (trVoices().length || voicesWaited) { go(0); return; }
    /* iOS: dokunuşla gelen ilk konuşmada sentezi aç (sessiz), sonra Türkçe sesi bekle */
    try { syn.cancel(); var w = new global.SpeechSynthesisUtterance(' '); w.volume = 0; w.lang = 'tr-TR'; syn.speak(w); } catch (e) { /* ignore */ }
    var fired = false, t0 = Date.now();
    function fire() {
      if (fired) return; fired = true; voicesWaited = true;
      try { if (syn.removeEventListener) syn.removeEventListener('voiceschanged', fire); } catch (e) { /* ignore */ }
      /* liste geldi → seçimi yeniden çöz (ilk çağrıda liste boşken ses atanamamıştı) */
      if (!o.voice || !o.voice.source) { var c = currentOption(); if (c && c.source === 'device') o = Object.assign({}, o, { voice: resolveDevice(c) }); }
      go(Date.now() - t0);
    }
    try { if (syn.addEventListener) syn.addEventListener('voiceschanged', fire); } catch (e) { /* ignore */ }
    setTimeout(fire, 1200);
  }
  function stopSpeech() { try { global.speechSynthesis.cancel(); } catch (e) { /* ignore */ } }
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
      '<p class="kv-help">Daha akıcı ses için — iPhone: ' + ENH_PATH + ' › «Yelda (Gelişmiş)» indirin. Android: Ayarlar › Metin okuma › Google TTS › Türkçe yüksek kalite sesi indirin. Sonra buradan seçin.</p></div>' +
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
      speakTr(text, { onend: function () { st.speaking = false; if (!st.on) return; if (then) then(); else listen(); } });
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
      var sel = $('vsel'), opts = voiceOptions(), cur = currentOption(opts);
      sel.innerHTML = opts.length ? opts.map(function (o) {
        var tg = optionTags(o, opts[0]); /* uygulamanın ses adı (sistem adı gösterilmez) */
        return '<option value="' + esc(o.id) + '"' + (cur && cur.id === o.id ? ' selected' : '') + '>' + esc(o.nick) + (tg ? ' · ' + esc(tg) : '') + '</option>';
      }).join('') : '<option value="">Cihazda Türkçe ses bulunamadı</option>';
    }
    $('vbtn').onclick = function () { var p = $('voices'); p.hidden = !p.hidden; if (!p.hidden) fillVoices(); };
    $('vsel').onchange = function () { try { localStorage.setItem(VOICE_KEY, this.value); } catch (e) { /* ignore */ } };
    $('vtest').onclick = function () {
      speakTr('Merhaba. Kovan yüz bir. Yavru düzeni nasıl? Düzenli mi, biraz boşluklu mu?');
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
  root.SuperAriSesle = { parse: parse, parseNumber: parseNumber, numbers: numbers, supported: supported, start: start, trVoices: trVoices, pickVoice: trVoice, voiceRank: voiceRank, speak: speakTr, ensureVoice: ensureVoice, DEMO: DEMO, voiceLabel: voiceLabel, voiceTags: voiceTags, needEnhNote: needEnhNote, ENH_NOTE: ENH_NOTE, voiceNick: voiceNick, voiceOptions: voiceOptions, currentOption: currentOption, activeVoice: activeVoice, ENH_PATH: ENH_PATH, optionTags: optionTags, addVoiceSource: addVoiceSource, mp3Source: mp3Source, RESERVED_NICKS: RESERVED_NICKS, stopSpeech: stopSpeech, speechText: speechText, savedVoiceId: savedVoiceId, setVoice: setVoice, rateKey: rateKey, setRate: setRate, RATES: RATES, stop: function () { if (active) active.stop(); } };
})(typeof window !== 'undefined' ? window : this);

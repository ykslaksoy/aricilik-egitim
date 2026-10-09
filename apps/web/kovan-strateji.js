/**
 * SüperArı — Kovan genişleme stratejisi (ilkbahar/yaz).
 * İlkbaharda kovan her zaman «kat açarak» güçlenmez: önce tek gövdede çerçeve,
 * alt gövde ~%75–80 dolunca 2. kat; güçlü kolonide bal katı / bölme / hibrit yol.
 * Depo: superari.kovanStrateji.v1 (canlı) / superari.kovanStrateji.demo.v1 (demo).
 */
(function (global) {
  'use strict';

  var GOALS = {
    bal: { id: 'bal', label: 'Bal hasadı öncelik', short: 'Bal öncelik', hint: 'Ekstra bal katı ve hasat odaklı genişleme.' },
    'ogul-onle': { id: 'ogul-onle', label: 'Oğul önleme', short: 'Oğul önle', hint: 'Yer açma, bölme ve ana yönetimi öncelikli.' },
    'koloni-artir': { id: 'koloni-artir', label: 'Koloni sayısını artır', short: 'Koloni artır', hint: 'Bölme ve yeni kovan hedefi.' },
    hibrit: { id: 'hibrit', label: 'Hibrit (iki yol)', short: 'Hibrit', hint: 'Güçlü kovanda hem bal katı hem bölme seçeneklerini göster.' }
  };

  var KEY_LIVE = 'superari.kovanStrateji.v1';
  var KEY_DEMO = 'superari.kovanStrateji.demo.v1';
  var CHOICE_KEY_LIVE = 'superari.kovanStrateji.secim.v1';
  var CHOICE_KEY_DEMO = 'superari.kovanStrateji.secim.demo.v1';

  function mode() {
    try { return global.localStorage && global.localStorage.getItem('superari.workMode') === 'live' ? 'live' : 'demo'; } catch (e) { return 'demo'; }
  }
  function stKey() { return mode() === 'live' ? KEY_LIVE : KEY_DEMO; }
  function choiceKey() { return mode() === 'live' ? CHOICE_KEY_LIVE : CHOICE_KEY_DEMO; }

  function defaultSt() {
    return { global: { goal: 'hibrit', seasonHiveTarget: null, honeyPriority: false }, apiaries: {} };
  }
  function loadSt() {
    var s;
    try { s = JSON.parse(global.localStorage.getItem(stKey()) || 'null'); } catch (e) { s = null; }
    if (!s || typeof s !== 'object') s = defaultSt();
    if (!s.global || typeof s.global !== 'object') s.global = defaultSt().global;
    if (!s.apiaries || typeof s.apiaries !== 'object') s.apiaries = {};
    if (!GOALS[s.global.goal]) s.global.goal = 'hibrit';
    return s;
  }
  function saveSt(s) {
    try { if (global.localStorage) global.localStorage.setItem(stKey(), JSON.stringify(s)); return true; } catch (e) { return false; }
  }

  function apiaryPrefs(apiaryId) {
    var s = loadSt(), ap = apiaryId ? s.apiaries[String(apiaryId)] : null;
    if (!ap || typeof ap !== 'object') ap = {};
    var goal = GOALS[ap.goal] ? ap.goal : (GOALS[s.global.goal] ? s.global.goal : 'hibrit');
    var seasonHiveTarget = ap.seasonHiveTarget != null ? ap.seasonHiveTarget : s.global.seasonHiveTarget;
    var honeyPriority = ap.honeyPriority != null ? !!ap.honeyPriority : !!s.global.honeyPriority;
    if (goal === 'bal') honeyPriority = true;
    return { goal: goal, seasonHiveTarget: seasonHiveTarget, honeyPriority: honeyPriority };
  }

  function getEffectiveGoal(apiaryId) { return apiaryPrefs(apiaryId).goal; }

  function setGlobalGoal(goal, extras) {
    var s = loadSt();
    if (GOALS[goal]) s.global.goal = goal;
    if (extras) {
      if (extras.seasonHiveTarget != null) s.global.seasonHiveTarget = extras.seasonHiveTarget === '' ? null : Number(extras.seasonHiveTarget);
      if (extras.honeyPriority != null) s.global.honeyPriority = !!extras.honeyPriority;
    }
    saveSt(s);
  }

  function setApiaryGoal(apiaryId, goal, extras) {
    if (!apiaryId) return;
    var s = loadSt(), id = String(apiaryId);
    if (!s.apiaries[id]) s.apiaries[id] = {};
    if (goal === '' || goal == null) delete s.apiaries[id].goal;
    else if (GOALS[goal]) s.apiaries[id].goal = goal;
    if (extras) {
      if (extras.seasonHiveTarget != null) {
        if (extras.seasonHiveTarget === '' || extras.seasonHiveTarget === null) delete s.apiaries[id].seasonHiveTarget;
        else s.apiaries[id].seasonHiveTarget = Number(extras.seasonHiveTarget);
      }
      if (extras.honeyPriority != null) s.apiaries[id].honeyPriority = !!extras.honeyPriority;
    }
    saveSt(s);
  }

  function seasonSummary(apiaryId) {
    var p = apiaryPrefs(apiaryId), g = GOALS[p.goal] || GOALS.hibrit, parts = [];
    parts.push('Hedef: ' + g.short);
    if (p.seasonHiveTarget != null && isFinite(p.seasonHiveTarget) && p.seasonHiveTarget > 0) parts.push('Bu sezon ' + Math.round(p.seasonHiveTarget) + ' kovan');
    if (p.honeyPriority) parts.push('Bal hasadı öncelik');
    return parts.join(' · ');
  }

  function loadChoices() {
    try { var v = JSON.parse(global.localStorage.getItem(choiceKey()) || '{}'); return v && typeof v === 'object' ? v : {}; } catch (e) { return {}; }
  }
  function saveChoice(hiveId, entry) {
    if (!hiveId) return;
    var all = loadChoices();
    all[String(hiveId)] = Object.assign({ at: new Date().toISOString().slice(0, 10) }, entry);
    try { global.localStorage.setItem(choiceKey(), JSON.stringify(all)); } catch (e) { /* ignore */ }
  }

  function pct(ratio) { return Math.round(ratio * 100); }

  function isStrong(ctx) {
    var bee = ctx.bee, ratio = ctx.ratio, kat = ctx.kat || 0, yer = ctx.yer, ogul = Number(ctx.ogul) || 0, meme = ctx.meme;
    if (bee == null) return false;
    if (ogul > 0 || meme === 'ogul') return true;
    if (yer === 'dolu' && kat >= 1) return true;
    if (kat >= 2 && ratio >= 0.7) return true;
    if (bee >= 12 && ratio >= 0.78) return true;
    if (bee >= 16 && kat >= 1) return true;
    return false;
  }

  function rankOptions(options, goal) {
    var order = {
      bal: ['kat_ekle', 'kat_rotasyon', 'cerceve', 'hibrit', 'bolme', 'yok'],
      'ogul-onle': ['bolme', 'cerceve', 'kat_ekle', 'kat_rotasyon', 'hibrit', 'yok'],
      'koloni-artir': ['bolme', 'hibrit', 'kat_ekle', 'kat_rotasyon', 'cerceve', 'yok'],
      hibrit: ['kat_ekle', 'kat_rotasyon', 'bolme', 'hibrit', 'cerceve', 'yok']
    }[goal] || ['kat_ekle', 'kat_rotasyon', 'bolme', 'hibrit', 'cerceve', 'yok'];
    return options.slice().sort(function (a, b) {
      var ia = order.indexOf(a.id), ib = order.indexOf(b.id);
      if (ia < 0) ia = 99; if (ib < 0) ib = 99;
      return ia - ib;
    });
  }

  /**
   * ctx: { seasonKey, bee, brood, body, kat, ratio, yer, ogul, meme, apiaryId, hiveId, goal? }
   */
  function recommendExpansion(ctx) {
    ctx = ctx || {};
    var sk = ctx.seasonKey || 'yaz';
    var growing = sk === 'ilkbahar' || sk === 'akim' || sk === 'yaz';
    if (!growing || ctx.bee == null) return { kind: null, options: [] };

    var bee = ctx.bee, body = ctx.body || 1, kat = ctx.kat || 0, ratio = ctx.ratio != null ? ctx.ratio : 0;
    var goal = ctx.goal || getEffectiveGoal(ctx.apiaryId);
    var banner = seasonSummary(ctx.apiaryId);
    var cap = 10 * (body + kat);
    var baseWhy = bee + ' arılı çerçeve · ' + cap + ' çerçeve yer · doluluk ~%' + pct(ratio);

    if (kat === 0 && ratio < 0.75) {
      return {
        kind: 'frames_early',
        recommendedId: 'cerceve',
        banner: banner,
        recLabel: 'Tek gövdede güçlendir: boş çerçeve / temel petek ver',
        why: baseWhy + '. İlkbaharda sık yol: önce tek gövdede çerçeve ekleyerek koloniyi güçlendirmek; bal katı genelde alt gövde dolunca (~%75–80) düşünülür.',
        say: 'Kovan güçleniyor. Önce tek gövdede boş çerçeve verin; bal katını alt dolunca düşünün.',
        options: []
      };
    }

    if (kat === 0 && ratio >= 0.75 && ratio < 0.88) {
      return {
        kind: 'first_super',
        recommendedId: 'kat_ekle',
        banner: banner,
        recLabel: 'Alt gövde dolmak üzere: 1. bal katı (veya 2. gövde) düşün',
        why: baseWhy + '. Alt kısım ~%75–80 dolulukta ikinci kat (bal katı) verilebilir; henüz tek gövdede çerçeve de ekleyebilirsiniz.',
        say: 'Alt gövde dolmak üzere. Önerim: bir bal katı verin veya boş çerçeve ekleyin.',
        options: [
          { id: 'kat_ekle', label: '1 bal katı verdim', say: ['kat', 'tamam'], detail: 'Yer açıldı, bal akımı için üst kat.' },
          { id: 'cerceve', label: '2 boş çerçeve / temel petek verdim', say: ['cerceve', 'bos'], detail: 'Önce gövde içinde genişleme.' },
          { id: 'yok', label: 'Şimdilik ekleme yapmadım', say: ['yok', 'sonra'], detail: 'Görevle takip.' }
        ]
      };
    }

    if (!isStrong(ctx) && (ctx.yer === 'dolu' || ratio >= 0.9)) {
      return {
        kind: 'kat_dar',
        recommendedId: 'kat_ekle',
        banner: banner,
        recLabel: kat ? '1 kat daha ekleyin (yer dar)' : '1 kat (bal katı) ekleyin — yer dar',
        why: baseWhy,
        say: 'Kovan dolu. Önerim: bir kat ekleyin veya boş çerçeve verin.',
        options: [
          { id: 'kat_ekle', label: '1 kat ekledim', say: ['kat', 'tamam'], detail: 'Üst kat ile yer açma.' },
          { id: 'cerceve', label: '2 boş çerçeve / temel petek verdim', say: ['cerceve', 'bos'], detail: 'Kat yerine gövde içi çerçeve.' },
          { id: 'yok', label: 'Şimdilik ekleme yapmadım (görev)', say: ['yok', 'sonra'], detail: 'Yakında tekrar bak.' }
        ]
      };
    }

    if (kat >= 2 && ratio >= 0.78 && isStrong(ctx)) {
      var shOpts = rankOptions([
          {
            id: 'kat_rotasyon',
            label: '2. katı aldım, 3. katı 2. sıraya koydum (rotasyon)',
            say: ['rotasyon', 'kat rotasyon'],
            why: 'Dolu 2. katı kaldırıp 3. katı araya yerleştirmek.',
            tradeoff: 'Artı: dolu kutu kontrolü, üstte boş kat. Eksi: işçilik; tartım şart.'
          },
          {
            id: 'kat_ekle',
            label: '3. katı üste ekledim (klasik istifleme)',
            say: ['kat', 'ust'],
            why: 'En yaygın yol: yeni kat en üste.',
            tradeoff: 'Artı: hızlı. Eksi: alttaki dolu kat hasat/taşıma zorluğu.'
          },
          { id: 'cerceve', label: 'Yalnız boş çerçeve verdim', say: ['cerceve'], why: 'Kat eklemeden yer açma.', tradeoff: 'Bal potansiyeli sınırlı kalabilir.' },
          { id: 'yok', label: 'Karar vermedim (görev)', say: ['yok'], why: 'Kısa süre içinde tekrar muayene.', tradeoff: 'Sıkışıklık sürebilir.' }
        ], goal);
      var shRec = shOpts[0] ? shOpts[0].id : 'kat_rotasyon';
      return {
        kind: 'super_shuffle',
        recommendedId: shRec,
        banner: banner,
        recLabel: '2. kat dolu: 3. katı üste koymadan önce rotasyon düşün',
        why: baseWhy + '\n2. bal katı dolunca bazı arıcılar 3. katı yalnızca üste istiflemek yerine 2. katı kaldırır, 3. katı 2. sıraya koyar — dolu kutu yönetimi ve hasat kolaylığı. Tartım sihirbazı ile önce/sonra kaydedin.',
        say: 'İkinci kat dolu. Üçüncü katı verecekseniz rotasyon veya üst üste istifleme seçebilirsiniz. Rotasyon için tartım önerilir.',
        options: shOpts
      };
    }

    if (isStrong(ctx) && (ratio >= 0.8 || ctx.yer === 'dolu' || ctx.yer === 'dolmak' || Number(ctx.ogul) > 0)) {
      var opts = [
        {
          id: 'kat_ekle',
          label: kat >= 2 ? '3. kat (bal) ekledim' : (kat >= 1 ? 'Bir kat daha ekledim (bal odaklı)' : 'Bal katı ekledim'),
          say: ['kat', 'bal'],
          why: 'Güçlü koloni bal akımını üst kata taşıyabilir.',
          tradeoff: 'Artı: daha fazla bal. Eksi: oğul riski artabilir, taşıma işi.'
        },
        {
          id: 'kat_rotasyon',
          label: '2. katı alıp 3. katı 2. sıraya koydum (rotasyon)',
          say: ['rotasyon', 'kat rotasyon'],
          why: 'Dolu katı kaldırıp yeni katı araya yerleştirmek (kutu rotasyonu).',
          tradeoff: 'Artı: dolu kutu yönetimi. Eksi: tartım ve işçilik gerekir.'
        },
        {
          id: 'bolme',
          label: 'Bölme yaptım / planlıyorum',
          say: ['bolme'],
          why: 'Koloniyi ikiye ayırarak oğul eğilimini yönetir, kovan sayısını artırır.',
          tradeoff: 'Artı: oğul önleme ve yeni kovan. Eksi: geçici güç kaybı, iki kovan bakımı.'
        },
        {
          id: 'hibrit',
          label: 'Hibrit: kat ver, akım sonrası böl',
          say: ['hibrit', 'sonra bolme'],
          why: 'Bal akımında üst katı doldurup sezon sonunda veya güçlü dönemde bölmek.',
          tradeoff: 'Artı: hem bal hem yeni kovan. Eksi: zamanlama ve takip ister.'
        },
        {
          id: 'cerceve',
          label: 'Yalnız boş çerçeve verdim (bölme/kat yok)',
          say: ['cerceve', 'bos'],
          why: 'Yer açarak oğul baskısını hafifletir, bal katı eklemeden genişletir.',
          tradeoff: 'Artı: daha az iş. Eksi: bal potansiyeli sınırlı kalabilir.'
        },
        {
          id: 'yok',
          label: 'Karar vermedim (görev)',
          say: ['yok', 'sonra'],
          why: 'Kısa süre içinde tekrar muayene.',
          tradeoff: 'Oğul veya sıkışıklık riski sürebilir.'
        }
      ];
      opts = rankOptions(opts, goal);
      var recId = opts[0] ? opts[0].id : 'kat_ekle';
      if (goal === 'koloni-artir' || goal === 'ogul-onle') recId = opts.filter(function (o) { return o.id === 'bolme'; })[0] ? 'bolme' : recId;
      var whyLines = opts.slice(0, 3).map(function (o) {
        return '• ' + o.label.split('(')[0].trim() + ': ' + (o.tradeoff || o.why);
      });
      return {
        kind: 'strategy',
        recommendedId: recId,
        banner: banner,
        recLabel: (GOALS[goal] || GOALS.hibrit).label + ' — güçlü koloni, yer baskısı',
        why: baseWhy + (banner ? '\n' + banner : '') + '\n' + whyLines.join('\n'),
        say: 'Koloniniz güçlü ve yer dar. Bal katı, bölme veya hibrit yol var. Hedefinize göre önerim: ' + (opts.filter(function (o) { return o.id === recId; })[0] || opts[0]).label + '.',
        options: opts
      };
    }

    if (ctx.yer === 'dolmak' || ratio >= 0.75) {
      return {
        kind: 'frames',
        recommendedId: 'cerceve',
        banner: banner,
        recLabel: 'Boş çerçeve / temel petek ver (dolmak üzere)',
        why: baseWhy,
        say: 'Kovan dolmak üzere. Boş çerçeve verin.',
        options: []
      };
    }

    return { kind: null, banner: banner, options: [] };
  }

  function followUpTasks(optionId) {
    switch (optionId) {
      case 'kat_ekle': return [{ title: 'Yeni kat / çerçeve doldu mu kontrol', days: 7, pri: 2 }];
      case 'kat_rotasyon': return [
        { title: 'Kat rotasyonu: önce/sonra tartım tamamlandı mı', days: 0, pri: 1 },
        { title: 'Rotasyon sonrası üst kat dolumu kontrol', days: 7, pri: 2 }
      ];
      case 'bolme': return [
        { title: 'Bölme: ana çıktı mı yumurta kontrolü', days: 21, pri: 2 },
        { title: 'Bölme sonrası besleme gerekir mi kontrol', days: 10, pri: 3 }
      ];
      case 'hibrit': return [
        { title: 'Hibrit plan: bal katı dolumu kontrol', days: 14, pri: 2 },
        { title: 'Hibrit plan: bölme zamanı değerlendir', days: 28, pri: 2 }
      ];
      case 'cerceve': return [{ title: 'Verilen çerçeveler işlendi mi bak', days: 7, pri: 3 }];
      case 'yok': return [{ title: 'Yer dar / genişleme kararı: tekrar muayene', days: 3, pri: 1 }];
      default: return [];
    }
  }

  var API = {
    GOALS: GOALS,
    mode: mode,
    loadSt: loadSt,
    saveSt: saveSt,
    getEffectiveGoal: getEffectiveGoal,
    apiaryPrefs: apiaryPrefs,
    setGlobalGoal: setGlobalGoal,
    setApiaryGoal: setApiaryGoal,
    seasonSummary: seasonSummary,
    recommendExpansion: recommendExpansion,
    followUpTasks: followUpTasks,
    saveChoice: saveChoice,
    isStrong: isStrong
  };

  if (typeof document === 'undefined') {
    if (typeof module !== 'undefined') module.exports = API;
    return;
  }
  global.SuperAriKovanStrateji = API;
})(typeof window !== 'undefined' ? window : this);

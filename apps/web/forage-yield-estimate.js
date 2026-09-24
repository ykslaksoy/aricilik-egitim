/**
 * Hedef bal (kg) tahmini + uyumsuz kovan / takas önerisi.
 *
 * Product formula (documented — «neden» breakdown mirrors these factors):
 *   S     = location suitability 0–100 (forage score; prefer recommended radius)
 *   Hprev = prior completed season harvest kg for this apiary (null if missing — never fabricate)
 *   n     = hive count
 *   Per hive: strengthFactor · healthFactor · breedFactor (defaults 1.0; all colonies Karniyol)
 *
 * Weights:
 *   W_HARVEST = 0.45 when Hprev known; else score+colony path only (weight 1.0)
 *
 * Score baseline kg/hive (beekeeper-facing; thin-data band ~20–35 kg):
 *   S≥80 → mid 33 (±5); S≥65 → 28 (±5); S≥50 → 24 (±4); S≥35 → 21 (±4); else → 18 (±4)
 *   When data thin (no Hprev / sparse colony): mid clamped into 20–35 kg.
 *
 * With harvest:
 *   priorPerHive = Hprev / max(n,1)
 *   locationFactor = clamp(0.7 + (S/100)*0.5, 0.75, 1.25)
 *   colonyAvg = avg(strength*health*breed) or 1.0
 *   waterFactor(waterDistanceM) — user-reported distance to local water (metres):
 *     null/missing → 1.0 (do not invent distance); site flagged waterUnsuitable
 *     ≤150 → 1.05; ≤500 → 1.02; ≤1000 → 1.0;
 *     ≤2000 → 0.95; ≤3000 → 0.88; >3000 → 0.82
 *   Karniyol breedFactor: cool/highland / cold-short → mild boost (≤1.08); else ~1.03
 *   factorProduct = clamp(locationFactor * colonyAvg * waterFactor, 0.5, 1.6)
 *   scoreProduct  = clamp(colonyAvg * waterFactor, 0.5, 1.5)
 *   blendedMid = W_HARVEST*(priorPerHive*factorProduct)
 *              + (1-W_HARVEST)*(scoreMid*scoreProduct)
 *   Without harvest: mid = scoreMid * scoreProduct
 *   range = mid ± max(4, mid*0.22)
 *
 * Label badge: «Yaklaşık»; su yoksa «yer uygun değil» uyarısı; «neden» faktör dökümü.
 */
(function (global) {
  var W_HARVEST = 0.45;
  var MIN_RADIUS_KM = 0.5;
  var MAX_RADIUS_KM = 10;

  function clamp(n, lo, hi) {
    n = Number(n);
    if (!isFinite(n)) return lo;
    return Math.max(lo, Math.min(hi, n));
  }

  function clampRadius(km) {
    var n = Number(km);
    if (!isFinite(n)) return 3;
    return Math.round(clamp(n, MIN_RADIUS_KM, MAX_RADIUS_KM) * 2) / 2;
  }

  /**
   * Approximate score as if analyzed at recommended radius (same raw, different
   * radiusFactor used inside SuperAriForage.scoreSpot). Avoids a second Open-Meteo
   * fetch when the user moved the manual forage slider.
   */
  function scoreAtRecommendedRadius(analysisScore, analysisRadiusKm, recommendedKm) {
    var S = Number(analysisScore);
    if (!isFinite(S)) return null;
    var cur = clampRadius(analysisRadiusKm);
    var rec = clampRadius(recommendedKm != null ? recommendedKm : cur);
    if (Math.abs(cur - rec) < 0.05) return Math.round(S);
    function rf(r) {
      return 0.92 + ((r - MIN_RADIUS_KM) / (MAX_RADIUS_KM - MIN_RADIUS_KM)) * 0.1;
    }
    var raw = S / rf(cur);
    return Math.round(clamp(raw * rf(rec), 18, 96));
  }

  function scoreBaseline(S) {
    S = Number(S) || 0;
    /* Realistic beekeeper band ~20–35 kg when site/colony data is thin. */
    if (S >= 80) return { mid: 33, half: 5 };
    if (S >= 65) return { mid: 28, half: 5 };
    if (S >= 50) return { mid: 24, half: 4 };
    if (S >= 35) return { mid: 21, half: 4 };
    return { mid: 18, half: 4 };
  }

  /** Thin-data realism: keep mid inside ~20–35 kg when harvest/colony sparse. */
  function clampThinBand(mid, thin) {
    mid = Number(mid);
    if (!isFinite(mid)) return mid;
    if (!thin) return mid;
    return Math.max(20, Math.min(35, mid));
  }

  /** Mid kg/hive from score bands — for tip % deltas (yaklaşık hedef farkı). */
  function midKgFromScore(S) {
    return scoreBaseline(S).mid;
  }

  /**
   * Relative hedef-bal improvement % from two suitability scores.
   * Returns null when improvement is too small to claim (&lt;8%).
   * Display clamped to 5–80.
   */
  function yieldPctFromScores(scoreHere, scoreBest) {
    var midHere = midKgFromScore(scoreHere);
    var midBest = midKgFromScore(scoreBest);
    var pct = Math.round(100 * (midBest - midHere) / Math.max(midHere, 1));
    if (!isFinite(pct) || pct < 8) return null;
    return Math.max(5, Math.min(80, pct));
  }

  function normalizeBreedKey(raw) {
    var s = String(raw || '')
      .toLocaleLowerCase('tr')
      .replace(/\s+/g, ' ')
      .trim();
    if (!s) return '';
    if (s.indexOf('kafkas') !== -1 && (s.indexOf('karn') !== -1 || s.indexOf('carn') !== -1)) {
      return 'kafkas_karniyol';
    }
    if (s.indexOf('karadeniz') !== -1 || s.indexOf('hybrid') !== -1 || s.indexOf('melez') !== -1) {
      if (s.indexOf('kafkas') !== -1) return 'kafkas_karadeniz';
      return 'karadeniz';
    }
    if (s.indexOf('kafkas') !== -1) return 'kafkas';
    if (s.indexOf('anadolu') !== -1 || s.indexOf('anatol') !== -1) return 'anadolu';
    if (s.indexOf('karniyol') !== -1 || s.indexOf('carniol') !== -1 || s.indexOf('carnica') !== -1) {
      return 'karniyol';
    }
    if (s.indexOf('italyan') !== -1 || s.indexOf('italian') !== -1 || s.indexOf('ligust') !== -1) {
      return 'italyan';
    }
    return s;
  }

  function classifySite(site) {
    site = site || {};
    var elev = site.elevM != null && isFinite(Number(site.elevM)) ? Number(site.elevM) : null;
    var temp = site.meanTempC != null && isFinite(Number(site.meanTempC)) ? Number(site.meanTempC) : null;
    var rh = site.meanRhPct != null && isFinite(Number(site.meanRhPct)) ? Number(site.meanRhPct) : null;
    var humidCoolHighland =
      elev != null && elev >= 1200 && (temp == null || temp <= 16) && (rh == null || rh >= 55);
    var humidCoast = elev != null && elev < 400 && rh != null && rh >= 70;
    var coldShortSeason =
      (temp != null && temp < 12) || (elev != null && elev >= 1800);
    return {
      humidCoolHighland: !!humidCoolHighland,
      humidCoast: !!humidCoast,
      coldShortSeason: !!coldShortSeason,
      elevM: elev,
      meanTempC: temp,
      meanRhPct: rh
    };
  }

  /**
   * Breed factor — mild bumps only (±15% max). Transparent defaults = 1.0.
   */
  function breedFactor(hive, siteClass) {
    var key = normalizeBreedKey(
      (hive && (hive.breed || hive.irk || hive.ırk || hive.breedKey)) || ''
    );
    if (!key) return { factor: 1.0, known: false, key: '' };
    var f = 1.0;
    siteClass = siteClass || classifySite(null);
    if (key === 'kafkas' || key === 'kafkas_karadeniz' || key === 'karadeniz' || key === 'kafkas_karniyol') {
      if (siteClass.humidCoolHighland) f = 1.05;
      else if (siteClass.humidCoast) f = 0.95;
    } else if (key === 'anadolu') {
      if (siteClass.humidCoast) f = 0.92;
      else if (siteClass.humidCoolHighland) f = 0.97;
    } else if (key === 'karniyol') {
      /* Karniyol: soğuk/yayla dostu — hafif pozitif; ceza yok. */
      if (siteClass.coldShortSeason || siteClass.humidCoolHighland) f = 1.08;
      else if (siteClass.humidCoast) f = 1.02;
      else f = 1.03;
    } else if (key === 'italyan') {
      if (siteClass.coldShortSeason) f = 0.88;
    }
    f = clamp(f, 0.85, 1.15);
    return { factor: f, known: true, key: key };
  }

  function strengthFactor(hive) {
    var raw = hive && (hive.strength || hive.strengthLabel || hive.guclu);
    var s = String(raw || '').toLocaleLowerCase('tr');
    if (s) {
      if (s.indexOf('güçlü') !== -1 || s.indexOf('guclu') !== -1 || s === 'strong' || s === 'strong') {
        return { factor: 1.1, known: true, label: 'güçlü' };
      }
      if (s.indexOf('zayıf') !== -1 || s.indexOf('zayif') !== -1 || s === 'weak') {
        return { factor: 0.75, known: true, label: 'zayıf' };
      }
      if (s.indexOf('orta') !== -1 || s === 'medium' || s === 'mid') {
        return { factor: 1.0, known: true, label: 'orta' };
      }
    }
    var cs = Number(hive && hive.colonyScore);
    if (isFinite(cs)) {
      if (cs >= 80) return { factor: 1.1, known: true, label: 'güçlü' };
      if (cs < 55) return { factor: 0.75, known: true, label: 'zayıf' };
      return { factor: 1.0, known: true, label: 'orta' };
    }
    return { factor: 1.0, known: false, label: 'bilinmiyor' };
  }

  function healthFactor(hive) {
    var hs = Number(hive && hive.healthScore);
    if (!isFinite(hs)) {
      var h = String((hive && hive.health) || '').toLocaleLowerCase('tr');
      if (h.indexOf('kritik') !== -1) hs = 40;
      else if (h.indexOf('dikkat') !== -1) hs = 60;
      else if (h.indexOf('iyi') !== -1) hs = 85;
      else return { factor: 1.0, known: false };
    }
    hs = clamp(hs, 0, 100);
    /* Map healthScore 0–100 → ~0.6–1.1 */
    return { factor: 0.6 + (hs / 100) * 0.5, known: true, healthScore: hs };
  }

  function hiveColonyProduct(hive, siteClass) {
    var st = strengthFactor(hive);
    var he = healthFactor(hive);
    var br = breedFactor(hive, siteClass);
    return {
      product: st.factor * he.factor * br.factor,
      strength: st,
      health: he,
      breed: br
    };
  }

  function round1(n) {
    return Math.round(Number(n) * 10) / 10;
  }

  function round0(n) {
    return Math.round(Number(n));
  }

  /**
   * Distance-to-water multiplier for hedef bal (metres).
   * null/missing → 1.0 (never invent a distance).
   */
  function waterFactor(waterDistanceM) {
    if (waterDistanceM == null || waterDistanceM === '') return 1.0;
    var d = Number(waterDistanceM);
    if (!isFinite(d) || d < 0) return 1.0;
    if (d <= 150) return 1.05;
    if (d <= 500) return 1.02;
    if (d <= 1000) return 1.0;
    if (d <= 2000) return 0.95;
    if (d <= 3000) return 0.88;
    return 0.82;
  }

  var WATER_TYPE_LABELS_TR = {
    kuyu: 'kuyu',
    dere: 'dere',
    oluk: 'oluk',
    golet: 'gölet',
    cesme: 'çeşme',
    mevsimlik_dere: 'mevsimlik dere',
    diger: 'diğer'
  };

  function waterTypeLabel(typeKey) {
    if (typeKey == null || typeKey === '') return null;
    var k = String(typeKey).trim().toLowerCase();
    return WATER_TYPE_LABELS_TR[k] || k;
  }

  function truncateNote(note, maxLen) {
    if (note == null || note === '') return null;
    var s = String(note).trim();
    if (!s) return null;
    maxLen = maxLen || 40;
    if (s.length <= maxLen) return s;
    return s.slice(0, Math.max(1, maxLen - 1)) + '…';
  }


  /**
   * @param {object} opts
   * @param {number} opts.S - suitability 0–100
   * @param {number|null} [opts.Hprev] - prior season harvest kg (null if missing)
   * @param {number} [opts.n] - hive count
   * @param {Array} [opts.hives] - colony records
   * @param {object} [opts.site] - { elevM, meanTempC, meanRhPct, precipSumMm }
   * @param {number} [opts.recommendedRadiusKm]
   * @param {number} [opts.analysisRadiusKm]
   * @param {boolean} [opts.usedRecommendedRadius]
   * @param {number|null} [opts.waterDistanceM] - metres to nearest water (null → factor 1.0)
   * @param {string|null} [opts.waterSourceType] - user-reported type key (display)
   * @param {string|null} [opts.waterSourceLabel] - catalog label (display)
   * @param {string|null} [opts.waterSourceNote] - optional short note (display)
   * @param {string|null} [opts.waterDistanceSource] - 'manual' | 'haversine' | 'none'
   */
  function estimateYield(opts) {
    opts = opts || {};
    var siteClass = classifySite(opts.site);
    var Sraw = Number(opts.S);
    var S = isFinite(Sraw) ? clamp(Sraw, 0, 100) : null;
    if (S != null && opts.recommendedRadiusKm != null && opts.analysisRadiusKm != null) {
      var adj = scoreAtRecommendedRadius(S, opts.analysisRadiusKm, opts.recommendedRadiusKm);
      if (adj != null) S = adj;
    }

    var hives = Array.isArray(opts.hives) ? opts.hives : [];
    var n = opts.n != null && isFinite(Number(opts.n)) ? Math.max(0, Math.round(Number(opts.n))) : hives.length;
    if (n <= 0 && hives.length) n = hives.length;

    var Hprev =
      opts.Hprev != null && isFinite(Number(opts.Hprev)) && Number(opts.Hprev) > 0
        ? Number(opts.Hprev)
        : null;

    var base = scoreBaseline(S != null ? S : 0);
    var scoreMid = base.mid;

    var products = hives.map(function (h) {
      return hiveColonyProduct(h, siteClass).product;
    });
    var colonyAvg = 1.0;
    var colonyDataSparse = !hives.length;
    if (products.length) {
      var sum = 0;
      products.forEach(function (p) {
        sum += p;
      });
      colonyAvg = sum / products.length;
    }

    var wDist =
      opts.waterDistanceM != null &&
      opts.waterDistanceM !== '' &&
      isFinite(Number(opts.waterDistanceM)) &&
      Number(opts.waterDistanceM) >= 0
        ? Number(opts.waterDistanceM)
        : null;
    var wF = waterFactor(wDist);
    var scoreProduct = clamp(colonyAvg * wF, 0.5, 1.5);

    var usedHarvest = Hprev != null;
    var mid;
    var lo;
    var hi;
    var priorPerHive = null;
    var locationFactor = null;
    var factorProduct = null;

    var waterUnsuitable = wDist == null;
    var hasSource =
      (opts.waterSourceType != null && String(opts.waterSourceType).trim()) ||
      (opts.waterSourceLabel != null && String(opts.waterSourceLabel).trim()) ||
      (opts.waterSourceId != null && String(opts.waterSourceId).trim());
    if (!hasSource && wDist == null) waterUnsuitable = true;

    var dataThin = !usedHarvest || colonyDataSparse;

    if (usedHarvest) {
      priorPerHive = Hprev / Math.max(n, 1);
      locationFactor = clamp(0.7 + ((S != null ? S : 50) / 100) * 0.5, 0.75, 1.25);
      factorProduct = clamp(locationFactor * colonyAvg * wF, 0.5, 1.6);
      mid =
        W_HARVEST * (priorPerHive * factorProduct) +
        (1 - W_HARVEST) * (scoreMid * scoreProduct);
      mid = clampThinBand(mid, dataThin && !usedHarvest);
      var halfH = Math.max(4, mid * 0.22);
      lo = Math.max(0, mid - halfH);
      hi = mid + halfH;
    } else {
      mid = scoreMid * scoreProduct;
      mid = clampThinBand(mid, true);
      var halfThin = Math.max(4, mid * 0.22);
      lo = Math.max(0, mid - halfThin);
      hi = mid + halfThin;
      /* Keep band inside baseline wings when score known. */
      lo = Math.max(lo, Math.max(0, (base.mid - base.half) * Math.min(scoreProduct, 1.15) - 2));
      hi = Math.min(hi, (base.mid + base.half) * Math.max(scoreProduct, 0.85) + 2);
      if (hi < lo + 4) hi = lo + 4;
    }

    var perHiveMid = round1(mid);
    var perHiveLo = round1(lo);
    var perHiveHi = round1(hi);
    var totalMid = round0(mid * Math.max(n, 0));
    var totalLo = round0(lo * Math.max(n, 0));
    var totalHi = round0(hi * Math.max(n, 0));

    var why = buildWhyBreakdown({
      S: S,
      scoreMid: scoreMid,
      colonyAvg: colonyAvg,
      waterFactor: wF,
      waterDistanceM: wDist,
      waterUnsuitable: waterUnsuitable,
      locationFactor: locationFactor,
      usedHarvest: usedHarvest,
      Hprev: Hprev,
      priorPerHive: priorPerHive,
      siteClass: siteClass,
      hives: hives,
      dataThin: dataThin,
      perHiveMid: perHiveMid
    });

    return {
      S: S,
      n: n,
      Hprev: Hprev,
      usedHarvest: usedHarvest,
      harvestWeightPct: usedHarvest ? Math.round(W_HARVEST * 100) : 0,
      harvestNoteTr: usedHarvest
        ? 'Geçen sezon hasat ağırlığı %' + Math.round(W_HARVEST * 100)
        : 'Hasat yok — yer+koloni tahmini (uydurma hasat yok)',
      labelTr: 'Yaklaşık',
      perHive: { mid: perHiveMid, lo: perHiveLo, hi: perHiveHi },
      total: { mid: totalMid, lo: totalLo, hi: totalHi },
      colonyAvg: round1(colonyAvg),
      colonyDataSparse: colonyDataSparse,
      scoreMid: scoreMid,
      priorPerHive: priorPerHive != null ? round1(priorPerHive) : null,
      locationFactor: locationFactor != null ? round1(locationFactor) : null,
      waterDistanceM: wDist != null ? round0(wDist) : null,
      waterFactor: Math.round(wF * 100) / 100,
      waterUnsuitable: !!waterUnsuitable,
      waterSourceType:
        opts.waterSourceType != null && String(opts.waterSourceType).trim()
          ? String(opts.waterSourceType).trim().toLowerCase()
          : null,
      waterSourceLabel:
        opts.waterSourceLabel != null && String(opts.waterSourceLabel).trim()
          ? String(opts.waterSourceLabel).trim().slice(0, 80)
          : null,
      waterSourceNote:
        opts.waterSourceNote != null && String(opts.waterSourceNote).trim()
          ? String(opts.waterSourceNote).trim().slice(0, 120)
          : null,
      waterDistanceSource:
        opts.waterDistanceSource === 'manual' || opts.waterDistanceSource === 'haversine'
          ? opts.waterDistanceSource
          : null,
      siteClass: siteClass,
      usedRecommendedRadius: opts.usedRecommendedRadius !== false,
      recommendedRadiusKm:
        opts.recommendedRadiusKm != null ? clampRadius(opts.recommendedRadiusKm) : null,
      analysisRadiusKm:
        opts.analysisRadiusKm != null ? clampRadius(opts.analysisRadiusKm) : null,
      dataNotes: buildDataNotes(hives, Hprev, colonyDataSparse),
      why: why
    };
  }

  /** Documented factor list for «neden» UI — no fabricated harvest. */
  function buildWhyBreakdown(ctx) {
    ctx = ctx || {};
    var rows = [];
    rows.push({
      k: 'Yer skoru',
      v:
        (ctx.S != null ? ctx.S + '/100' : '—') +
        (ctx.scoreMid != null ? ' → taban ~' + ctx.scoreMid + ' kg/kovan' : '')
    });
    rows.push({
      k: 'Su',
      v: ctx.waterUnsuitable
        ? 'kaynak/mesafe yok — yer arılık için henüz uygun değil (çarpan 1.0, uydurma mesafe yok)'
        : (ctx.waterDistanceM != null ? ctx.waterDistanceM + ' m' : '—') +
          ' · çarpan ' +
          (Math.round(Number(ctx.waterFactor) * 100) / 100)
    });
    var brAvg = 1;
    var stKnown = 0;
    var heKnown = 0;
    var brKnown = 0;
    var brKarn = 0;
    (ctx.hives || []).forEach(function (h) {
      var p = hiveColonyProduct(h, ctx.siteClass || classifySite(null));
      if (p.strength && p.strength.known) stKnown++;
      if (p.health && p.health.known) heKnown++;
      if (p.breed && p.breed.known) {
        brKnown++;
        if (p.breed.key === 'karniyol') brKarn++;
      }
    });
    rows.push({
      k: 'Koloni (güç×sağlık×ırk)',
      v:
        'ortalama çarpan ' +
        (Math.round(Number(ctx.colonyAvg) * 100) / 100) +
        (brKarn ? ' · Karniyol dostu' : '') +
        (ctx.dataThin ? ' · veri ince → 20–35 kg bandı' : '')
    });
    if (ctx.usedHarvest && ctx.Hprev != null) {
      rows.push({
        k: 'Hasat',
        v:
          'geçen sezon ' +
          round0(ctx.Hprev) +
          ' kg' +
          (ctx.priorPerHive != null ? ' (~' + round1(ctx.priorPerHive) + ' kg/kovan)' : '') +
          ' · ağırlık %' +
          Math.round(W_HARVEST * 100)
      });
    } else {
      rows.push({
        k: 'Hasat',
        v: 'kayıt yok — uydurma hasat sayısı yok; yalnız yer+koloni'
      });
    }
    if (ctx.locationFactor != null) {
      rows.push({
        k: 'Konum çarpanı',
        v: String(Math.round(Number(ctx.locationFactor) * 100) / 100)
      });
    }
    rows.push({
      k: 'Sonuç',
      v:
        'kovan başı ≈ ' +
        (ctx.perHiveMid != null ? ctx.perHiveMid : '—') +
        ' kg (yaklaşık; garanti değil)'
    });
    return rows;
  }

  function buildDataNotes(hives, Hprev, sparse) {
    var notes = [];
    if (Hprev == null) notes.push('Geçen sezon hasat kaydı yok');
    if (sparse) notes.push('Kovan listesi boş — koloni çarpanı 1,0');
    else {
      var breedKnown = 0;
      hives.forEach(function (h) {
        if (h && (h.breed || h.irk || h.ırk || h.breedKey)) breedKnown++;
      });
      if (breedKnown === 0) notes.push('Irk verisi eksik — ırk çarpanı 1,0');
      else if (breedKnown < hives.length) {
        notes.push('Bazı kovanlarda ırk verisi eksik');
      }
    }
    return notes;
  }

  function isHealthCritical(hive) {
    var h = String((hive && hive.health) || '').toLocaleLowerCase('tr');
    if (h.indexOf('kritik') !== -1) return true;
    var hs = Number(hive && hive.healthScore);
    return isFinite(hs) && hs < 45;
  }

  function isWeak(hive) {
    return strengthFactor(hive).factor <= 0.8;
  }

  function isHighSwarm(hive) {
    var s = String((hive && hive.swarmRisk) || '').toLocaleLowerCase('tr');
    return s.indexOf('yüksek') !== -1 || s.indexOf('yuksek') !== -1 || s === 'high';
  }

  function hiveFitScore(hive, siteClass, S) {
    var p = hiveColonyProduct(hive, siteClass);
    var bonus = 0;
    if (isHealthCritical(hive)) bonus -= 30;
    if (isWeak(hive) && S < 50) bonus -= 20;
    if (isHighSwarm(hive) && siteClass.coldShortSeason) bonus -= 15;
    return p.product * 100 + bonus + (Number(hive.healthScore) || 50) * 0.2;
  }

  /**
   * Flag unsuitable hives + suggest swaps from other apiaries.
   * Heuristic (shown in UI tip): critical health; weak on hard site (S&lt;50);
   * high-swarm breed/tendency on cold short season.
   *
   * @param {object} opts
   * @param {number} opts.S
   * @param {Array} opts.hives - hives at this apiary
   * @param {string} [opts.apiaryId]
   * @param {Array} [opts.otherHives] - all hives (or other apiaries)
   * @param {Array} [opts.apiaries]
   * @param {object} [opts.site]
   */
  function findMismatchedHives(opts) {
    opts = opts || {};
    var S = Number(opts.S);
    if (!isFinite(S)) S = 50;
    var siteClass = classifySite(opts.site);
    var local = Array.isArray(opts.hives) ? opts.hives : [];
    var apiaryId = opts.apiaryId != null ? String(opts.apiaryId) : '';
    var allHives = Array.isArray(opts.otherHives) ? opts.otherHives : [];
    var apiaries = Array.isArray(opts.apiaries) ? opts.apiaries : [];
    var apiaryNameById = {};
    apiaries.forEach(function (a) {
      if (a && a.id != null) apiaryNameById[String(a.id)] = a.name || a.place || String(a.id);
    });

    var others = allHives.filter(function (h) {
      if (!h) return false;
      var aid = String(h.apiaryId || '');
      return aid && aid !== apiaryId;
    });

    var flagged = [];
    local.forEach(function (h) {
      var reasons = [];
      if (isHealthCritical(h)) reasons.push('sağlık kritik');
      if (isWeak(h) && S < 50) reasons.push('zayıf koloni · zor yer (S<' + 50 + ')');
      if (isHighSwarm(h) && siteClass.coldShortSeason) {
        reasons.push('yüksek oğul eğilimi · kısa/soğuk sezon');
      }
      var br = breedFactor(h, siteClass);
      if (
        br.known &&
        br.key !== 'karniyol' &&
        br.factor <= 0.92 &&
        (siteClass.humidCoast || siteClass.coldShortSeason)
      ) {
        reasons.push('ırk bu iklime daha az uyumlu');
      }
      if (!reasons.length) return;

      var localFit = hiveFitScore(h, siteClass, S);
      var swap = null;
      var best = null;
      others.forEach(function (cand) {
        if (isHealthCritical(cand) || isWeak(cand)) return;
        var fit = hiveFitScore(cand, siteClass, S);
        if (fit <= localFit + 5) return;
        if (!best || fit > best.fit) {
          best = { hive: cand, fit: fit };
        }
      });
      if (best) {
        var ca = String(best.hive.apiaryId || '');
        swap = {
          hiveId: best.hive.id,
          hiveName: best.hive.name || ('Kovan ' + best.hive.id),
          apiaryId: ca,
          apiaryName: apiaryNameById[ca] || ca || 'Diğer arılık'
        };
      }

      flagged.push({
        hiveId: h.id,
        hiveName: h.name || ('Kovan ' + h.id),
        reasons: reasons,
        reasonTr: reasons.join('; '),
        swap: swap
      });
    });

    var otherApiaryCount = 0;
    var seenA = {};
    others.forEach(function (h) {
      var a = String(h.apiaryId || '');
      if (a && !seenA[a]) {
        seenA[a] = true;
        otherApiaryCount++;
      }
    });

    return {
      items: flagged,
      otherApiaryCount: otherApiaryCount,
      otherHiveCount: others.length,
      tipTr:
        'Ölçüt: sağlık kritik; zayıf koloni + zor yer (uygunluk &lt;50); yüksek oğul eğilimi + kısa/soğuk sezon; ırk-iklim uyumsuzluğu. Takas önerisi başka arılıktaki daha güçlü/sağlıklı kovandan seçilir — yoksa uydurulmaz.'
    };
  }

  function escapeDefault(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function renderBlocksHtml(estimate, mismatches, escapeHtml, tip) {
    escapeHtml = escapeHtml || escapeDefault;
    if (!estimate) return '';

    var ph = estimate.perHive;
    var tot = estimate.total;
    var notesHtml = '';
    if (estimate.dataNotes && estimate.dataNotes.length) {
      notesHtml =
        '<p class="fy-notes">Veri: ' +
        escapeHtml(estimate.dataNotes.join(' · ')) +
        '</p>';
    }

    var radiusNote = '';
    if (
      estimate.recommendedRadiusKm != null &&
      estimate.analysisRadiusKm != null &&
      Math.abs(estimate.recommendedRadiusKm - estimate.analysisRadiusKm) >= 0.05
    ) {
      radiusNote =
        '<p class="fy-notes">Hedef skoru önerilen foraj (' +
        escapeHtml(String(estimate.recommendedRadiusKm)) +
        ' km) ile ayarlandı; panel yarıçapı ' +
        escapeHtml(String(estimate.analysisRadiusKm)) +
        ' km.</p>';
    }

    var yieldHtml =
      '<div class="fy-block fy-yield" data-harvest="' +
      (estimate.usedHarvest ? '1' : '0') +
      '">' +
      '<div class="fy-head"><strong>Hedef bal</strong>' +
      '<span class="fy-badge">' +
      escapeHtml(estimate.labelTr || 'Yaklaşık') +
      '</span></div>' +
      '<p class="fy-sum">' +
      'Kovan başı ≈ <strong>' +
      escapeHtml(String(ph.mid)) +
      ' kg</strong>' +
      ' <span class="fy-range">(' +
      escapeHtml(String(ph.lo)) +
      '–' +
      escapeHtml(String(ph.hi)) +
      ')</span>' +
      (estimate.n > 0
        ? ' · <strong>' +
          escapeHtml(String(estimate.n)) +
          ' kovan</strong> toplam ≈ <strong>' +
          escapeHtml(String(tot.mid)) +
          ' kg</strong>' +
          ' <span class="fy-range">(' +
          escapeHtml(String(tot.lo)) +
          '–' +
          escapeHtml(String(tot.hi)) +
          ')</span>'
        : ' · <span class="fy-range">kovan sayısı yok</span>') +
      '</p>' +
      '<p class="fy-meta">' +
      escapeHtml(estimate.harvestNoteTr) +
      (estimate.S != null
        ? ' · uygunluk ' + escapeHtml(String(estimate.S)) + '/100'
        : '') +
      (estimate.Hprev != null
        ? ' · geçen sezon ' + escapeHtml(String(round0(estimate.Hprev))) + ' kg'
        : '') +
      '</p>' +
      '<p class="fy-notes">Su mesafesi hedefi çarpan olarak girer (garanti değil; uydurma 800 m yok).</p>' +
      (function () {
        var typeLab = waterTypeLabel(estimate.waterSourceType);
        var label = estimate.waterSourceLabel
          ? String(estimate.waterSourceLabel).trim()
          : '';
        var noteShort = truncateNote(estimate.waterSourceNote, 40);
        var head = '';
        if (label && typeLab) head = label + ' (' + typeLab + ')';
        else if (label) head = label;
        else if (typeLab) head = typeLab;
        var parts = [];
        if (head) parts.push(head);
        if (estimate.waterDistanceM != null) {
          var distBit = String(estimate.waterDistanceM) + ' m';
          if (estimate.waterDistanceSource === 'haversine') distBit += ' (harita)';
          else if (estimate.waterDistanceSource === 'manual') distBit += ' (elle)';
          parts.push(distBit);
        } else if (head) {
          parts.push('mesafe girin');
        }
        if (noteShort && noteShort !== label) parts.push(noteShort);
        parts.push('çarpan ' + String(estimate.waterFactor));
        if (estimate.waterUnsuitable || (estimate.waterDistanceM == null && !head)) {
          return (
            '<p class="fy-water fy-water-bad">' +
            'Bu yer arılık için henüz uygun değil — su kaynağı / gerçek mesafe yok. ' +
            'Su ekleyin veya listeden seçin (uydurma mesafe yok).' +
            '</p>'
          );
        }
        return (
          '<p class="fy-water">Su: ' +
          escapeHtml(parts.join(' · ')) +
          '</p>'
        );
      })() +
      (function () {
        if (!estimate.why || !estimate.why.length) return '';
        return (
          '<div class="fy-neden">' +
          '<div class="fy-neden-head">Neden bu hedef?</div>' +
          '<ul class="fy-neden-list">' +
          estimate.why
            .map(function (w) {
              return (
                '<li><span class="fy-neden-k">' +
                escapeHtml(w.k) +
                ':</span> ' +
                escapeHtml(w.v) +
                '</li>'
              );
            })
            .join('') +
          '</ul></div>'
        );
      })() +
      (function () {
        if (!tip || tip.yieldPct == null || tip.yieldPct < 8) return '';
        var km =
          tip.distKm != null && isFinite(Number(tip.distKm))
            ? String(Math.round(Number(tip.distKm) * 2) / 2).replace(/\.0$/, '')
            : '';
        var dir = tip.dirLabel || tip.dirKey || '';
        if (!km || !dir) return '';
        return (
          '<p class="fy-better">Daha iyi nokta: ' +
          escapeHtml(km) +
          ' km ' +
          escapeHtml(dir) +
          ' — ~+%' +
          escapeHtml(String(tip.yieldPct)) +
          ' hedef</p>'
        );
      })() +
      notesHtml +
      radiusNote +
      '</div>';

    var mism = mismatches || { items: [], otherApiaryCount: 0, otherHiveCount: 0, tipTr: '' };
    var listHtml = '';
    if (!mism.items || !mism.items.length) {
      listHtml =
        '<p class="fy-empty">Bu konum için işaretlenen uyumsuz kovan yok.</p>';
    } else {
      listHtml =
        '<ul class="fy-swap-list">' +
        mism.items
          .map(function (it) {
            var swapLine = '';
            if (it.swap) {
              swapLine =
                '<div class="fy-swap">Öneri: ' +
                escapeHtml(it.hiveName) +
                ' ↔ ' +
                escapeHtml(it.swap.apiaryName) +
                ' / ' +
                escapeHtml(it.swap.hiveName) +
                '</div>';
            } else if (!mism.otherHiveCount) {
              swapLine =
                '<div class="fy-swap is-muted">Başka arılıkta takas için kovan yok.</div>';
            } else {
              swapLine =
                '<div class="fy-swap is-muted">Uygun takas adayı bulunamadı.</div>';
            }
            return (
              '<li>' +
              '<div class="fy-bad-hive">Bu konuma uygun değil: <strong>' +
              escapeHtml(it.hiveName) +
              '</strong></div>' +
              '<div class="fy-why">' +
              escapeHtml(it.reasonTr) +
              '</div>' +
              swapLine +
              '</li>'
            );
          })
          .join('') +
        '</ul>';
    }

    var tipHtml = mism.tipTr
      ? '<p class="fy-tip">' + mism.tipTr + '</p>'
      : '';

    var swapHtml =
      '<div class="fy-block fy-swap-block">' +
      '<div class="fy-head"><strong>Uygunluk / takas</strong></div>' +
      listHtml +
      tipHtml +
      '</div>';

    return yieldHtml + swapHtml;
  }

  /**
   * Convenience: load Hprev from SuperAriRapor for previous bal season.
   */
  function priorHarvestKg(apiaryId) {
    var R = global.SuperAriRapor;
    if (!R || !R.harvestSummary || !apiaryId) return null;
    var cur =
      typeof R.currentSeasonYear === 'function'
        ? R.currentSeasonYear()
        : new Date().getFullYear();
    var prev = Number(cur) - 1;
    try {
      var sum = R.harvestSummary(prev, String(apiaryId));
      if (sum && Number(sum.totalKg) > 0) return Number(sum.totalKg);
    } catch (e) { /* ignore */ }
    return null;
  }

  /**
   * Build + render yield/swap blocks after a forage analysis result.
   */
  function buildFromAnalysis(analysis, ctx) {
    ctx = ctx || {};
    if (!analysis || analysis.score == null) return { estimate: null, mismatches: null, html: '' };

    var F = global.SuperAriForage;
    var D = global.SuperAriDemo;
    var apiary = ctx.apiary || null;
    var apiaryId = apiary && apiary.id != null ? String(apiary.id) : ctx.apiaryId || '';
    var hives = Array.isArray(ctx.hives)
      ? ctx.hives
      : apiaryId && D && D.hivesForApiary
        ? D.hivesForApiary(apiaryId)
        : [];
    var n =
      ctx.n != null
        ? Number(ctx.n)
        : apiary && apiary.hiveCount != null
          ? Number(apiary.hiveCount)
          : hives.length;

    var recKm = null;
    if (F && F.recommendRadiusKm && isFinite(analysis.lat) && isFinite(analysis.lon)) {
      var rec = F.recommendRadiusKm(analysis.lat, analysis.lon, ctx.forageOpts || {});
      recKm = rec && rec.km != null ? rec.km : null;
    }
    if (recKm == null && ctx.recommendedRadiusKm != null) recKm = ctx.recommendedRadiusKm;

    var site = {
      elevM: analysis.elevM,
      meanTempC: analysis.meanTempC,
      meanRhPct: analysis.meanRhPct,
      precipSumMm: analysis.precipSumMm
    };

    var Hprev =
      ctx.Hprev !== undefined
        ? ctx.Hprev
        : apiaryId
          ? priorHarvestKg(apiaryId)
          : null;

    var catalogItem = null;
    if (apiary && apiary.waterSourceId && D && D.waterCatalogById) {
      catalogItem = D.waterCatalogById(apiary.waterSourceId);
    }

    var waterDistanceSource = null;
    var waterDistanceM;
    if (ctx.waterDistanceM !== undefined) {
      waterDistanceM = ctx.waterDistanceM;
      waterDistanceSource = ctx.waterDistanceSource || null;
    } else if (D && D.effectiveWaterDistanceM && apiary) {
      var eff = D.effectiveWaterDistanceM(apiary, catalogItem);
      waterDistanceM = eff && eff.metres != null ? eff.metres : null;
      waterDistanceSource = eff && eff.source !== 'none' ? eff.source : null;
    } else {
      waterDistanceM =
        apiary && apiary.waterDistanceM != null ? apiary.waterDistanceM : null;
      if (waterDistanceM != null) waterDistanceSource = 'manual';
    }

    var waterSourceType =
      ctx.waterSourceType !== undefined
        ? ctx.waterSourceType
        : catalogItem
          ? catalogItem.typeKey
          : apiary && apiary.waterSourceType != null
            ? apiary.waterSourceType
            : null;

    var waterSourceLabel =
      ctx.waterSourceLabel !== undefined
        ? ctx.waterSourceLabel
        : catalogItem
          ? catalogItem.label
          : apiary && apiary.waterSourceLabel != null
            ? apiary.waterSourceLabel
            : null;

    var waterSourceNote =
      ctx.waterSourceNote !== undefined
        ? ctx.waterSourceNote
        : catalogItem && catalogItem.note
          ? catalogItem.note
          : apiary && apiary.waterSourceNote != null
            ? apiary.waterSourceNote
            : null;

    var estimate = estimateYield({
      S: analysis.score,
      Hprev: Hprev,
      n: n,
      hives: hives,
      site: site,
      recommendedRadiusKm: recKm,
      analysisRadiusKm: analysis.radiusKm,
      usedRecommendedRadius: true,
      waterDistanceM: waterDistanceM,
      waterDistanceSource: waterDistanceSource,
      waterSourceType: waterSourceType,
      waterSourceLabel: waterSourceLabel,
      waterSourceNote: waterSourceNote
    });

    var allHives =
      Array.isArray(ctx.otherHives)
        ? ctx.otherHives
        : D && D.hives
          ? D.hives
          : [];
    var apiaries =
      Array.isArray(ctx.apiaries)
        ? ctx.apiaries
        : D && D.apiaries
          ? D.apiaries
          : [];

    var mismatches = findMismatchedHives({
      S: estimate.S != null ? estimate.S : analysis.score,
      hives: hives,
      apiaryId: apiaryId,
      otherHives: allHives,
      apiaries: apiaries,
      site: site
    });

    return {
      estimate: estimate,
      mismatches: mismatches,
      html: renderBlocksHtml(estimate, mismatches, ctx.escapeHtml, analysis.tip || null)
    };
  }

  var css = [
    '.fy-block{margin-top:10px;padding:10px 11px;border-radius:12px;background:#f7fff4;border:1px solid #9bb87a;overflow:hidden;min-width:0;}',
    '.fy-swap-block{background:#fff8f5;border-color:#e0a090;}',
    '.fy-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:4px;min-width:0;flex-wrap:wrap;}',
    '.fy-head strong{font-size:12px;font-weight:800;color:#2c241c;}',
    '.fy-badge{font-size:10px;font-weight:700;padding:3px 7px;border-radius:999px;background:#fff;border:1px solid #9bb87a;color:#3d5a2a;}',
    '.fy-sum{margin:0 0 4px;font-size:12px;font-weight:700;color:#2c241c;line-height:1.4;overflow-wrap:anywhere;word-break:break-word;}',
    '.fy-range{font-weight:650;color:#5a6a4a;}',
    '.fy-meta{margin:0;font-size:11px;font-weight:650;color:#4a5a3a;line-height:1.35;}',
    '.fy-water{margin:4px 0 0;font-size:11px;font-weight:700;color:#1e4a6a;line-height:1.35;overflow-wrap:anywhere;word-break:break-word;}',
    '.fy-water-bad{color:#8a2e1c;background:#fff0ec;border:1px solid #e0a090;border-radius:10px;padding:8px 10px;}',
    '.fy-neden{margin:8px 0 0;padding:8px 10px;border-radius:10px;background:#fff;border:1px dashed #c9a227;}',
    '.fy-neden-head{font-size:11px;font-weight:800;color:#4a2f1a;margin:0 0 4px;}',
    '.fy-neden-list{margin:0;padding:0 0 0 1.1em;list-style:disc;font-size:10px;font-weight:600;color:#5a4634;line-height:1.45;}',
    '.fy-neden-k{font-weight:800;color:#4a2f1a;}',
    '.fy-better{margin:6px 0 0;font-size:11px;font-weight:750;color:#3d5a2a;line-height:1.35;}',
    '.fy-notes{margin:6px 0 0;font-size:10px;font-weight:560;color:#6b735a;line-height:1.35;}',
    '.fy-empty{margin:0;font-size:11px;font-weight:650;color:#6b635a;}',
    '.fy-swap-list{margin:6px 0 0;padding:0;list-style:none;display:grid;gap:8px;}',
    '.fy-swap-list li{padding:8px 9px;border-radius:10px;background:#fff;border:1px solid #e8c8bc;}',
    '.fy-bad-hive{font-size:12px;font-weight:750;color:#6a2e1c;}',
    '.fy-why{margin-top:2px;font-size:11px;font-weight:600;color:#7a5344;line-height:1.35;}',
    '.fy-swap{margin-top:5px;font-size:11px;font-weight:750;color:#3d5a2a;}',
    '.fy-swap.is-muted{font-weight:600;color:#8a7358;}',
    '.fy-tip{margin:8px 0 0;font-size:10px;font-weight:560;color:#8a7358;line-height:1.35;}'
  ].join('');

  function injectStyles() {
    if (typeof document === 'undefined') return;
    if (document.getElementById('forage-yield-estimate-css')) return;
    var s = document.createElement('style');
    s.id = 'forage-yield-estimate-css';
    s.textContent = css;
    document.head.appendChild(s);
  }

  injectStyles();

  global.SuperAriForageYield = {
    W_HARVEST: W_HARVEST,
    estimateYield: estimateYield,
    waterFactor: waterFactor,
    midKgFromScore: midKgFromScore,
    yieldPctFromScores: yieldPctFromScores,
    findMismatchedHives: findMismatchedHives,
    renderBlocksHtml: renderBlocksHtml,
    buildFromAnalysis: buildFromAnalysis,
    priorHarvestKg: priorHarvestKg,
    scoreAtRecommendedRadius: scoreAtRecommendedRadius,
    strengthFactor: strengthFactor,
    healthFactor: healthFactor,
    breedFactor: breedFactor,
    classifySite: classifySite
  };
})(window);

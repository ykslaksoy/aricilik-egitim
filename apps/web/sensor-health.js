/** SuperAri internal hive health scoring (proprietary). */
(function (global) {
  var WEIGHTS = { T: 25, RH: 15, IR: 15, S: 15, W: 20, V: 10 };

  function clamp(n, lo, hi) {
    n = Number(n);
    if (!isFinite(n)) return lo;
    return Math.max(lo, Math.min(hi, n));
  }

  function band(score) {
    var s = clamp(score, 0, 100);
    if (s >= 85) return { key: 'ok', label: 'Sağlıklı', tone: 'ok', hint: 'Rutin dışında müdahale gerekmez' };
    if (s >= 70) return { key: 'watch', label: 'İzle', tone: 'warn', hint: 'Kısa süre takip' };
    if (s >= 50) return { key: 'check', label: 'Kontrol', tone: 'warn', hint: 'Sahada bakılması iyi olur' };
    return { key: 'act', label: 'Müdahale', tone: 'bad', hint: 'Öncelikli kovan' };
  }

  /** Deviation 0–5 per channel from hive demo fields + synthetic sensors. */
  function deviationsFromHive(h) {
    h = h || {};
    var hs = clamp(h.healthScore, 0, 100);
    var base = (100 - hs) / 20; /* 0..5 */
    var delta = Number(h.deltaKg) || 0;
    var swarm = String(h.swarmRisk || '').toLocaleLowerCase('tr');
    var health = String(h.health || '').toLocaleLowerCase('tr');

    var dT = clamp(base * 0.9 + (health.indexOf('kritik') >= 0 ? 1.5 : 0), 0, 5);
    var dRH = clamp(base * 0.7 + (Math.abs(delta) > 1.5 ? 0.8 : 0), 0, 5);
    var dIR = clamp(base * 0.85, 0, 5);
    var dS = clamp(base * 0.6 + (swarm.indexOf('yüksek') >= 0 || swarm.indexOf('yuksek') >= 0 ? 2.2 : swarm.indexOf('orta') >= 0 ? 1.2 : 0), 0, 5);
    var dW = clamp(base * 0.5 + (delta < -1 ? Math.min(3, Math.abs(delta)) : delta > 2.5 ? 0.8 : 0), 0, 5);
    var dV = clamp(base * 0.35 + (swarm.indexOf('yüksek') >= 0 || swarm.indexOf('yuksek') >= 0 ? 1.5 : 0), 0, 5);

    var tempC = clamp(35.2 - dT * 0.55, 28, 38);
    var rh = clamp(52 + dRH * 5.5, 35, 90);
    var irCold = dIR >= 2.5;
    var sound = dS >= 3 ? 'yüksek' : dS >= 1.5 ? 'orta' : 'normal';
    var vib = dV >= 2.5 ? 'ani' : dV >= 1.2 ? 'hafif' : 'sakin';

    return {
      T: Math.round(dT * 10) / 10,
      RH: Math.round(dRH * 10) / 10,
      IR: Math.round(dIR * 10) / 10,
      S: Math.round(dS * 10) / 10,
      W: Math.round(dW * 10) / 10,
      V: Math.round(dV * 10) / 10,
      readings: {
        tempC: Math.round(tempC * 10) / 10,
        rh: Math.round(rh),
        irCold: irCold,
        sound: sound,
        weightKg: Number(h.weightKg) || null,
        deltaKg: delta,
        vibration: vib
      }
    };
  }

  function scoreFromDevs(devs) {
    var penalty =
      (devs.T || 0) * WEIGHTS.T +
      (devs.RH || 0) * WEIGHTS.RH +
      (devs.IR || 0) * WEIGHTS.IR +
      (devs.S || 0) * WEIGHTS.S +
      (devs.W || 0) * WEIGHTS.W +
      (devs.V || 0) * WEIGHTS.V;
    var health = 100 - penalty / 5;
    return Math.round(clamp(health, 0, 100));
  }

  function rulesFired(devs, readings) {
    var rules = [];
    if ((devs.T || 0) >= 2 && (devs.RH || 0) >= 2) {
      rules.push({ id: 'nem_soguk', text: 'Nem + soğuk: küf / üşüme / havalandırma' });
    }
    if ((devs.T || 0) >= 2 && (devs.IR || 0) >= 2.5) {
      rules.push({ id: 'ir_soguk', text: 'Isı düzensiz + IR soğuk ada: yavru / kuluçka' });
    }
    if ((devs.W || 0) >= 2.5 && (devs.S || 0) >= 1.5) {
      rules.push({ id: 'tarti_ses', text: 'Tartı düşüş + ses düşük: açlık / arı kaybı / ana' });
    }
    if ((devs.S || 0) >= 3 && (devs.V || 0) >= 2) {
      rules.push({ id: 'ogul', text: 'Ses + titreşim: oğul riski' });
    }
    if ((devs.V || 0) >= 3 && Math.abs(readings.deltaKg || 0) >= 1.5) {
      rules.push({ id: 'darbe', text: 'Titreşim + tartı şok: darbe / kayma' });
    }
    if ((devs.T || 0) >= 2 && (devs.S || 0) >= 2 && (devs.W || 0) >= 2) {
      rules.push({ id: 'ornekle', text: 'Stres üçlüsü: varroa örnekle (teşhis değil)' });
    }
    return rules;
  }

  function evaluateHive(h) {
    var devs = deviationsFromHive(h);
    var score = scoreFromDevs(devs);
    var b = band(score);
    var rules = rulesFired(devs, devs.readings);
    return {
      hiveId: h && h.id,
      name: (h && (h.name || ('Kovan ' + h.id))) || '—',
      score: score,
      band: b,
      deviations: { T: devs.T, RH: devs.RH, IR: devs.IR, S: devs.S, W: devs.W, V: devs.V },
      readings: devs.readings,
      rules: rules,
      openHive: score < 50
    };
  }

  function evaluateAll(hives) {
    var list = (hives || []).map(evaluateHive);
    var sum = 0;
    list.forEach(function (x) { sum += x.score; });
    var avg = list.length ? Math.round(sum / list.length) : 100;
    return {
      avg: avg,
      band: band(avg),
      hives: list.slice().sort(function (a, b) { return a.score - b.score; }),
      counts: {
        ok: list.filter(function (x) { return x.score >= 85; }).length,
        watch: list.filter(function (x) { return x.score >= 70 && x.score < 85; }).length,
        check: list.filter(function (x) { return x.score >= 50 && x.score < 70; }).length,
        act: list.filter(function (x) { return x.score < 50; }).length
      },
      weights: WEIGHTS,
      thresholds: [
        { min: 85, max: 100, label: 'Sağlıklı', desc: 'Rutin dışında müdahale gerekmez' },
        { min: 70, max: 84, label: 'İzle', desc: 'Kısa süre takip' },
        { min: 50, max: 69, label: 'Kontrol', desc: 'Sahada bakılması iyi olur' },
        { min: 0, max: 49, label: 'Müdahale', desc: 'Öncelikli kovan' }
      ]
    };
  }

  global.SuperAriSensorHealth = {
    WEIGHTS: WEIGHTS,
    band: band,
    evaluateHive: evaluateHive,
    evaluateAll: evaluateAll,
    scoreFromDevs: scoreFromDevs
  };
})(window);

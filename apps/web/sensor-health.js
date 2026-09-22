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
    if (s >= 85) return { key: 'ok', label: 'Sağlıklı', tone: 'green', hint: 'Rutin dışında müdahale gerekmez' };
    if (s >= 70) return { key: 'watch', label: 'İzle', tone: 'yellow', hint: 'Kısa süre takip; gerekirse not düşün' };
    if (s >= 50) return { key: 'check', label: 'Kontrol', tone: 'orange', hint: 'Sahada bakılması iyi olur' };
    return { key: 'act', label: 'Müdahale', tone: 'red', hint: 'Öncelikli — gerekçe ve malzemeye bakın' };
  }

  function deviationsFromHive(h) {
    h = h || {};
    var hs = clamp(h.healthScore, 0, 100);
    var base = (100 - hs) / 20;
    var delta = Number(h.deltaKg) || 0;
    var swarm = String(h.swarmRisk || '').toLocaleLowerCase('tr');
    var health = String(h.health || '').toLocaleLowerCase('tr');

    var dT = clamp(base * 0.9 + (health.indexOf('kritik') >= 0 ? 1.5 : 0), 0, 5);
    var dRH = clamp(base * 0.7 + (Math.abs(delta) > 1.5 ? 0.8 : 0), 0, 5);
    var dIR = clamp(base * 0.85, 0, 5);
    var dS = clamp(base * 0.6 + (swarm.indexOf('yüksek') >= 0 || swarm.indexOf('yuksek') >= 0 ? 2.2 : swarm.indexOf('orta') >= 0 ? 1.2 : 0), 0, 5);
    var dW = clamp(base * 0.5 + (delta < -1 ? Math.min(3, Math.abs(delta)) : delta > 2.5 ? 0.8 : 0), 0, 5);
    var dV = clamp(base * 0.35 + (swarm.indexOf('yüksek') >= 0 || swarm.indexOf('yuksek') >= 0 ? 1.5 : 0), 0, 5);

    return {
      T: Math.round(dT * 10) / 10,
      RH: Math.round(dRH * 10) / 10,
      IR: Math.round(dIR * 10) / 10,
      S: Math.round(dS * 10) / 10,
      W: Math.round(dW * 10) / 10,
      V: Math.round(dV * 10) / 10,
      readings: {
        tempC: Math.round(clamp(35.2 - dT * 0.55, 28, 38) * 10) / 10,
        rh: Math.round(clamp(52 + dRH * 5.5, 35, 90)),
        deltaKg: delta,
        vibration: dV >= 2.5 ? 'ani' : dV >= 1.2 ? 'hafif' : 'sakin'
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
    return Math.round(clamp(100 - penalty / 5, 0, 100));
  }

  function rulesFired(devs, readings) {
    var rules = [];
    if ((devs.T || 0) >= 2 && (devs.RH || 0) >= 2) {
      rules.push({ id: 'nem_soguk', kind: 'nem', title: 'Nem / havalandırma', detail: 'Kapak, havalandırma ve su birikimini kontrol edin.' });
    }
    if ((devs.T || 0) >= 2 && (devs.IR || 0) >= 2.5) {
      rules.push({ id: 'ir_soguk', kind: 'yavru', title: 'Yavru / kuluçka', detail: 'Ana ve yavru kontrolü önerilir.' });
    }
    if ((devs.W || 0) >= 2.5 && (devs.S || 0) >= 1.5) {
      rules.push({ id: 'tarti_ses', kind: 'besleme', title: 'Besleme / tartı', detail: 'Yem ve koloni gücü kontrol edin.' });
    }
    if ((devs.S || 0) >= 3 && (devs.V || 0) >= 2) {
      rules.push({ id: 'ogul', kind: 'ogul', title: 'Oğul riski', detail: 'Ballık, ana hücre ve giriş kontrolü yapın.' });
    }
    if ((devs.V || 0) >= 3 && Math.abs(readings.deltaKg || 0) >= 1.5) {
      rules.push({ id: 'darbe', kind: 'malzeme', title: 'Darbe / kayma', detail: 'Kovan oturuşu, kapak ve ayakları kontrol edin.' });
    }
    if ((devs.T || 0) >= 2 && (devs.S || 0) >= 2 && (devs.W || 0) >= 2) {
      rules.push({ id: 'ornekle', kind: 'varroa', title: 'Varroa örnekleme', detail: 'Örnekleme yapın; bu teşhis değildir.' });
    }
    return rules;
  }

  /** Materials needed per action kind (beekeeping inventory). */
  var MATERIALS_BY_KIND = {
    ogul: [
      { id: 'ballik', name: 'Ballık / süper', qty: 1, unit: 'adet' },
      { id: 'ana_kafes', name: 'Ana kafesi', qty: 1, unit: 'adet' },
      { id: 'cerceve_bos', name: 'Boş çerçeve', qty: 2, unit: 'adet' }
    ],
    varroa: [
      { id: 'ornek_kit', name: 'Varroa örnekleme kiti', qty: 1, unit: 'adet' },
      { id: 'tedavi', name: 'Varroa ilacı / asit (onaylı)', qty: 1, unit: 'uygulama' },
      { id: 'eldiven', name: 'Eldiven', qty: 1, unit: 'çift' }
    ],
    besleme: [
      { id: 'surup', name: 'Şurup / kek', qty: 1, unit: 'lt/kg' },
      { id: 'besleme_kap', name: 'Besleme kabı', qty: 1, unit: 'adet' }
    ],
    yavru: [
      { id: 'cerceve_temel', name: 'Temel petekli çerçeve', qty: 1, unit: 'adet' },
      { id: 'ortu', name: 'Örtü bezi', qty: 1, unit: 'adet' }
    ],
    nem: [
      { id: 'havalandirma', name: 'Havalandırma takozu / tel', qty: 1, unit: 'adet' },
      { id: 'ortu_kuru', name: 'Kuru örtü bezi', qty: 1, unit: 'adet' }
    ],
    malzeme: [
      { id: 'kapak', name: 'Kapak / kovan ayağı yedek', qty: 1, unit: 'adet' },
      { id: 'tel', name: 'Sabitleme teli / kayış', qty: 1, unit: 'adet' }
    ],
    genel: [
      { id: 'dumank', name: 'Dumanlık + yakıt', qty: 1, unit: 'adet' },
      { id: 'kestane', name: 'Kovan aleti', qty: 1, unit: 'adet' }
    ]
  };

  function materialsForActions(actions) {
    var map = {};
    (actions || []).forEach(function (a) {
      var list = MATERIALS_BY_KIND[a.kind] || MATERIALS_BY_KIND.genel;
      list.forEach(function (m) {
        if (!map[m.id]) {
          map[m.id] = { id: m.id, name: m.name, qty: 0, unit: m.unit, kinds: [] };
        }
        map[m.id].qty += Number(m.qty) || 1;
        if (map[m.id].kinds.indexOf(a.kind) === -1) map[m.id].kinds.push(a.kind);
      });
    });
    return Object.keys(map).map(function (k) { return map[k]; })
      .sort(function (a, b) { return String(a.name).localeCompare(String(b.name), 'tr'); });
  }

  function publicActions(h, rules, score, bandKey) {
    var actions = (rules || []).map(function (r) {
      return { kind: r.kind, title: r.title, detail: r.detail };
    });
    var swarm = String((h && h.swarmRisk) || '').toLocaleLowerCase('tr');
    if ((swarm.indexOf('yüksek') >= 0 || swarm.indexOf('yuksek') >= 0) &&
        !actions.some(function (a) { return a.kind === 'ogul'; })) {
      actions.unshift({
        kind: 'ogul',
        title: 'Oğul riski',
        detail: 'Ballık ve ana hücre kontrolü yapın.'
      });
    }
    var health = String((h && h.health) || '').toLocaleLowerCase('tr');
    if (health.indexOf('kritik') >= 0 && !actions.some(function (a) { return a.kind === 'varroa'; })) {
      actions.push({
        kind: 'varroa',
        title: 'Sağlık kritik',
        detail: 'Varroa örnekleme ve genel muayene önerilir.'
      });
    }
    if ((bandKey === 'act' || bandKey === 'check') && !actions.length) {
      actions.push({
        kind: 'genel',
        title: 'Genel kontrol',
        detail: 'Giriş, kapak ve koloni gücüne bakın.'
      });
    }
    if (bandKey === 'act' && score < 40 && !actions.some(function (a) { return a.kind === 'malzeme'; })) {
      actions.push({
        kind: 'malzeme',
        title: 'Malzeme kontrolü',
        detail: 'Çerçeve, örtü veya sabitleme malzemesini hazır tutun.'
      });
    }
    return actions;
  }

  function evaluateHive(h) {
    var devs = deviationsFromHive(h);
    var score = scoreFromDevs(devs);
    var b = band(score);
    var rules = rulesFired(devs, devs.readings);
    var actions = publicActions(h, rules, score, b.key);
    var materials = materialsForActions(actions);
    return {
      hiveId: h && h.id,
      apiaryId: h && h.apiaryId,
      name: (h && (h.name || ('Kovan ' + h.id))) || '—',
      score: score,
      band: b,
      actions: actions,
      materials: materials,
      primaryKind: actions[0] ? actions[0].kind : null,
      openHive: score < 50
    };
  }

  function evaluateAll(hives) {
    var list = (hives || []).map(evaluateHive);
    var sum = 0;
    list.forEach(function (x) { sum += x.score; });
    var avg = list.length ? Math.round(sum / list.length) : 100;

    var D = global.SuperAriDemo;
    var nameById = {};
    if (D && typeof D.loadApiaries === 'function') {
      D.loadApiaries().forEach(function (a) {
        nameById[a.id] = a.name || a.place || a.id;
      });
    }

    function groupByApiary(items) {
      var map = {};
      items.forEach(function (x) {
        var aid = String(x.apiaryId || 'none');
        if (!map[aid]) {
          map[aid] = {
            apiaryId: aid,
            apiaryName: nameById[aid] || (aid === 'none' ? 'Atanmamış' : aid),
            hives: [],
            materials: {}
          };
        }
        map[aid].hives.push(x);
        (x.materials || []).forEach(function (m) {
          if (!map[aid].materials[m.id]) {
            map[aid].materials[m.id] = {
              id: m.id, name: m.name, qty: 0, unit: m.unit
            };
          }
          map[aid].materials[m.id].qty += Number(m.qty) || 0;
        });
      });
      return Object.keys(map).map(function (k) {
        var g = map[k];
        g.materials = Object.keys(g.materials).map(function (id) { return g.materials[id]; })
          .sort(function (a, b) { return String(a.name).localeCompare(String(b.name), 'tr'); });
        g.hives.sort(function (a, b) { return a.score - b.score; });
        return g;
      }).sort(function (a, b) {
        return String(a.apiaryName).localeCompare(String(b.apiaryName), 'tr');
      });
    }

    return {
      avg: avg,
      band: band(avg),
      hives: list.slice().sort(function (a, b) { return a.score - b.score; }),
      byApiary: groupByApiary(list),
      counts: {
        ok: list.filter(function (x) { return x.score >= 85; }).length,
        watch: list.filter(function (x) { return x.score >= 70 && x.score < 85; }).length,
        check: list.filter(function (x) { return x.score >= 50 && x.score < 70; }).length,
        act: list.filter(function (x) { return x.score < 50; }).length
      },
      materialsForActions: materialsForActions,
      groupByApiary: groupByApiary
    };
  }

  global.SuperAriSensorHealth = {
    band: band,
    evaluateHive: evaluateHive,
    evaluateAll: evaluateAll,
    materialsForActions: materialsForActions
  };
})(window);

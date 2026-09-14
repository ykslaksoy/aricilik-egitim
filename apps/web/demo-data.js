/**
 * Shared static demo data for panel pages (arici / kovanlar / uyarilar / gorevler).
 * Replaces missing SuperAriDemo dependency so list pages render without API.
 */
(function (global) {
  var apiaries = [
    { id: 'a1', name: 'Arılık Kuzey', place: 'Erzurum', hiveCount: 42 },
    { id: 'a2', name: 'Arılık Güney', place: 'Erzurum', hiveCount: 35 },
    { id: 'a3', name: 'Yayla', place: 'Palandöken', hiveCount: 23 }
  ];

  var hives = [
    { id: 101, name: 'Kovan 101', apiaryId: 'a1', weightKg: 38.2, deltaKg: 1.2, health: 'İyi', healthScore: 88, colonyScore: 82, swarmRisk: 'Düşük' },
    { id: 102, name: 'Kovan 102', apiaryId: 'a1', weightKg: 35.6, deltaKg: 0.4, health: 'İyi', healthScore: 84, colonyScore: 79, swarmRisk: 'Düşük' },
    { id: 118, name: 'Kovan 118', apiaryId: 'a1', weightKg: 41.0, deltaKg: 1.8, health: 'Dikkat', healthScore: 62, colonyScore: 71, swarmRisk: 'Orta' },
    { id: 204, name: 'Kovan 204', apiaryId: 'a2', weightKg: 33.1, deltaKg: -0.3, health: 'İyi', healthScore: 90, colonyScore: 86, swarmRisk: 'Düşük' },
    { id: 211, name: 'Kovan 211', apiaryId: 'a2', weightKg: 29.4, deltaKg: 0.1, health: 'Kritik', healthScore: 41, colonyScore: 48, swarmRisk: 'Yüksek' },
    { id: 305, name: 'Kovan 305', apiaryId: 'a3', weightKg: 36.8, deltaKg: 0.9, health: 'İyi', healthScore: 85, colonyScore: 80, swarmRisk: 'Düşük' }
  ];

  var alerts = [
    { id: 'al1', title: 'Oğul riski yükseldi', type: 'ogul', hiveId: 211, severity: 'high' },
    { id: 'al2', title: 'Sağlık skoru düştü', type: 'saglik', hiveId: 118, severity: 'medium' },
    { id: 'al3', title: 'Tartı ani değişim', type: 'tarti', hiveId: 101, severity: 'low' },
    { id: 'al4', title: 'Oğul: acil müdahale', type: 'ogul', hiveId: 211, severity: 'high' }
  ];

  var tasks = [
    { id: 't1', title: 'Kovan 211 oğul kontrolü', hiveId: 211, priority: 1 },
    { id: 't2', title: 'Kuzey tartı kalibrasyonu', hiveId: 101, priority: 2 },
    { id: 't3', title: 'Petek tarama — 118', hiveId: 118, priority: 2 },
    { id: 't4', title: 'Yayla besleme kontrolü', hiveId: 305, priority: 3 },
    { id: 't5', title: 'Güney çerçeve değişimi', hiveId: 204, priority: 3 }
  ];

  function hiveById(id) {
    var n = Number(id);
    for (var i = 0; i < hives.length; i++) {
      if (hives[i].id === n) return hives[i];
    }
    return null;
  }

  function apiaryById(id) {
    for (var i = 0; i < apiaries.length; i++) {
      if (apiaries[i].id === id) return apiaries[i];
    }
    return null;
  }

  global.SuperAriDemo = {
    apiaries: apiaries,
    hives: hives,
    alerts: alerts,
    tasks: tasks,
    counts: {
      alerts: alerts.length,
      tasks: tasks.length,
      hives: 100,
      apiaries: apiaries.length
    },
    hiveById: hiveById,
    apiaryById: apiaryById
  };
})(window);

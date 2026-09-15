/**
 * Shared Giderler + taşıma kaydı (localStorage).
 * Nakliye = üçüncü taraf; Kendi araç = zorunlu Yakıt gideri.
 */
(function (global) {
  var STORAGE_KEY = 'superari.giderler.v1';
  var TRANSPORT_KEY = 'superari.tasimalar.v1';

  var CATEGORIES = [
    { id: 'yem', label: 'Yem', color: '#d4a017' },
    { id: 'ilac', label: 'İlaç', color: '#e03131' },
    { id: 'ekipman', label: 'Ekipman', color: '#1c7ed6' },
    { id: 'nakliye', label: 'Nakliye', color: '#2f9e44' },
    { id: 'yakit', label: 'Yakıt', color: '#e8590c' },
    { id: 'diger', label: 'Diğer', color: '#7048e8' }
  ];

  var SEED_EXPENSES = [
    { id: 'g1', title: 'Şeker şurubu (25 kg)', category: 'yem', amount: 2800, date: '2026-09-02' },
    { id: 'g2', title: 'Polen ikamesi', category: 'yem', amount: 1400, date: '2026-08-28' },
    { id: 'g3', title: 'Varroa damlatma', category: 'ilac', amount: 1680, date: '2026-09-05' },
    { id: 'g4', title: 'Organik asit seti', category: 'ilac', amount: 1200, date: '2026-08-20' },
    { id: 'g5', title: 'Çerçeve teli + mum', category: 'ekipman', amount: 1450, date: '2026-09-01' },
    { id: 'g6', title: 'Maske / eldiven', category: 'ekipman', amount: 950, date: '2026-08-15' },
    {
      id: 'g7',
      title: 'Yayla taşıma (nakliye)',
      category: 'nakliye',
      amount: 1560,
      date: '2026-08-10',
      transportMode: 'nakliye',
      transportId: 't-seed-1',
      note: 'Üçüncü taraf nakliye'
    },
    {
      id: 'g9',
      title: 'Yakıt — Tortum taşıma',
      category: 'yakit',
      amount: 1850,
      date: '2026-08-22',
      transportMode: 'kendi_arac',
      transportId: 't-seed-2',
      apiaryId: 'a2',
      apiaryName: 'Tortum Yayla Arılığı',
      note: 'Kendi araç'
    },
    { id: 'g8', title: 'Arılık bakım malzemesi', category: 'diger', amount: 960, date: '2026-09-08' }
  ];

  var SEED_TRANSPORTS = [
    {
      id: 't-seed-1',
      mode: 'nakliye',
      date: '2026-08-10',
      amount: 1560,
      giderId: 'g7',
      title: 'Yayla taşıma (nakliye)',
      note: 'Üçüncü taraf nakliye'
    },
    {
      id: 't-seed-2',
      mode: 'kendi_arac',
      date: '2026-08-22',
      amount: 1850,
      giderId: 'g9',
      apiaryId: 'a2',
      apiaryName: 'Tortum Yayla Arılığı',
      title: 'Yakıt — Tortum taşıma',
      note: 'Kendi araç'
    }
  ];

  function catById(id) {
    for (var i = 0; i < CATEGORIES.length; i++) {
      if (CATEGORIES[i].id === id) return CATEGORIES[i];
    }
    return CATEGORIES[CATEGORIES.length - 1];
  }

  function todayIso() {
    var d = new Date();
    return (
      d.getFullYear() +
      '-' +
      String(d.getMonth() + 1).padStart(2, '0') +
      '-' +
      String(d.getDate()).padStart(2, '0')
    );
  }

  function readJson(key) {
    try {
      var raw = localStorage.getItem(key);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  function writeJson(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) { /* ignore */ }
  }

  /** Ensure Yakıt category works even if older seed lacked g9. */
  function normalizeExpense(e) {
    if (!e || typeof e !== 'object') return null;
    var cat = String(e.category || 'diger');
    if (cat === 'fuel') cat = 'yakit';
    return {
      id: String(e.id || ('g' + Date.now())),
      title: String(e.title || '').trim() || 'Gider',
      category: cat,
      amount: Math.max(0, Number(e.amount) || 0),
      date: String(e.date || todayIso()),
      note: e.note != null ? String(e.note) : '',
      apiaryId: e.apiaryId != null ? String(e.apiaryId) : '',
      apiaryName: e.apiaryName != null ? String(e.apiaryName) : '',
      transportMode: e.transportMode === 'nakliye' || e.transportMode === 'kendi_arac'
        ? e.transportMode
        : '',
      transportId: e.transportId != null ? String(e.transportId) : ''
    };
  }

  function loadExpenses() {
    var parsed = readJson(STORAGE_KEY);
    if (Array.isArray(parsed) && parsed.length) {
      return parsed.map(normalizeExpense).filter(Boolean);
    }
    writeJson(STORAGE_KEY, SEED_EXPENSES);
    return SEED_EXPENSES.map(normalizeExpense);
  }

  function saveExpenses(list) {
    if (!Array.isArray(list)) return;
    writeJson(STORAGE_KEY, list.map(normalizeExpense).filter(Boolean));
  }

  function loadTransports() {
    var parsed = readJson(TRANSPORT_KEY);
    if (Array.isArray(parsed) && parsed.length) {
      return parsed;
    }
    /* Seed transports only when gider seed is also fresh / linked */
    var expenses = readJson(STORAGE_KEY);
    if (!expenses || !Array.isArray(expenses) || !expenses.length) {
      writeJson(TRANSPORT_KEY, SEED_TRANSPORTS);
      return SEED_TRANSPORTS.slice();
    }
    var hasSeedLink = expenses.some(function (e) {
      return e && (e.id === 'g7' || e.id === 'g9') && e.transportId;
    });
    if (hasSeedLink || !expenses.length) {
      writeJson(TRANSPORT_KEY, SEED_TRANSPORTS);
      return SEED_TRANSPORTS.slice();
    }
    writeJson(TRANSPORT_KEY, []);
    return [];
  }

  function saveTransports(list) {
    if (!Array.isArray(list)) return;
    writeJson(TRANSPORT_KEY, list);
  }

  /**
   * Record a taşıma event and linked gider.
   * mode: 'nakliye' | 'kendi_arac'
   * kendi_arac → category Yakıt (zorunlu tutar)
   * nakliye → category Nakliye
   */
  function recordTransport(input) {
    var mode = input && input.mode === 'kendi_arac' ? 'kendi_arac' : 'nakliye';
    var amount = Number(input && input.amount);
    if (!(amount > 0)) {
      throw new Error(
        mode === 'kendi_arac'
          ? 'Kendi araçta yakıt tutarı zorunludur.'
          : 'Nakliye tutarı girilmeli.'
      );
    }
    var date = String((input && input.date) || todayIso());
    var note = String((input && input.note) || '').trim();
    var apiaryId = input && input.apiaryId != null ? String(input.apiaryId) : '';
    var apiaryName = input && input.apiaryName != null ? String(input.apiaryName) : '';
    var title = String((input && input.title) || '').trim();
    if (!title) {
      title =
        mode === 'kendi_arac'
          ? (apiaryName ? 'Yakıt — ' + apiaryName : 'Yakıt masrafı (kendi araç)')
          : (apiaryName ? 'Nakliye — ' + apiaryName : 'Nakliye');
    }

    var transportId = 't' + Date.now();
    var giderId = 'g' + Date.now();
    var category = mode === 'kendi_arac' ? 'yakit' : 'nakliye';

    var gider = normalizeExpense({
      id: giderId,
      title: title,
      category: category,
      amount: amount,
      date: date,
      note: note || (mode === 'kendi_arac' ? 'Kendi araç yakıt' : 'Nakliye'),
      apiaryId: apiaryId,
      apiaryName: apiaryName,
      transportMode: mode,
      transportId: transportId
    });

    var transport = {
      id: transportId,
      mode: mode,
      date: date,
      amount: amount,
      giderId: giderId,
      apiaryId: apiaryId,
      apiaryName: apiaryName,
      title: title,
      note: note
    };

    var expenses = loadExpenses();
    expenses.push(gider);
    saveExpenses(expenses);

    var transports = loadTransports();
    transports.push(transport);
    saveTransports(transports);

    return { gider: gider, transport: transport };
  }

  function addExpense(input) {
    var mode = input && input.transportMode;
    if (mode === 'nakliye' || mode === 'kendi_arac') {
      return recordTransport({
        mode: mode,
        amount: input.amount,
        date: input.date,
        note: input.note,
        apiaryId: input.apiaryId,
        apiaryName: input.apiaryName,
        title: input.title
      }).gider;
    }
    var expenses = loadExpenses();
    var gider = normalizeExpense({
      id: 'g' + Date.now(),
      title: input && input.title,
      category: input && input.category,
      amount: input && input.amount,
      date: input && input.date,
      note: input && input.note,
      apiaryId: input && input.apiaryId,
      apiaryName: input && input.apiaryName
    });
    if (!(gider.amount > 0) || !gider.title) {
      throw new Error('Başlık ve tutar gerekli.');
    }
    expenses.push(gider);
    saveExpenses(expenses);
    return gider;
  }

  function transportsForApiary(apiaryId) {
    var key = String(apiaryId || '');
    return loadTransports()
      .filter(function (t) {
        return !key || String(t.apiaryId) === key;
      })
      .sort(function (a, b) {
        return String(b.date).localeCompare(String(a.date));
      });
  }

  Object.defineProperty(global, 'SuperAriGider', {
    configurable: true,
    enumerable: true,
    value: {
      STORAGE_KEY: STORAGE_KEY,
      TRANSPORT_KEY: TRANSPORT_KEY,
      CATEGORIES: CATEGORIES,
      SEED_EXPENSES: SEED_EXPENSES,
      catById: catById,
      todayIso: todayIso,
      loadExpenses: loadExpenses,
      saveExpenses: saveExpenses,
      loadTransports: loadTransports,
      saveTransports: saveTransports,
      recordTransport: recordTransport,
      addExpense: addExpense,
      transportsForApiary: transportsForApiary
    }
  });
})(window);

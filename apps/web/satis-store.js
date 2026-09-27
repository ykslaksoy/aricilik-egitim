/**
 * SüperArı · Satış ve müşteri kaydı (cihazda; Canlı kayıtlar buluta eşitlenir).
 * Canlı: superari.musteriler.v1 / superari.satislar.v1 · Demo: .demo.v1 (buluta gitmez).
 * Satışlar Kâr / zarar raporuna gelir olarak otomatik girer (rapor-store.js okur).
 */
(function (global) {
  var PRODUCTS = [
    { key: 'bal', label: 'Bal', unit: 'kg', src: 'bal' },
    { key: 'petek', label: 'Petek bal', unit: 'kg', src: 'bal' },
    { key: 'polen', label: 'Polen', unit: 'kg', src: 'polen' },
    { key: 'propolis', label: 'Propolis', unit: 'gr', src: 'propolis' },
    { key: 'balmumu', label: 'Balmumu', unit: 'kg', src: 'balmumu' },
    { key: 'ana_ari', label: 'Ana arı', unit: 'adet', src: 'ana' },
    { key: 'ogul', label: 'Oğul / paket arı', unit: 'adet', src: 'ogul' },
    { key: 'diger', label: 'Diğer', unit: 'adet', src: 'diger' }
  ];
  var HONEY_TYPES = ['Çiçek', 'Çam', 'Kestane', 'Yayla', 'Ayçiçeği', 'Narenciye', 'Akasya', 'Karakovan', 'Diğer'];
  var UNITS = ['kg', 'gr', 'adet', 'kavanoz'];
  var PAY = { odendi: 'Ödendi', kismi: 'Kısmi ödendi', bekliyor: 'Ödeme bekliyor' };

  function live() { try { return localStorage.getItem('superari.workMode') === 'live'; } catch (e) { return false; } }
  function key(base) { return live() ? base : base.replace(/\.v(\d+)$/, '.demo.v$1'); }
  var CUST_BASE = 'superari.musteriler.v1', SALE_BASE = 'superari.satislar.v1';
  function read(k) { try { var a = JSON.parse(localStorage.getItem(k) || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
  function write(k, a) { try { localStorage.setItem(k, JSON.stringify(a)); } catch (e) { throw new Error('Kaydedilemedi (depolama dolu olabilir)'); } }
  function newId(p) { return p + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function txt(v, n) { var t = String(v == null ? '' : v).trim(); return t.slice(0, n || 120); }
  function num(v) {
    var s = String(v == null ? '' : v).replace(/[\s₺]/g, '');
    if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) s = s.replace(/\./g, '');
    var n = Number(s.replace(',', '.'));
    return isFinite(n) ? n : NaN;
  }
  function r2(n) { return Math.round(n * 100) / 100; }
  function today() { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function product(k) { for (var i = 0; i < PRODUCTS.length; i++) if (PRODUCTS[i].key === k) return PRODUCTS[i]; return PRODUCTS[PRODUCTS.length - 1]; }
  function tag(o) { if (!live()) o.demo = true; return o; }

  /* ---------- müşteriler ---------- */
  function customers() { return read(key(CUST_BASE)).slice().sort(function (a, b) { return String(a.name).localeCompare(String(b.name), 'tr'); }); }
  function customerById(id) { return read(key(CUST_BASE)).filter(function (c) { return c && String(c.id) === String(id); })[0] || null; }
  function saveCustomer(o) {
    o = o || {};
    var name = txt(o.name, 80);
    if (!name) throw new Error('Müşteri adını yazın');
    var list = read(key(CUST_BASE)), now = new Date().toISOString();
    if (o.id) {
      var hit = false;
      list = list.map(function (c) {
        if (String(c.id) !== String(o.id)) return c;
        hit = true;
        return tag({ id: c.id, name: name, phone: txt(o.phone, 30), city: txt(o.city, 60), note: txt(o.note, 200), createdAt: c.createdAt || now, date: (c.createdAt || now).slice(0, 10), updatedAt: now });
      });
      if (!hit) throw new Error('Müşteri bulunamadı');
      write(key(CUST_BASE), list);
      /* satışlardaki ad kopyasını güncelle */
      var sl = read(key(SALE_BASE)), ch = false;
      sl.forEach(function (s) { if (String(s.customerId) === String(o.id) && s.customerName !== name) { s.customerName = name; ch = true; } });
      if (ch) write(key(SALE_BASE), sl);
      return customerById(o.id);
    }
    var dup = list.filter(function (c) { return String(c.name).toLocaleLowerCase('tr') === name.toLocaleLowerCase('tr') && (!o.phone || c.phone === txt(o.phone, 30)); })[0];
    if (dup) return dup;
    var row = tag({ id: newId('m'), name: name, phone: txt(o.phone, 30), city: txt(o.city, 60), note: txt(o.note, 200), createdAt: now, date: now.slice(0, 10) });
    list.push(row); write(key(CUST_BASE), list);
    return row;
  }
  function removeCustomer(id) {
    var used = read(key(SALE_BASE)).some(function (s) { return String(s.customerId) === String(id); });
    if (used) throw new Error('Bu müşterinin satış kaydı var; önce satışları silin.');
    write(key(CUST_BASE), read(key(CUST_BASE)).filter(function (c) { return String(c.id) !== String(id); }));
    return true;
  }

  /* ---------- satışlar ---------- */
  function sales() { return read(key(SALE_BASE)).slice().sort(function (a, b) { return a.date < b.date ? 1 : (a.date > b.date ? -1 : String(b.createdAt || '').localeCompare(String(a.createdAt || ''))); }); }
  function apiaryName(id) {
    try { var a = global.SuperAriDemo && global.SuperAriDemo.apiaryById ? global.SuperAriDemo.apiaryById(id) : null; return a ? (a.name || '') : ''; } catch (e) { return ''; }
  }
  function normSale(o, prev) {
    var p = product(o.product);
    var qty = num(o.qty), price = num(o.unitPrice);
    if (!(qty > 0)) throw new Error('Miktarı girin');
    if (!(price >= 0) || isNaN(price)) throw new Error('Birim fiyatı girin');
    var total = r2(qty * price);
    var totalIn = num(o.total);
    if (totalIn > 0) total = r2(totalIn); /* toplam elle düzeltildiyse o geçerli */
    if (!(total > 0)) throw new Error('Toplam tutar 0 olamaz');
    var date = /^\d{4}-\d{2}-\d{2}$/.test(String(o.date || '')) ? String(o.date) : today();
    var pay = PAY[o.payment] ? o.payment : 'odendi';
    var paid = pay === 'odendi' ? total : (pay === 'bekliyor' ? 0 : r2(Math.max(0, Math.min(total, num(o.paidAmount) || 0))));
    if (pay === 'kismi' && !(paid > 0 && paid < total)) throw new Error('Kısmi ödemede alınan tutar 0 ile toplam arasında olmalı');
    var cust = o.customerId ? customerById(o.customerId) : null;
    var unit = UNITS.indexOf(o.unit) >= 0 ? o.unit : p.unit;
    var apId = txt(o.apiaryId, 40);
    return tag({
      id: prev ? prev.id : newId('s'), date: date, customerId: cust ? cust.id : '', customerName: cust ? cust.name : (txt(o.customerName, 80) || 'Perakende'),
      product: p.key, honeyType: (p.key === 'bal' || p.key === 'petek') ? txt(o.honeyType, 30) : '', qty: r2(qty), unit: unit, unitPrice: r2(price), total: total,
      payment: pay, paidAmount: paid, apiaryId: apId, apiaryName: apId ? apiaryName(apId) : '', note: txt(o.note, 200),
      createdAt: prev ? prev.createdAt : new Date().toISOString(), updatedAt: new Date().toISOString()
    });
  }
  function addSale(o) { var row = normSale(o || {}); var l = read(key(SALE_BASE)); l.push(row); write(key(SALE_BASE), l); return row; }
  function updateSale(id, o) {
    var l = read(key(SALE_BASE)), out = null;
    l = l.map(function (s) { if (String(s.id) !== String(id)) return s; out = normSale(o || {}, s); return out; });
    if (!out) throw new Error('Satış bulunamadı');
    write(key(SALE_BASE), l); return out;
  }
  function markPaid(id) {
    var l = read(key(SALE_BASE)), hit = null;
    l.forEach(function (s) { if (String(s.id) === String(id)) { s.payment = 'odendi'; s.paidAmount = s.total; s.updatedAt = new Date().toISOString(); hit = s; } });
    if (hit) write(key(SALE_BASE), l);
    return hit;
  }
  function removeSale(id) { write(key(SALE_BASE), read(key(SALE_BASE)).filter(function (s) { return String(s.id) !== String(id); })); return true; }
  function saleLabel(s) {
    var p = product(s.product);
    var q = String(s.qty).replace('.', ',') + ' ' + s.unit;
    return p.label + (s.honeyType ? ' (' + s.honeyType + ')' : '') + ' · ' + q;
  }
  /** Özet: { total, paid, due, count, honeyKg, byProduct:{key:{label,total,qty,unit}}, byCustomer:{id:{name,total,due,count}} } */
  function summary(year) {
    var list = sales().filter(function (s) { return !year || String(s.date).slice(0, 4) === String(year); });
    var o = { total: 0, paid: 0, due: 0, count: list.length, honeyKg: 0, byProduct: {}, byCustomer: {} };
    list.forEach(function (s) {
      o.total += s.total; o.paid += s.paidAmount || 0; o.due += Math.max(0, s.total - (s.paidAmount || 0));
      if ((s.product === 'bal' || s.product === 'petek') && s.unit === 'kg') o.honeyKg += s.qty;
      var p = product(s.product), bp = o.byProduct[p.key] = o.byProduct[p.key] || { label: p.label, total: 0, qty: 0, unit: s.unit };
      bp.total += s.total; if (bp.unit === s.unit) bp.qty += s.qty;
      var ck = s.customerId || ('ad:' + s.customerName), bc = o.byCustomer[ck] = o.byCustomer[ck] || { id: s.customerId, name: s.customerName, total: 0, due: 0, count: 0 };
      bc.total += s.total; bc.due += Math.max(0, s.total - (s.paidAmount || 0)); bc.count += 1;
    });
    ['total', 'paid', 'due', 'honeyKg'].forEach(function (k) { o[k] = r2(o[k]); });
    return o;
  }

  global.SuperAriSatis = {
    PRODUCTS: PRODUCTS, HONEY_TYPES: HONEY_TYPES, UNITS: UNITS, PAY: PAY, product: product,
    customers: customers, customerById: customerById, saveCustomer: saveCustomer, removeCustomer: removeCustomer,
    sales: sales, addSale: addSale, updateSale: updateSale, markPaid: markPaid, removeSale: removeSale, saleLabel: saleLabel, summary: summary,
    get CUST_KEY() { return key(CUST_BASE); }, get SALE_KEY() { return key(SALE_BASE); }
  };
})(window);

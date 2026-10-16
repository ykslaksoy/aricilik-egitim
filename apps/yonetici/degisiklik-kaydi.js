/* koloni-221 (k223: tüm eşitlenen tablolar + yedekten geri yükleme): Değişiklik kaydı (public.sa_degisiklik) — liste + Geri al. Uygulama (Ayarlar) ve Yönetici paneli ortak. */
(function (g) {
  'use strict';
  var TB = { apiaries: 'Arılık', hives: 'Kovan', queens: 'Ana arı', records: 'Kayıt (muayene/tartım/tedavi/besleme/hasat…)', tasks: 'Görev', stock_items: 'Stok', photos: 'Fotoğraf', apiary_members: 'Ekip / rol', cihaz_devre_disi: 'Cihaz', ayar: 'Yönetici ayarı', sa_yedek_ayar: 'Yedek saklama süresi' };
  var IS = { ekle: 'Eklendi', guncelle: 'Değiştirildi', sil: 'Silindi', geri_al: 'Geri alındı', geri_yukle: 'Yedekten geri yüklendi' };
  var GIZ = { updated_at: 1, server_updated_at: 1, updated_by: 1, created_at: 1, created_by: 1, owner_id: 1, apiary_id: 1, user_id: 1, local_id: 1, key: 1, id: 1 };
  var AD = { devre_disi: 'Devre dışı', name: 'Ad', role: 'Rol', deleted: 'Silindi', mali_gorur: 'Mali verileri görür', gorev_atar: 'Görev atar', duzenler: 'Düzenler', kayit_gorur: 'Kaydı görür', geri_alir: 'Geri alabilir', cihaz_ad: 'Cihaz', kovan_ad: 'Kovan', arilik_ad: 'Arılık', kuralKapali: 'Kapalı kurallar', sensor: 'Sensör eşiği' };
  function alanAd(k) { return k.split('.').filter(function (p) { return p !== 'data'; }).map(function (p) { return AD[p] || p; }).join(' › ') || k; }
  var ROL = { owner: 'Sahip', arici: 'Arıcı', bakici: 'Bakıcı' };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function tf(iso) { var d = new Date(iso); return isFinite(d) ? d.toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) + ' (TSİ)' : '—'; }
  function val(v, k) {
    if (v === undefined || v === null || v === '') return '—';
    if (k === 'role') return ROL[v] || v;
    if (v === true) return 'Evet'; if (v === false) return 'Hayır';
    var s = typeof v === 'object' ? JSON.stringify(v) : String(v); return s.length > 60 ? s.slice(0, 57) + '…' : s;
  }
  function fark(o, n, pre) {
    o = o || {}; n = n || {}; var out = [], ks = {}; Object.keys(o).concat(Object.keys(n)).forEach(function (k) { ks[k] = 1; });
    Object.keys(ks).forEach(function (k) {
      if (!pre && GIZ[k]) return;
      var a = o[k], b = n[k]; if (JSON.stringify(a) === JSON.stringify(b)) return;
      if (a && b && typeof a === 'object' && typeof b === 'object' && !Array.isArray(a) && !Array.isArray(b)) { out = out.concat(fark(a, b, (pre || '') + k + '.')); return; }
      out.push({ k: (pre || '') + k, a: val(a, k), b: val(b, k) });
    });
    return out;
  }
  function satir(e, opt) {
    var f = e.islem === 'ekle' ? [] : e.islem === 'sil' && !e.sonra ? [] : fark(e.once, e.sonra);
    var kap = [e.arilik_ad, e.kovan_ad].filter(Boolean).join(' › ') || (e.tablo === 'ayar' ? 'Tüm hesaplar' : '—');
    var ad = (e.sonra || e.once || {}).name || (e.sonra || e.once || {}).cihaz_ad || '';
    var geri = e.geri_alan ? '<span class="dk-et">Geri alındı (#' + e.geri_alan + ')</span>'
      : ((typeof opt.geriAl === 'function' ? opt.geriAl(e) : opt.geriAl) && e.islem !== 'geri_al' ? '<button type="button" class="btn dk-geri" data-dk-geri="' + e.id + '">Geri al</button>' : '');
    return '<li class="dk-li" style="padding:.55rem 0;border-bottom:1px solid #e5e7eb;list-style:none">'
      + '<div style="display:flex;justify-content:space-between;gap:.5rem;align-items:flex-start"><div><b>#' + e.id + ' · ' + esc(TB[e.tablo] || e.tablo) + ' ' + esc(IS[e.islem] || e.islem).toLowerCase() + '</b>' + (ad ? ' · ' + esc(ad) : '')
      + '<br><small>' + esc(tf(e.at)) + ' · ' + esc(e.email || '—') + ' (' + esc(e.rol || '—') + ')</small><br><small>Kapsam: ' + esc(kap) + (e.geri_alinan ? ' · #' + e.geri_alinan + ' geri alındı' : '') + '</small></div><div style="flex:none">' + geri + '</div></div>'
      + (f.length ? '<ul style="margin:.3rem 0 0;padding-left:1rem;font-size:.85rem">' + f.slice(0, 8).map(function (x) { return '<li>' + esc(alanAd(x.k)) + ': ' + esc(x.a) + ' → <b>' + esc(x.b) + '</b></li>'; }).join('') + (f.length > 8 ? '<li>… ' + (f.length - 8) + ' alan daha</li>' : '') + '</ul>' : '')
      + '</li>';
  }
  function liste(rows, opt) { return rows.length ? '<ul style="margin:0;padding:0">' + rows.map(function (e) { return satir(e, opt || {}); }).join('') + '</ul>' : '<p class="mk-vy">Veri yok — henüz kayıtlı değişiklik yok.</p>'; }
  function hataMetni(er) { var m = (er && er.message) || 'bağlantı'; return /daha yeni bir değişiklik/.test(m) ? m + ' Böylece sonraki değişiklik kaybolmaz.' : m; }
  function geriAl(client, id) {
    return client.rpc('sa_degisiklik_geri_al', { p_id: Number(id) }).then(function (r) { if (r.error) throw r.error; return r.data; });
  }
  g.SuperAriDegisiklik = { liste: liste, satir: satir, fark: fark, geriAl: geriAl, hataMetni: hataMetni, TB: TB, IS: IS };
})(typeof window !== 'undefined' ? window : globalThis);

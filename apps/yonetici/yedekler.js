/* koloni-223: Tarihli yedekler (public.sa_yedek) + seçilen tarihe geri yükleme (önizleme → onay → kayıt → geri al). Uygulama (Ayarlar › Yedekler ve geri alma) ve Yönetici paneli ortak. */
(function (g) {
  'use strict';
  var TB = { apiaries: 'Arılıklar', hives: 'Kovanlar', queens: 'Ana arılar', records: 'Kayıtlar (muayene, tartım, tedavi, besleme, hasat, notlar…)', tasks: 'Görevler', stock_items: 'Stok', photos: 'Fotoğraf bilgileri', cihaz_devre_disi: 'Cihaz devre dışı' };
  var TB1 = { apiaries: 'Arılık', hives: 'Kovan', queens: 'Ana arı', records: 'Kayıt', tasks: 'Görev', stock_items: 'Stok', photos: 'Fotoğraf', cihaz_devre_disi: 'Cihaz' };
  var KIND = { strength: 'Muayene (güç)', brood: 'Muayene (yavru)', disease: 'Tedavi / hastalık', feed: 'Besleme', winter: 'Kışlatma', harvest: 'Hasat', colony_event: 'Koloni kaydı', gorev: 'Görev', tamamlama: 'Tamamlanan görev' };
  var TYPE = { elle_tarti: 'Tartım', gider: 'Gider', satis: 'Satış', gelir: 'Gelir', saglik: 'Sağlık skoru', goc: 'Göç', tasima: 'Taşıma', musteri: 'Müşteri', stok_talep: 'Stok talebi', not: 'Not', tedavi: 'Tedavi', besleme: 'Besleme' };
  var DUR = { eklenecek: 'Geri gelecek', degisecek: 'Değişecek', silinecek: 'Silinecek' };
  var TUR = { gunluk: 'Günlük', elle: 'Elle alınan', oncesi: 'Geri yükleme öncesi', boyut: 'Değişiklik birikince' };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function tf(iso) { var d = new Date(iso); return isFinite(d) ? d.toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) + ' (TSİ)' : '—'; }
  function gun(d) { var p = String(d || '').split('-'); return p.length === 3 ? p[2] + '.' + p[1] + '.' + p[0] : String(d || '—'); }
  function ad(x) {
    var r = x.yedekte || x.simdi || {}, dt = r.data || {};
    if (x.tablo === 'records') { var t = TYPE[dt.type] || KIND[r.kind] || 'Kayıt'; return t + (r.record_date ? ' · ' + gun(r.record_date) : ''); }
    if (x.tablo === 'tasks') return (dt.title || dt.text || dt.baslik || 'Görev') + (r.due ? ' · ' + gun(r.due) : '');
    if (x.tablo === 'cihaz_devre_disi') return r.cihaz_ad || r.device_id || 'Cihaz';
    return r.name || dt.name || dt.title || (TB1[x.tablo] + ' ' + String(x.key || '').slice(-6));
  }
  function ozet(o) { o = o || {}; return Object.keys(TB).filter(function (k) { return o[k]; }).map(function (k) { return TB1[k] + ' ' + o[k]; }).join(' · ') || 'boş'; }
  function yedekSatir(y, opt) {
    return '<div class="yd-li" style="padding:.55rem 0;border-bottom:1px solid #e5e7eb;display:flex;justify-content:space-between;gap:.5rem;align-items:center">'
      + '<div><b>' + esc(gun(y.tarih)) + '</b> · ' + esc(TUR[y.tur] || y.tur) + (opt && opt.email && y.email ? ' · ' + esc(y.email) : '')
      + '<br><small>' + esc(tf(y.at)) + '</small><br><small>' + esc(ozet(y.ozet)) + '</small></div>'
      + '<button type="button" class="btn ikincil yd-sec" data-yd="' + y.id + '" style="width:auto;flex:none;min-height:36px;padding:4px 12px">Önizle</button></div>';
  }
  function yedekListe(rows, opt) { return rows && rows.length ? '<div>' + rows.map(function (y) { return yedekSatir(y, opt); }).join('') + '</div>' : '<p class="mk-vy">Veri yok — henüz yedek alınmadı. Günlük yedek her gece 03:00 (TSİ) alınır.</p>'; }
  /* fark satırları → önizleme HTML. Tablo bazında gruplanır; her satırda «Yalnız bunu geri yükle». */
  function onizleme(rows, opt) {
    opt = opt || {};
    if (!rows || !rows.length) return '<p class="mk-vy">Bu tarihten bu yana değişen bir şey yok — geri yüklenecek fark yok.</p>';
    var by = {}; rows.forEach(function (x) { (by[x.tablo] = by[x.tablo] || []).push(x); });
    var sayac = { eklenecek: 0, degisecek: 0, silinecek: 0 }; rows.forEach(function (x) { sayac[x.durum] = (sayac[x.durum] || 0) + 1; });
    var h = '<p style="margin:.2rem 0 .5rem"><b>' + rows.length + ' değişiklik:</b> ' + sayac.eklenecek + ' geri gelecek, ' + sayac.degisecek + ' değişecek, ' + sayac.silinecek + ' silinecek.</p>';
    Object.keys(TB).forEach(function (t) {
      var L = by[t]; if (!L) return;
      h += '<details class="yd-grp" style="margin:.3rem 0;border:1px solid #ead9b3;border-radius:10px;padding:.35rem .6rem"><summary style="cursor:pointer;min-height:32px;display:flex;justify-content:space-between;align-items:center;gap:.4rem"><span><b>' + esc(TB[t]) + '</b> · ' + L.length + '</span>'
        + (opt.geri ? '<button type="button" class="btn ikincil" data-yd-tablo="' + t + '" style="width:auto;min-height:30px;padding:2px 10px;font-size:.8rem">Yalnız bu bölümü</button>' : '') + '</summary><div style="margin:.2rem 0">'
        + L.slice(0, 200).map(function (x) {
          return '<div style="padding:.3rem 0;border-top:1px solid #f0e6cf;display:flex;justify-content:space-between;gap:.4rem;align-items:center"><span><span class="yd-d yd-' + x.durum + '">' + esc(DUR[x.durum] || x.durum) + '</span> ' + esc(ad(x)) + '</span>'
            + (opt.geri ? '<button type="button" class="btn ikincil" data-yd-tablo="' + t + '" data-yd-key="' + esc(x.key) + '" style="width:auto;flex:none;min-height:30px;padding:2px 10px;font-size:.8rem">Yalnız bunu</button>' : '') + '</div>';
        }).join('') + (L.length > 200 ? '<div><small>… ' + (L.length - 200) + ' satır daha</small></div>' : '') + '</div></details>';
    });
    return h;
  }
  function kapsamMetni(t, k, rows) {
    if (!t) return 'tüm hesap (' + (rows ? rows.length : 0) + ' değişiklik)';
    if (!k) return TB[t] + ' bölümü (' + (rows ? rows.filter(function (x) { return x.tablo === t; }).length : 0) + ' değişiklik)';
    var x = (rows || []).filter(function (r) { return r.tablo === t && r.key === k; })[0];
    return TB1[t] + ': ' + (x ? ad(x) : k);
  }
  /* Yalnız telefonda kalan veriler: buluta eşitlenmeyen yerel anahtarlar (ör. cihaz listesi, bazı ayarlar) */
  function yalnizYerel() {
    var B = g.SuperAriBulut, Y = g.SuperAriYedek, LS = g.localStorage; if (!B || !Y || !LS) return [];
    var es = {}; Object.keys(B.SYNC_KEYS || {}).forEach(function (k) { es[B.SYNC_KEYS[k]] = 1; });
    var out = [];
    for (var i = 0; i < LS.length; i++) { var k = LS.key(i); if (!Y.keep(k) || es[k]) continue; var v = LS.getItem(k); if (!v || v === '[]' || v === '{}' || v === 'null') continue; out.push(Y.label(k)); }
    return out.sort();
  }
  function kapsamAd(k) { k = String(k || ''); var t = k.split(':')[0]; return TB[t] ? (k.indexOf(':') > 0 ? TB1[t] + ' (tek kayıt)' : TB1[t] + ' bölümü') : k; }
  function liste(c, hesap) { return c.rpc('sa_yedek_liste', { p_hesap: hesap || null }).then(function (r) { if (r.error) throw r.error; return r.data || []; }); }
  function fark(c, id, t, k) { return c.rpc('sa_yedek_fark', { p_yedek: Number(id), p_tablo: t || null, p_key: k || null }).then(function (r) { if (r.error) throw r.error; return r.data || []; }); }
  function geriYukle(c, id, t, k) { return c.rpc('sa_yedek_geri_yukle', { p_yedek: Number(id), p_tablo: t || null, p_key: k || null }).then(function (r) { if (r.error) throw r.error; return r.data; }); }
  function yuklemeGeriAl(c, id) { return c.rpc('sa_geri_yukleme_geri_al', { p_id: Number(id) }).then(function (r) { if (r.error) throw r.error; return r.data; }); }
  function simdiYedekle(c, hesap) { return c.rpc('sa_yedek_al', { p_hesap: hesap, p_tur: 'elle' }).then(function (r) { if (r.error) throw r.error; return r.data; }); }
  function yuklemeler(c, hesap) { var q = c.from('sa_geri_yukleme').select('*').order('id', { ascending: false }).limit(50); if (hesap) q = q.eq('hesap_id', hesap); return q.then(function (r) { if (r.error) throw r.error; return r.data || []; }); }
  function yuklemeListe(rows, geri) {
    if (!rows || !rows.length) return '<p class="mk-vy">Henüz geri yükleme yapılmadı.</p>';
    return '<div>' + rows.map(function (g2) {
      return '<div style="padding:.45rem 0;border-bottom:1px solid #e5e7eb;display:flex;justify-content:space-between;gap:.5rem;align-items:center"><div><b>#' + g2.id + ' · ' + esc(gun(g2.yedek_tarih)) + ' yedeğine dönüldü</b><br><small>' + esc(tf(g2.at)) + ' · ' + esc(g2.email || '—') + ' · ' + esc(kapsamAd(g2.kapsam)) + ' · ' + (g2.adet || 0) + ' değişiklik</small></div>'
        + (g2.geri_alindi_at ? '<span class="dk-et">Geri alındı</span>' : g2.telefon_yedek_id ? (geri === 'telefon' ? '<button type="button" class="btn ikincil" data-tk-geri="' + g2.id + '" style="width:auto;flex:none;min-height:34px;padding:4px 12px">Geri al</button>' : '<span class="dk-et">Telefonda geri alınır</span>') : (geri ? '<button type="button" class="btn ikincil" data-yk-geri="' + g2.id + '" style="width:auto;flex:none;min-height:34px;padding:4px 12px">Geri al</button>' : '')) + '</div>';
    }).join('') + '</div>';
  }
  /* Telefon yedekleri listesi */
  function telefonListe(rows, opt) {
    opt = opt || {};
    if (!rows || !rows.length) return '<p class="mk-vy">Veri yok — henüz telefon yedeği buluta gönderilmedi.</p>';
    var by = function (n) { n = +n || 0; return n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB'; };
    return '<div>' + rows.map(function (y) {
      return '<div class="yd-li" style="padding:.55rem 0;border-bottom:1px solid #e5e7eb;display:flex;justify-content:space-between;gap:.5rem;align-items:center"><div><b>' + esc(gun(y.tarih)) + '</b> · ' + esc(TUR[y.tur] || y.tur) + ' · ' + esc(y.cihaz_ad || 'Telefon')
        + (opt.email && y.email ? ' · ' + esc(y.email) : '') + '<br><small>' + esc(tf(y.at)) + ' · ' + by(y.boyut) + ' · ' + ((y.fotolar || []).length) + ' fotoğraf</small></div>'
        + (opt.sec === false ? '' : '<button type="button" class="btn ikincil" data-ty="' + y.id + '" style="width:auto;flex:none;min-height:36px;padding:4px 12px">Önizle</button>') + '</div>';
    }).join('') + '</div>';
  }
  g.SuperAriYedekBulut = { telefonListe: telefonListe, TB: TB, TB1: TB1, TUR: TUR, DUR: DUR, ad: ad, ozet: ozet, gun: gun, tf: tf, esc: esc, yedekListe: yedekListe, onizleme: onizleme, kapsamMetni: kapsamMetni, yalnizYerel: yalnizYerel,
    liste: liste, fark: fark, geriYukle: geriYukle, yuklemeGeriAl: yuklemeGeriAl, simdiYedekle: simdiYedekle, yuklemeler: yuklemeler, yuklemeListe: yuklemeListe };
})(typeof window !== 'undefined' ? window : globalThis);

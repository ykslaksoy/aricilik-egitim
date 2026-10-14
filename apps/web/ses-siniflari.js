/* k146: Cihazlar sayfası · Kovan ses sınıfları — sensör yoksa dürüst boş durum; varsa son 72 saat sınıf sayıları + ses uyarıları. */
(function () {
  var D = window.SuperAriDemo, C = D && D.colony;
  var host = document.getElementById('pageNote');
  if (!C || !host) return;
  var SEV = { kritik: 'Kritik', yuksek: 'Yüksek', erken: 'Erken uyarı', bilgi: 'Bilgi', kayit: 'Sadece kayıt' };
  var COL = { kritik: '#c92a2a', yuksek: '#e8590c', erken: '#a06a00', bilgi: '#1c7ed6', kayit: '#868e96' };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  var list = (C.SES_SINIFLARI || []).slice();
  function load(k) { try { var l = JSON.parse(localStorage.getItem(k) || '[]'); return Array.isArray(l) ? l : []; } catch (e) { return []; } }
  var from = Date.now() - 72 * 3600e3;
  var ses = load('superari.sensor.ses.v1').concat(load('superari.sensor.titresim.v1')).filter(function (x) { var t = Date.parse(x.at); return isFinite(t) && t >= from; });
  var cnt = {}; ses.forEach(function (x) { if (x.sinif) cnt[x.sinif] = (cnt[x.sinif] || 0) + 1; });
  var alerts = []; try { alerts = (D.alerts || []).filter(function (a) { return a && a.type === 'ses'; }); } catch (e) { alerts = []; }
  var h = '<section class="ses-sec" id="sesSiniflari" style="margin-top:14px;background:#fff;border:1px solid #e6e8ec;border-radius:14px;padding:10px 12px">' +
    '<h2 style="font-size:16px;margin:0 0 4px">Kovan ses sınıfları</h2>';
  if (!ses.length) {
    h += '<p class="meta" id="sesBos" style="margin:0 0 8px">Ses sensörü bağlı değil — son 72 saatte ses verisi yok. Sensör takılınca sesler aşağıdaki sınıflarla etiketlenip kaydedilir; uyarılar ancak veri gelince oluşur.</p>';
  } else {
    h += '<p class="meta" style="margin:0 0 8px">Son 72 saat: ' + ses.length + ' ses okuması.</p>';
    if (alerts.length) h += alerts.map(function (a) { return '<p style="margin:0 0 6px;padding:6px 8px;border-radius:10px;background:' + (a.severity === 'high' ? '#fff5f5' : '#fff9db') + ';font-size:13px">⚠️ ' + esc(a.title) + '</p>'; }).join('');
  }
  h += list.map(function (c) {
    var hz = c.hzMin != null ? c.hzMin + '–' + c.hzMax + ' Hz' : 'spektral';
    return '<details style="border-top:1px solid #f1f3f5;padding:6px 0"><summary style="font-size:13px;cursor:pointer"><b>' + esc(c.ad) + '</b> · ' + esc(hz) +
      ' · <span style="color:' + COL[c.seviye] + ';font-weight:700">' + SEV[c.seviye] + (c.zayif ? ' (kaynak zayıf)' : '') + '</span>' + (cnt[c.id] ? ' · ' + cnt[c.id] + ' olay' : '') + '</summary>' +
      '<div style="font-size:12px;color:#4b5563;padding:4px 0 2px">' + esc(c.en) + ' — ' + esc(c.yapi) + '<br><b>Anlam:</b> ' + esc(c.anlam) + '<br><b>Kaynak:</b> ' + esc(c.zayif && c.kaynak === '—' ? 'Doğrulanmış hakemli kaynak bulunamadı — sadece kayıt' : c.kaynak) + '</div></details>';
  }).join('') + '</section>';
  host.insertAdjacentHTML('afterend', h);
})();

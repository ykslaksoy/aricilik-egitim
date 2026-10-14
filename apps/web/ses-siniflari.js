/* k150: Cihazlar · Kovan sesleri — kurallar arka planda çalışır; burada yalnız uyarılar ve kısa öneri görünür (detaylar yalnız yönetici panelinde). */
(function () {
  var D = window.SuperAriDemo, host = document.getElementById('pageNote');
  if (!D || !host) return;
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function load(k) { try { var l = JSON.parse(localStorage.getItem(k) || '[]'); return Array.isArray(l) ? l : []; } catch (e) { return []; } }
  var from = Date.now() - 72 * 3600e3;
  var ses = load('superari.sensor.ses.v1').concat(load('superari.sensor.titresim.v1')).filter(function (x) { var t = Date.parse(x.at); return isFinite(t) && t >= from; });
  var alerts = []; try { alerts = (D.alerts || []).filter(function (a) { return a && a.type === 'ses'; }); } catch (e) { alerts = []; }
  var h = '<section class="ses-sec" id="sesSiniflari" style="margin-top:14px;background:#fff;border:1px solid #e6e8ec;border-radius:14px;padding:10px 12px"><h2 style="font-size:16px;margin:0 0 4px">Kovan sesleri</h2>';
  if (!ses.length) h += '<p class="meta" id="sesBos" style="margin:0">Ses sensörü bağlı değil. Sensör takılınca uyarılar burada görünür.</p>';
  else if (!alerts.length) h += '<p class="meta" style="margin:0">Ses uyarısı yok.</p>';
  else h += alerts.map(function (a) { return '<p style="margin:0 0 6px;padding:6px 8px;border-radius:10px;background:' + (a.severity === 'high' ? '#fff5f5' : '#fff9db') + ';font-size:13px">⚠️ ' + esc(a.title) + '</p>'; }).join('');
  host.insertAdjacentHTML('afterend', h + '</section>');
})();

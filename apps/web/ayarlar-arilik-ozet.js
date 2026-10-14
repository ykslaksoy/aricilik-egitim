/* koloni-144: Ayarlar › Arılık özeti — Ekip ve görev atama, Cihaz sağlığı, İzinsiz taşınma/açılma, Arılık haritası, Sezon sonu raporu.
   Yalnız cihazdaki kayıtlarla çalışır (çevrimdışı); ekip listesi bulut açıksa çekilir ve önbelleğe yazılır. Sensörsüz kullanılabilir. */
(function () {
  'use strict';
  var root = document.getElementById('arilik-ozet'); if (!root) return;
  var D = window.SuperAriDemo || {}, DV = window.SuperAriDevices, B = window.SuperAriBulut;
  var ASSIGN_KEY = 'superari.gorevAtama.v1', TEAM_KEY = 'superari.ekipCache.v1';
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function rj(k, d) { try { var v = JSON.parse(localStorage.getItem(k) || 'null'); return v == null ? d : v; } catch (e) { return d; } }
  function wj(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function $(id) { return document.getElementById(id); }
  function aps() { try { return (D.loadApiaries && D.loadApiaries()) || []; } catch (e) { return []; } }
  function hives() { try { return (D.loadHives && D.loadHives()) || []; } catch (e) { return []; } }
  function devs() { try { return (DV && DV.listDevices && DV.listDevices()) || []; } catch (e) { return []; } }
  function ago(min) { if (min == null || !isFinite(min)) return 'veri yok'; min = Math.round(min); return min < 60 ? min + ' dk önce' : min < 1440 ? Math.round(min / 60) + ' sa önce' : Math.round(min / 1440) + ' gün önce'; }
  function lastMin(d) { if (d.lastMins != null) return Number(d.lastMins); var t = Date.parse(d.lastSeen || d.last_seen || d.lastAt || d.updatedAt || ''); return isFinite(t) ? (Date.now() - t) / 60000 : null; }

  /* 1) Ekip ve görev atama */
  function paintTeam() {
    var team = rj(TEAM_KEY, { at: 0, people: [] }), asg = rj(ASSIGN_KEY, {});
    var tasks = []; try { tasks = (D.taskStore && D.taskStore.open && D.taskStore.open()) || []; } catch (e) {}
    var people = team.people || [];
    var h = '<p class="hint-inline" style="margin:0">' + (people.length ? 'Ekip: ' + people.map(function (p) { return esc(p.name); }).join(', ') + (team.at ? ' · ' + new Date(team.at).toLocaleDateString('tr-TR') + ' itibarıyla' : '') : 'Ekip listesi yok. Arılık sayfasından ekip üyesi davet edin; bulut açıksa burada görünür.') + '</p>';
    if (!tasks.length) h += '<p class="hint-inline" style="margin:0">Açık görev yok. <a href="gorevler.html">Görevler</a></p>';
    else h += tasks.slice(0, 15).map(function (t) {
      var opts = '<option value="">— Atanmadı —</option>' + people.map(function (p) { return '<option' + (asg[t.id] === p.name ? ' selected' : '') + '>' + esc(p.name) + '</option>'; }).join('');
      return '<label style="display:grid;gap:.2rem">' + esc(t.title || t.text || t.name || 'Görev') + (t.demo ? ' <small class="muted">(örnek)</small>' : '') +
        '<select data-task="' + esc(t.id) + '"' + (people.length ? '' : ' disabled') + '>' + opts + '</select></label>';
    }).join('');
    $('oz-ekip').innerHTML = h;
  }
  $('oz-ekip').addEventListener('change', function (e) { var id = e.target.getAttribute('data-task'); if (!id) return; var a = rj(ASSIGN_KEY, {}); if (e.target.value) a[id] = e.target.value; else delete a[id]; wj(ASSIGN_KEY, a); });
  function fetchTeam() {
    if (!B || !B.team || navigator.onLine === false) return;
    B.session().then(function (s) {
      if (!s) return;
      var list = aps(); if (!list.length) return;
      return Promise.all(list.map(function (a) { return B.team(a.id).catch(function () { return null; }); })).then(function (rs) {
        var seen = {}, people = [];
        rs.forEach(function (r) { ((r && r.members) || []).forEach(function (m) { var n = m.name || m.email || m.full_name; if (n && !seen[n]) { seen[n] = 1; people.push({ name: n, role: m.role }); } }); });
        wj(TEAM_KEY, { at: Date.now(), people: people }); paintTeam();
      });
    }).catch(function () {});
  }

  /* 2) Cihaz sağlığı */
  function paintDev() {
    var l = devs();
    if (!l.length) { $('oz-cihaz').innerHTML = '<p class="hint-inline" style="margin:0">Kayıtlı cihaz yok. Uygulama sensörsüz de tam çalışır; cihaz eklerseniz son veri zamanı burada görünür. <a href="cihazlar.html">Cihazlar</a></p>'; return; }
    l = l.slice().sort(function (a, b) { return (lastMin(b) || 1e9) - (lastMin(a) || 1e9); });
    $('oz-cihaz').innerHTML = '<ul style="margin:0;padding-left:1.1rem;display:grid;gap:.2rem">' + l.slice(0, 20).map(function (d) {
      var m = lastMin(d), bad = m == null || m > 180;
      return '<li><b>' + esc((DV.tipLabel && DV.tipLabel(d.tip)) || d.tip || 'Cihaz') + '</b>' + (d.hiveName ? ' · ' + esc(d.hiveName) : '') + ' — <span style="color:' + (bad ? '#b42318' : 'inherit') + '">son veri ' + esc(ago(m)) + '</span>' +
        (d.battery != null ? ' · pil %' + esc(d.battery) : '') + (d.demo || (DV.isDemo && DV.isDemo()) ? ' <small class="muted">(demo)</small>' : '') + '</li>';
    }).join('') + '</ul>';
  }

  /* 3) İzinsiz taşınma / açılma */
  function paintTheft() {
    var l = devs().filter(function (d) { return /titresim|ivme|gps|kapak|hareket/i.test(String(d.tip || '')); });
    var ev = rj('superari.izinsizOlay.v1', []);
    var h = '';
    if (!l.length) h = '<p class="hint-inline" style="margin:0">Titreşim / hareket sensörü yok, bu yüzden izinsiz taşınma veya kapak açılması algılanamaz. Titreşim (ivmeölçer) cihazı eklendiğinde uyarılar burada listelenir.</p>';
    else h = '<p class="hint-inline" style="margin:0">' + l.length + ' hareket sensörü izleniyor.</p>';
    h += ev.length ? '<ul style="margin:.3rem 0 0;padding-left:1.1rem">' + ev.slice(-10).reverse().map(function (x) { return '<li>' + esc(new Date(x.at).toLocaleString('tr-TR')) + ' · ' + esc(x.hive || '') + ' · ' + esc(x.text || 'hareket') + '</li>'; }).join('') + '</ul>' : (l.length ? '<p class="hint-inline" style="margin:0">Kayıtlı uyarı yok.</p>' : '');
    $('oz-izinsiz').innerHTML = h;
  }

  /* 4) Arılık haritası (çevrimdışı: koordinat listesi; çevrimiçi: harita bağlantısı) */
  function paintMap() {
    var l = aps();
    if (!l.length) { $('oz-harita').innerHTML = '<p class="hint-inline" style="margin:0">Arılık yok. <a href="ariliklar.html">Arılık ekle</a></p>'; return; }
    $('oz-harita').innerHTML = '<ul style="margin:0;padding-left:1.1rem;display:grid;gap:.2rem">' + l.map(function (a) {
      var ok = a.lat != null && a.lon != null && isFinite(a.lat) && isFinite(a.lon);
      return '<li><b>' + esc(a.name) + '</b> · ' + (ok ? Number(a.lat).toFixed(5) + ', ' + Number(a.lon).toFixed(5) + ' · <a target="_blank" rel="noopener" href="https://yandex.com.tr/harita/?pt=' + a.lon + ',' + a.lat + '&z=14">haritada aç</a>' : '<span class="muted">konum yok</span>') + '</li>';
    }).join('') + '</ul><p class="hint-inline" style="margin:.3rem 0 0">Çevrimdışı harita için yukarıdaki «Haritaları telefona indir» bölümünü kullanın · <a href="ariliklar.html">Arılıklar haritası</a></p>';
  }

  /* 5) Sezon sonu raporu */
  function paintSeason() {
    var yr = new Date().getFullYear(), hv = hives(), har = [];
    try { har = (D.harvests && D.harvests.list && D.harvests.list()) || []; } catch (e) {}
    har = har.filter(function (x) { return String(x.date || x.tarih || '').slice(0, 4) === String(yr); });
    var kg = har.reduce(function (s, x) { return s + (Number(x.kg || x.amountKg || x.miktar) || 0); }, 0), done = 0;
    try { done = ((D.taskStore && D.taskStore.done && D.taskStore.done()) || []).length; } catch (e) {}
    var none = !hv.length && !har.length;
    $('oz-sezon').innerHTML = none ? '<p class="hint-inline" style="margin:0">' + yr + ' sezonu için henüz kayıt yok (kovan, hasat). Kayıt girdikçe rapor dolar.</p>' :
      '<p class="hint-inline" style="margin:0">' + yr + ': ' + aps().length + ' arılık · ' + hv.length + ' kovan · ' + har.length + ' hasat kaydı' + (kg ? ' (' + Math.round(kg * 10) / 10 + ' kg)' : '') + ' · ' + done + ' tamamlanan görev.</p>' +
      '<a class="btn secondary" href="rapor-donem.html" style="text-decoration:none;text-align:center;margin-top:.4rem">📄 Dönem / sezon raporu</a>';
  }

  function all() { paintTeam(); paintDev(); paintTheft(); paintMap(); paintSeason(); }
  all(); fetchTeam();
  window.addEventListener('storage', all);
})();

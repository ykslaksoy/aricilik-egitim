/* Yönetici ana sayfa (önizleme): gruplanmış kısayollar, bölüm arama, yapışkan üst çubuk. Mevcut bölümler ve hash bağlantıları aynen çalışır. */
(function () {
  'use strict';
  var MOCK = /[?&]yon-mock=1(?:&|$)/.test(location.search);
  var shellDone = false;
  var lastLinkKey = '';
  var GRPS = [
    { id: 'g-op', title: 'Kullanıcı ve günlük işler', icon: '👥', hint: 'Hesaplar, ekip, yapılacaklar' },
    { id: 'g-sensor', title: 'Cihaz ve ölçüm', icon: '📡', hint: 'Sensörler, kuyruk, donanım' },
    { id: 'g-skor', title: 'Skor, kural ve tahmin', icon: '📊', hint: 'Oğul, eşik, hastalık, bal hedefi' },
    { id: 'g-veri', title: 'Veri, yedek ve arşiv', icon: '🗂️', hint: 'Yedek, harita, rakip arşivi' }
  ];

  function esc(t) {
    return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function groupFor(href) {
    var id = String(href || '').replace(/^#/, '');
    if (!id) return 'g-veri';
    if (/^(s-kul|s-ekip|s-bildirim|s-yapilacak|s-kullanim|feH|ieH|ekip)$/.test(id)) return 'g-op';
    if (/^(osSec|s-esik|s-ses|s-kural|s-hastalik-tahmin|s-bal-hedef|s-melez-yon|s-olcum)$/.test(id)) return 'g-skor';
    if (/^(s-cih|s-cihaz|s-cihaz-dd|s-donanim|s-otomatik|s-kuyruk|s-ozellik|s-sensor-arsiv|izn)$/.test(id)) return 'g-sensor';
    return 'g-veri';
  }

  function chipNav(host) {
    return host.querySelector('nav.nav') || host.querySelector('.nav');
  }

  function ensureChipNav(host) {
    var nav = host.querySelector('nav.nav');
    if (nav) return nav;
    nav = document.createElement('nav');
    nav.className = 'nav yon-chip-nav';
    var anchor = host.querySelector('#yon-ana') || host.children[1];
    host.insertBefore(nav, anchor || null);
    return nav;
  }

  function mockNav(host) {
    var nav = ensureChipNav(host);
    if (nav.querySelectorAll('a.chip[href^="#"]').length >= 3) return;
    var samples = [
      ['#yon-ana', 'Ana sayfa'], ['#s-kul', 'Kullanıcılar'], ['#s-esik', 'Eşikler'], ['#osSec', 'Oğul skorları'],
      ['#s-olcum', 'Ölçüm kuralları'], ['#s-cih', 'Cihaz sağlığı'], ['#s-yedek', 'Yedekler'], ['#s-rakip', 'Rakip arşivi'],
      ['#feH', 'Fiyatsız kalemler'], ['#s-har', 'Arılık haritası']
    ];
    nav.innerHTML = samples.map(function (x) { return '<a class="chip" href="' + x[0] + '">' + esc(x[1]) + '</a>'; }).join('');
  }

  function collectLinks(nav) {
    return [].map.call(nav.querySelectorAll('a.chip[href^="#"]'), function (a) {
      return { href: a.getAttribute('href'), label: (a.textContent || '').replace(/\s+/g, ' ').trim() };
    }).filter(function (x) { return x.href && x.href !== '#'; });
  }

  function linkKey(links) {
    return links.map(function (L) { return L.href; }).join('|');
  }

  function applyFilter(q, home, nav) {
    var needle = String(q || '').toLowerCase().trim();
    if (home) {
      [].forEach.call(home.querySelectorAll('[data-yon-link]'), function (card) {
        var hit = !needle || card.getAttribute('data-yon-label').toLowerCase().indexOf(needle) >= 0;
        card.hidden = !hit;
      });
      [].forEach.call(home.querySelectorAll('.yon-grp'), function (g) {
        var any = g.querySelector('[data-yon-link]:not([hidden])');
        g.hidden = needle && !any;
      });
    }
    if (nav) {
      [].forEach.call(nav.querySelectorAll('a.chip[href^="#"]'), function (a) {
        if (a.getAttribute('href') === '#yon-ana') { a.hidden = false; return; }
        var hit = !needle || (a.textContent || '').toLowerCase().indexOf(needle) >= 0;
        a.hidden = !needle ? false : !hit;
      });
    }
  }

  function buildHomeHtml(links) {
    var by = {};
    GRPS.forEach(function (g) { by[g.id] = []; });
    links.forEach(function (L) {
      if (L.href === '#yon-ana') return;
      var g = groupFor(L.href);
      by[g].push(L);
    });
    return GRPS.map(function (g) {
      var items = by[g.id] || [];
      if (!items.length) return '';
      return '<div class="yon-grp" data-grp="' + g.id + '"><div class="yon-grp-head"><span class="yon-grp-icon">' + g.icon + '</span><div><h3>' + esc(g.title) + '</h3><p>' + esc(g.hint) + '</p></div></div><div class="yon-grp-grid">' +
        items.map(function (L) {
          return '<a class="card action-card yon-tile" data-yon-link href="' + esc(L.href) + '" data-yon-label="' + esc(L.label) + '"><h3>' + esc(L.label) + '</h3><p>Bölüme git →</p></a>';
        }).join('') + '</div></div>';
    }).join('');
  }

  function refreshHome(links) {
    var home = document.getElementById('yon-ana');
    if (!home) return;
    var grid = home.querySelector('.yon-groups');
    if (!grid) return;
    var key = linkKey(links);
    if (key === lastLinkKey) return;
    lastLinkKey = key;
    grid.innerHTML = buildHomeHtml(links);
    var ara = document.getElementById('yonAra');
    if (ara && ara.value) applyFilter(ara.value, home, chipNav(document.getElementById('panel')));
  }

  function ensureShell(host, nav) {
    if (shellDone) return;
    var main = document.querySelector('main.wrap');
    if (main) main.classList.add('yon-wide');

    var who = document.getElementById('who');
    var cikis = document.getElementById('cikis');
    var oldBar = host.querySelector('div.nav');
    var shell = document.createElement('header');
    shell.className = 'yon-nav-shell';
    shell.id = 'yonNavShell';

    var top = document.createElement('div');
    top.className = 'yon-nav-top';
    if (who) top.appendChild(who);
    if (cikis) top.appendChild(cikis);
    shell.appendChild(top);

    var tools = document.createElement('div');
    tools.className = 'yon-nav-tools';
    tools.innerHTML = '<a class="chip yon-home-chip" href="#yon-ana">Ana sayfa</a>' +
      '<label class="yon-search"><span class="yon-sr">Bölüm ara</span><input type="search" id="yonAra" placeholder="Bölüm ara…" autocomplete="off" enterkeyhint="search" /></label>' +
      '<button type="button" class="chip yon-toggle-chips" id="yonChipToggle" aria-expanded="false">Tüm bölümler</button>';
    shell.appendChild(tools);

    host.insertBefore(shell, host.firstChild);
    if (oldBar) oldBar.remove();

    nav.classList.add('yon-chip-nav');
    if (shell.nextElementSibling !== nav) host.insertBefore(nav, shell.nextElementSibling);

    var chipBtn = document.getElementById('yonChipToggle');
    if (chipBtn) {
      chipBtn.addEventListener('click', function () {
        var open = host.classList.toggle('yon-chips-open');
        chipBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
        chipBtn.textContent = open ? 'Bölümleri gizle' : 'Tüm bölümler';
      });
    }
    var ara = document.getElementById('yonAra');
    if (ara) {
      ara.addEventListener('input', function () { applyFilter(ara.value, document.getElementById('yon-ana'), nav); });
    }

    var home = document.createElement('section');
    home.id = 'yon-ana';
    home.className = 'card yon-home';
    home.setAttribute('aria-labelledby', 'yonAnaH');
    home.innerHTML =
      '<p class="yon-preview-banner" role="status">Önizleme tasarımı — hazır ama test edilecek</p>' +
      '<h2 id="yonAnaH">Yönetici ana sayfa</h2>' +
      '<p class="fe-sub">Bölümler gruplanmış kısayol kartlarında; üst çubukta arama ve «Tüm bölümler» ile tam çip listesini açıp kapatabilirsiniz.</p>' +
      '<div class="yon-groups"></div>';
    host.insertBefore(home, nav.nextSibling);

    if (!nav.querySelector('a.chip[href="#yon-ana"]')) {
      nav.insertAdjacentHTML('afterbegin', '<a class="chip" href="#yon-ana">Ana sayfa</a>');
    }

    shellDone = true;
    if (!location.hash || location.hash === '#') {
      try { history.replaceState(null, '', '#yon-ana'); } catch (e) { location.hash = 'yon-ana'; }
    }
  }

  function tick() {
    var host = document.getElementById('panel');
    if (!host || host.hidden) return;
    if (MOCK) mockNav(host);
    var nav = chipNav(host);
    if (!nav) return;
    var links = collectLinks(nav);
    if (!MOCK && links.length < 8) return;
    ensureShell(host, nav);
    refreshHome(links);
  }

  function bootMock() {
    if (!MOCK) return;
    var gate = document.getElementById('gate');
    var panel = document.getElementById('panel');
    if (gate) gate.hidden = true;
    if (panel) panel.hidden = false;
    var who = document.getElementById('who');
    if (who && !who.textContent) who.textContent = 'yonetici@ornek.com';
    mockNav(panel);
  }

  bootMock();
  var iv = setInterval(tick, 500);
  var mo = new MutationObserver(tick);
  var panel = document.getElementById('panel');
  if (panel) mo.observe(panel, { childList: true, subtree: true });
  tick();
})();

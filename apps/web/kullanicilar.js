(function () {
  var N = window.SuperAriAdminNotify;
  var USER_BUSY = (N && N.USER_MSG) || 'Talep yoğunluğundan dolayı lütfen yarın deneyiniz.';
  var panels = {
    users: document.getElementById('panel-users'),
    pending: document.getElementById('panel-pending'),
    notifs: document.getElementById('panel-notifs'),
    settings: document.getElementById('panel-settings')
  };

  function fmtTs(iso) {
    try {
      return new Date(iso).toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' });
    } catch (e) {
      return iso || '—';
    }
  }

  function showPanel(id) {
    Object.keys(panels).forEach(function (k) {
      if (panels[k]) panels[k].hidden = k !== id;
    });
    document.querySelectorAll('.users-bottom-nav a').forEach(function (a) {
      a.classList.toggle('is-active', a.getAttribute('data-panel') === id);
    });
    if (location.hash.replace('#', '') !== id) {
      try { history.replaceState(null, '', '#' + id); } catch (e) { /* ignore */ }
    }
  }

  function renderUsers() {
    var list = (N && N.listUsers) ? N.listUsers() : [];
    var el = document.getElementById('users-list');
    if (!list.length) {
      el.innerHTML = '<p class="muted">Henüz kullanıcı yok. Kayıt veya Ayarlar’dan ekleyin.</p>';
      return;
    }
    el.innerHTML = list.map(function (u) {
      var st = u.status || 'active';
      var cls = st === 'pending' ? 'pending' : st === 'failed' ? 'failed' : '';
      return (
        '<div class="user-row">' +
          '<div><strong>' + escapeHtml(u.name || '—') + '</strong>' +
          '<div class="muted" style="font-size:0.75rem">' + escapeHtml(u.email || '') +
          (u.role ? ' · ' + escapeHtml(u.role) : '') +
          (u.source ? ' · ' + escapeHtml(u.source) : '') + '</div></div>' +
          '<span class="status-pill ' + cls + '">' + escapeHtml(st) + '</span>' +
        '</div>'
      );
    }).join('');
  }

  function renderPending() {
    var list = ((N && N.listUsers) ? N.listUsers() : []).filter(function (u) {
      return u.status === 'pending' || u.status === 'failed';
    });
    var el = document.getElementById('pending-list');
    if (!list.length) {
      el.innerHTML = '<p class="muted">Bekleyen kayıt yok.</p>';
      return;
    }
    el.innerHTML = list.map(function (u) {
      return (
        '<div class="user-row">' +
          '<div><strong>' + escapeHtml(u.name || '—') + '</strong>' +
          '<div class="muted" style="font-size:0.75rem">' + escapeHtml(u.email || '') + ' · ' + fmtTs(u.updatedAt) + '</div></div>' +
          '<span class="status-pill pending">' + escapeHtml(u.status) + '</span>' +
        '</div>'
      );
    }).join('');
  }

  function renderNotifs() {
    var list = (N && N.listNotifications) ? N.listNotifications() : [];
    var unread = list.filter(function (n) { return !n.read; }).length;
    var badge = document.getElementById('notif-badge');
    var navBadge = document.getElementById('nav-notif-count');
    [badge, navBadge].forEach(function (b) {
      if (!b) return;
      if (unread) { b.hidden = false; b.textContent = String(unread); }
      else b.hidden = true;
    });
    var el = document.getElementById('notif-list');
    if (!list.length) {
      el.innerHTML = '<p class="muted">Bildirim yok.</p>';
      return;
    }
    el.innerHTML = list.map(function (n) {
      var who = [n.name, n.email].filter(Boolean).join(' · ') || '—';
      return (
        '<div class="notif-item' + (n.read ? '' : ' unread') + '" data-id="' + escapeHtml(n.id) + '">' +
          '<strong>' + escapeHtml(n.message || 'Kullanıcı yoğunluktan dolayı ekleme yapılamadı') + '</strong>' +
          '<div class="muted" style="font-size:0.75rem;margin-top:0.25rem">' +
            fmtTs(n.ts) + ' · ' + escapeHtml(who) +
            (n.source ? ' · ' + escapeHtml(n.source) : '') +
            (n.detail ? ' · ' + escapeHtml(n.detail) : '') +
          '</div>' +
        '</div>'
      );
    }).join('');
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function refresh() {
    renderUsers();
    renderPending();
    renderNotifs();
  }

  document.querySelectorAll('.users-bottom-nav a').forEach(function (a) {
    a.addEventListener('click', function (e) {
      e.preventDefault();
      showPanel(a.getAttribute('data-panel'));
    });
  });

  document.getElementById('btn-refresh').addEventListener('click', refresh);
  document.getElementById('btn-mark-all').addEventListener('click', function () {
    var list = N.listNotifications();
    list.forEach(function (n) { N.markNotificationRead(n.id); });
    refresh();
  });
  document.getElementById('btn-clear-notifs').addEventListener('click', function () {
    if (confirm('Tüm bildirimler silinsin mi?')) {
      N.clearNotifications();
      refresh();
    }
  });

  document.getElementById('add-user-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var fd = new FormData(e.target);
    var name = String(fd.get('name') || '').trim();
    var email = String(fd.get('email') || '').trim();
    var role = String(fd.get('role') || '').trim();
    var busy = !!fd.get('simulateBusy');
    var msg = document.getElementById('add-user-msg');

    if (busy) {
      N.warnUserBusyAndNotify({ name: name, email: email, source: 'kullanicilar_settings', reason: 'capacity_sim' });
      N.upsertUser({ name: name, email: email, role: role, status: 'failed', source: 'kullanicilar' });
      msg.hidden = false;
      msg.style.color = '#8a5a12';
      msg.textContent = USER_BUSY;
      refresh();
      return;
    }

    // Try API then local upsert
    fetch('/api/users/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ name: name, email: email, role: role })
    }).then(function (res) {
      return res.json().then(function (body) { return { res: res, body: body || {} }; }).catch(function () {
        return { res: res, body: {} };
      });
    }).then(function (pack) {
      var err = String(pack.body.error || '');
      if (pack.res.status === 429 || /capacity|busy|quota|limit/i.test(err)) {
        N.warnUserBusyAndNotify({ name: name, email: email, source: 'kullanicilar_api', reason: err || 'capacity' });
        N.upsertUser({ name: name, email: email, role: role, status: 'failed', source: 'kullanicilar' });
        msg.hidden = false;
        msg.style.color = '#8a5a12';
        msg.textContent = USER_BUSY;
      } else if (!pack.res.ok) {
        N.warnUserBusyAndNotify({ name: name, email: email, source: 'kullanicilar_api', reason: err || 'add_failed' });
        N.upsertUser({ name: name, email: email, role: role, status: 'failed', source: 'kullanicilar' });
        msg.hidden = false;
        msg.style.color = '#8a5a12';
        msg.textContent = USER_BUSY;
      } else {
        N.upsertUser({ name: name, email: email, role: role, status: 'active', source: 'kullanicilar' });
        msg.hidden = false;
        msg.style.color = '#2d6a4f';
        msg.textContent = 'Kullanıcı eklendi.';
        e.target.reset();
      }
      refresh();
    }).catch(function () {
      N.upsertUser({ name: name, email: email, role: role, status: 'active', source: 'kullanicilar' });
      msg.hidden = false;
      msg.style.color = '#2d6a4f';
      msg.textContent = 'Kullanıcı eklendi (yerel).';
      e.target.reset();
      refresh();
    });
  });

  // Also merge API users if available
  fetch('/api/admin/users', { headers: { Accept: 'application/json' } })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (data) {
      if (!data || !Array.isArray(data.users)) return;
      data.users.forEach(function (u) {
        N.upsertUser({
          id: u.id,
          name: u.name || u.ad,
          email: u.email || '',
          role: u.role || u.rol,
          status: u.status || 'active',
          source: u.source || 'api'
        });
      });
      refresh();
    })
    .catch(function () { /* static host */ });

  var hash = (location.hash || '#users').replace('#', '') || 'users';
  if (!panels[hash]) hash = 'users';
  showPanel(hash);
  refresh();
})();

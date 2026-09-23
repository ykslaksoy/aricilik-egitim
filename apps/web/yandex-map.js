/**
 * SuperAri — Yandex Maps JavaScript API (ymaps) picker helpers.
 * Not Leaflet. Requires API key (see resolveApiKey / yandex-config.js).
 */
(function (global) {
  var KEY_HELP =
    'https://developer.tech.yandex.ru/services/';
  var LS_KEY = 'YANDEX_MAPS_API_KEY';
  var BOOKMARKS_KEY = 'superari_ymap_bookmarks';
  var ymapsLoadPromise = null;

  function trim(s) {
    return String(s == null ? '' : s).trim();
  }

  function resolveApiKey() {
    try {
      var params = new URLSearchParams(global.location && global.location.search);
      var q =
        params.get('ymaps_key') ||
        params.get('YANDEX_MAPS_API_KEY') ||
        params.get('apikey');
      if (trim(q)) {
        try {
          global.localStorage.setItem(LS_KEY, trim(q));
        } catch (e0) { /* ignore */ }
        return trim(q);
      }
    } catch (e1) { /* ignore */ }

    if (trim(global.YANDEX_MAPS_API_KEY)) return trim(global.YANDEX_MAPS_API_KEY);

    try {
      var ls = global.localStorage && global.localStorage.getItem(LS_KEY);
      if (trim(ls)) return trim(ls);
    } catch (e2) { /* ignore */ }

    try {
      var meta = document.querySelector('meta[name="yandex-maps-api-key"]');
      if (meta && trim(meta.getAttribute('content'))) {
        return trim(meta.getAttribute('content'));
      }
    } catch (e3) { /* ignore */ }

    var cfg = global.__YANDEX_MAPS_CONFIG__;
    if (cfg && trim(cfg.apiKey)) return trim(cfg.apiKey);

    return '';
  }

  function hasApiKey() {
    return !!resolveApiKey();
  }

  var USER_BUSY_MSG = 'Talep yoğunluğundan dolayı lütfen yarın deneyiniz.';

  function isBusyOrQuotaError(err) {
    if (global.SuperAriAdminNotify && global.SuperAriAdminNotify.isBusyOrQuotaError) {
      return global.SuperAriAdminNotify.isBusyOrQuotaError(err);
    }
    if (!err) return false;
    var s = String(err && err.message != null ? err.message : err).toLowerCase();
    return (
      s.indexOf('quota') >= 0 ||
      s.indexOf('rate') >= 0 ||
      s.indexOf('limit') >= 0 ||
      s.indexOf('429') >= 0 ||
      s.indexOf('capacity') >= 0 ||
      s.indexOf('busy') >= 0 ||
      s.indexOf('exceed') >= 0 ||
      s.indexOf('ymaps_script_error') >= 0 ||
      s.indexOf('ymaps_timeout') >= 0
    );
  }

  function notifyAdminsBusy(meta) {
    meta = meta || {};
    meta.source = meta.source || 'yandex-map';
    if (global.SuperAriAdminNotify && global.SuperAriAdminNotify.notifyAdminsBusy) {
      return global.SuperAriAdminNotify.notifyAdminsBusy(meta);
    }
    return null;
  }

  /** Show user busy/quota message and always notify admins («bize»). */
  function showBusyMessage(containerEl, meta) {
    notifyAdminsBusy(Object.assign({ reason: 'map_quota_or_busy' }, meta || {}));
    var el =
      typeof containerEl === 'string'
        ? document.getElementById(containerEl) || document.querySelector(containerEl)
        : containerEl;
    if (el) {
      el.innerHTML =
        '<div class="ymap-key-needed ymap-busy" role="alert">' +
          '<strong>' + USER_BUSY_MSG + '</strong>' +
          '<p>Harita kotası veya talep yoğunluğu nedeniyle işlem şimdilik yapılamıyor. Yarın tekrar deneyin.</p>' +
        '</div>';
    }
    return USER_BUSY_MSG;
  }

  function showKeyRequired(containerEl) {
    var el =
      typeof containerEl === 'string'
        ? document.getElementById(containerEl) || document.querySelector(containerEl)
        : containerEl;
    if (!el) return;
    el.innerHTML =
      '<div class="ymap-key-needed" role="alert">' +
        '<strong>Yandex harita için API anahtarı gerekli</strong>' +
        '<p>Haritadan konum seçmek ve yer aramak için ücretsiz Yandex Maps API anahtarı ekleyin. Leaflet kullanılmaz.</p>' +
        '<ol>' +
          '<li><a href="' + KEY_HELP + '" target="_blank" rel="noopener">developer.tech.yandex.ru</a> üzerinden anahtar alın</li>' +
          '<li>Tarayıcıda: <code>localStorage.setItem("YANDEX_MAPS_API_KEY","ANAHTAR")</code></li>' +
          '<li>veya <code>yandex-config.js</code> içinde <code>apiKey</code></li>' +
          '<li>veya Vercel env <code>YANDEX_MAPS_API_KEY</code> → config’e yazıp deploy</li>' +
          '<li>veya URL: <code>?ymaps_key=ANAHTAR</code></li>' +
        '</ol>' +
        '<p class="ymap-key-note">Yandex hesabındaki kayıtlı yerler için OAuth gerekir (sonra). Şimdilik arama, harita iğnesi, Yandex link yapıştırma ve uygulamada kayıtlı arılık yer işaretleri kullanılır.</p>' +
      '</div>';
  }

  function loadYmaps() {
    if (global.ymaps && typeof global.ymaps.ready === 'function') {
      return new Promise(function (resolve) {
        global.ymaps.ready(function () { resolve(global.ymaps); });
      });
    }
    if (ymapsLoadPromise) return ymapsLoadPromise;

    var key = resolveApiKey();
    if (!key) {
      return Promise.reject(new Error('yandex_api_key_missing'));
    }

    ymapsLoadPromise = new Promise(function (resolve, reject) {
      var existing = document.querySelector('script[data-superari-ymaps]');
      if (existing) {
        var started = Date.now();
        (function waitReady() {
          if (global.ymaps && global.ymaps.ready) {
            global.ymaps.ready(function () { resolve(global.ymaps); });
            return;
          }
          if (Date.now() - started > 20000) {
            reject(new Error('ymaps_timeout'));
            return;
          }
          setTimeout(waitReady, 50);
        })();
        return;
      }
      var s = document.createElement('script');
      s.async = true;
      s.dataset.superariYmaps = '1';
      s.src =
        'https://api-maps.yandex.ru/2.1/?apikey=' +
        encodeURIComponent(key) +
        '&lang=tr_TR';
      s.onload = function () {
        if (!global.ymaps || !global.ymaps.ready) {
          reject(new Error('ymaps_missing'));
          return;
        }
        global.ymaps.ready(function () { resolve(global.ymaps); });
      };
      s.onerror = function () {
        ymapsLoadPromise = null;
        reject(new Error('yandex_quota_or_busy'));
      };
      document.head.appendChild(s);
    });
    return ymapsLoadPromise;
  }

  function coordsOf(lat, lon) {
    return [Number(lat), Number(lon)];
  }

  /**
   * Create a Yandex map. Returns Promise of controller:
   * { map, ymaps, setCenter, getCenter, getZoom, setZoom, destroy, invalidateSize, container }
   */
  function createMap(el, options) {
    options = options || {};
    var node =
      typeof el === 'string'
        ? document.getElementById(el) || document.querySelector(el)
        : el;
    if (!node) return Promise.reject(new Error('map_el_missing'));

    if (!hasApiKey()) {
      showKeyRequired(node);
      return Promise.reject(new Error('yandex_api_key_missing'));
    }

    var center = options.center || [39.92, 41.27];
    var zoom = options.zoom != null ? options.zoom : 9;
    /* Default hybrid (satellite + labels). Override with options.type e.g. yandex#map */
    var mapType = options.type || 'yandex#hybrid';

    return loadYmaps().then(function (ymaps) {
      node.innerHTML = '';
      var map = new ymaps.Map(
        node,
        {
          center: center,
          zoom: zoom,
          type: mapType,
          controls: options.controls || ['zoomControl', 'typeSelector']
        },
        {
          suppressMapOpenBlock: true
        }
      );

      function invalidateSize() {
        try {
          map.container.fitToViewport();
        } catch (e) { /* ignore */ }
      }

      return {
        map: map,
        ymaps: ymaps,
        container: node,
        setCenter: function (lat, lon, z) {
          var c = coordsOf(lat, lon);
          if (z != null) map.setCenter(c, z);
          else map.setCenter(c);
        },
        getCenter: function () {
          var c = map.getCenter();
          return { lat: c[0], lon: c[1] };
        },
        getZoom: function () {
          return map.getZoom();
        },
        setZoom: function (z) {
          map.setZoom(z);
        },
        setView: function (lat, lon, z) {
          map.setCenter(coordsOf(lat, lon), z != null ? z : map.getZoom());
        },
        invalidateSize: invalidateSize,
        destroy: function () {
          try {
            map.destroy();
          } catch (e2) { /* ignore */ }
        }
      };
    }).catch(function (err) {
      if (isBusyOrQuotaError(err) || (err && String(err.message || '').indexOf('yandex_quota') >= 0)) {
        showBusyMessage(node, { reason: String(err && err.message || 'map_load'), source: 'createMap' });
        return Promise.reject(new Error('yandex_quota_or_busy'));
      }
      return Promise.reject(err);
    });
  }

  /**
   * Reliable "my location" control — Yandex geolocationControl often no-ops on mobile/PWA.
   * Uses navigator.geolocation, then centers map. opts.onLocated(lat, lon) optional.
   */
  function attachMyLocationButton(hostEl, ctrl, opts) {
    opts = opts || {};
    if (!hostEl || !ctrl || !ctrl.map) {
      return { destroy: function () {} };
    }
    var existing = hostEl.querySelector('.ymap-my-loc');
    if (existing) existing.remove();
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ymap-my-loc';
    btn.setAttribute('aria-label', 'Konumuma git');
    btn.title = 'Konumuma git';
    btn.innerHTML =
      '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">' +
      '<path fill="currentColor" d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm0-6C6.5 2 2 6.5 2 12c0 5.5 4.5 10 10 10s10-4.5 10-10S17.5 2 12 2zm0 18c-4.4 0-8-3.6-8-8s3.6-8 8-8 8 3.6 8 8-3.6 8-8 8z"/>' +
      '<circle cx="12" cy="12" r="2.2" fill="currentColor"/>' +
      '</svg>';
    hostEl.appendChild(btn);

    function setBusy(on) {
      btn.classList.toggle('is-busy', !!on);
      btn.disabled = !!on;
    }

    function go() {
      if (!navigator.geolocation) {
        alert('Bu cihaz konum paylaşımını desteklemiyor.');
        return;
      }
      setBusy(true);
      navigator.geolocation.getCurrentPosition(
        function (pos) {
          setBusy(false);
          var lat = pos.coords.latitude;
          var lon = pos.coords.longitude;
          if (!isFinite(lat) || !isFinite(lon)) {
            alert('Konum alınamadı.');
            return;
          }
          var z = ctrl.getZoom ? ctrl.getZoom() : 14;
          if (z < 14) z = 15;
          if (ctrl.setView) ctrl.setView(lat, lon, z);
          else if (ctrl.setCenter) ctrl.setCenter(lat, lon, z);
          if (typeof opts.onLocated === 'function') {
            try { opts.onLocated(lat, lon); } catch (e) { /* ignore */ }
          }
        },
        function (err) {
          setBusy(false);
          var code = err && err.code;
          if (code === 1) alert('Konum izni gerekli. Tarayıcı / uygulama ayarlarından konumuna izin ver.');
          else if (code === 2) alert('Konum alınamadı (sinyal / GPS).');
          else if (code === 3) alert('Konum zaman aşımı — tekrar dene.');
          else alert('Konum alınamadı.');
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
      );
    }

    btn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      go();
    });

    return {
      destroy: function () {
        try { btn.remove(); } catch (e2) { /* ignore */ }
      }
    };
  }

  function createPlacemark(ymaps, lat, lon, opts) {

    opts = opts || {};
    var props = {
      balloonContent: opts.title || '',
      hintContent: opts.hint || opts.title || ''
    };
    if (opts.iconContent != null && opts.iconContent !== '') {
      props.iconContent = opts.iconContent;
    }
    var pmOpts = {
      draggable: !!opts.draggable,
      preset: opts.preset || 'islands#redIcon'
    };
    if (opts.iconColor) pmOpts.iconColor = opts.iconColor;
    var pm = new ymaps.Placemark(
      coordsOf(lat, lon),
      props,
      pmOpts
    );
    if (opts.onDrag) {
      pm.events.add('drag', function () {
        var c = pm.geometry.getCoordinates();
        opts.onDrag(c[0], c[1]);
      });
    }
    if (opts.onDragEnd) {
      pm.events.add('dragend', function () {
        var c = pm.geometry.getCoordinates();
        opts.onDragEnd(c[0], c[1]);
      });
    }
    if (opts.onClick) {
      pm.events.add('click', function (e) {
        opts.onClick(e, pm);
      });
    }
    return pm;
  }

  /** Place or move a single placemark; returns the placemark. */
  function upsertPlacemark(ctrl, placemark, lat, lon, opts) {
    opts = opts || {};
    if (!ctrl || !ctrl.map) return null;
    var ymaps = ctrl.ymaps;
    if (placemark) {
      placemark.geometry.setCoordinates(coordsOf(lat, lon));
      try {
        placemark.options.set('draggable', !!opts.draggable);
        if (opts.preset) placemark.options.set('preset', opts.preset);
        if (opts.iconColor) placemark.options.set('iconColor', opts.iconColor);
        if (opts.iconContent != null) placemark.properties.set('iconContent', opts.iconContent);
        if (opts.title != null) {
          placemark.properties.set('balloonContent', opts.title);
          placemark.properties.set('hintContent', opts.hint || opts.title);
        } else if (opts.hint != null) {
          placemark.properties.set('hintContent', opts.hint);
        }
      } catch (e) { /* ignore */ }
      return placemark;
    }
    var pm = createPlacemark(ymaps, lat, lon, opts);
    ctrl.map.geoObjects.add(pm);
    return pm;
  }

  function removePlacemark(ctrl, placemark) {
    if (!placemark) return null;
    if (ctrl && ctrl.map) {
      try {
        ctrl.map.geoObjects.remove(placemark);
      } catch (e) { /* ignore */ }
    }
    return null;
  }

  function placemarkCoords(pm) {
    if (!pm) return null;
    var c = pm.geometry.getCoordinates();
    return { lat: c[0], lon: c[1] };
  }

  /**
   * Fit map to one or more {lat,lon} (or [lat,lon]) points.
   * opts: { zoom, margin, duration }
   */
  function fitPoints(ctrl, points, opts) {
    opts = opts || {};
    if (!ctrl || !ctrl.map) return;
    var coords = [];
    (points || []).forEach(function (p) {
      if (!p) return;
      var la = Number(p.lat != null ? p.lat : p[0]);
      var lo = Number(
        p.lon != null ? p.lon : p.lng != null ? p.lng : p[1]
      );
      if (isFinite(la) && isFinite(lo)) coords.push([la, lo]);
    });
    if (!coords.length) return;
    if (coords.length === 1) {
      var z = opts.zoom != null ? opts.zoom : Math.max(ctrl.getZoom ? ctrl.getZoom() : 12, 12);
      ctrl.setView(coords[0][0], coords[0][1], z);
      return;
    }
    try {
      var bounds = ctrl.ymaps.util.bounds.fromPoints(coords);
      ctrl.map.setBounds(bounds, {
        checkZoomRange: true,
        zoomMargin: opts.margin != null ? opts.margin : 48,
        duration: opts.duration != null ? opts.duration : 280
      });
    } catch (e2) {
      var midLat = (coords[0][0] + coords[coords.length - 1][0]) / 2;
      var midLon = (coords[0][1] + coords[coords.length - 1][1]) / 2;
      ctrl.setView(midLat, midLon, opts.zoom || 11);
    }
  }

  /**
   * Reverse-geocode lat/lon → readable place name (Yandex).
   * Resolves { lat, lon, name, label }. Never rejects — empty name on failure.
   */
  function reverseGeocode(lat, lon) {
    var la = Number(lat);
    var lo = Number(lon);
    var empty = { lat: la, lon: lo, name: '', label: '' };
    if (!isFinite(la) || !isFinite(lo)) return Promise.resolve(empty);
    return loadYmaps()
      .then(function (ymaps) {
        return ymaps.geocode(coordsOf(la, lo), { results: 1 }).then(function (res) {
          var obj = res && res.geoObjects && res.geoObjects.get(0);
          if (!obj) return empty;
          var line = '';
          try { line = String(obj.getAddressLine() || '').trim(); } catch (e0) { line = ''; }
          var name = '';
          try {
            var thorough = obj.getThoroughfare && obj.getThoroughfare();
            var locs = obj.getLocalities && obj.getLocalities();
            var admins = obj.getAdministrativeAreas && obj.getAdministrativeAreas();
            name = String(
              thorough ||
              (locs && locs[0]) ||
              (admins && admins[0]) ||
              line ||
              ''
            ).trim();
          } catch (e1) {
            name = line;
          }
          return { lat: la, lon: lo, name: name || line, label: line || name };
        });
      })
      .catch(function () { return empty; });
  }

  /**
   * Yandex suggest + geocode search. Falls back to empty on failure.
   * Returns Promise<[{name,label,lat,lon}]>
   */
  function searchPlaces(query) {
    var q = trim(query);
    if (!q) return Promise.resolve([]);
    function failBusy(err) {
      var e = err || new Error('yandex_quota_or_busy');
      if (!isBusyOrQuotaError(e)) {
        e = new Error('yandex_quota_or_busy');
        e.cause = err;
      }
      notifyAdminsBusy({ reason: String((err && err.message) || 'search_quota'), source: 'searchPlaces', query: q });
      return Promise.reject(e);
    }
    function lookBusy(err) {
      return isBusyOrQuotaError(err) || (err && /quota|429|rate|limit|exceed|capacity/i.test(String(err.message || err || '')));
    }
    return loadYmaps().then(function (ymaps) {
      return new Promise(function (resolve, reject) {
        function onGeocodeFail(err) {
          if (lookBusy(err)) reject(Object.assign(new Error('yandex_quota_or_busy'), { cause: err }));
          else resolve([]);
        }
        ymaps.suggest(q, { results: 8 }).then(
          function (items) {
            items = items || [];
            if (!items.length) {
              ymaps.geocode(q, { results: 6 }).then(
                function (res) {
                  resolve(geoResultToList(res));
                },
                onGeocodeFail
              );
              return;
            }
            var pending = items.map(function (it) {
              var display = it.displayName || it.value || q;
              return ymaps.geocode(it.value || display, { results: 1 }).then(
                function (res) {
                  var first = res.geoObjects.get(0);
                  if (!first) return null;
                  var c = first.geometry.getCoordinates();
                  return {
                    name: String(display).split(',')[0].trim() || display,
                    label: display,
                    lat: c[0],
                    lon: c[1]
                  };
                },
                function (err) {
                  if (lookBusy(err)) throw Object.assign(new Error('yandex_quota_or_busy'), { cause: err });
                  return null;
                }
              );
            });
            Promise.all(pending).then(
              function (rows) {
                resolve(
                  rows.filter(function (r) {
                    return r && isFinite(r.lat) && isFinite(r.lon);
                  })
                );
              },
              function (err) {
                if (lookBusy(err)) reject(Object.assign(new Error('yandex_quota_or_busy'), { cause: err }));
                else resolve([]);
              }
            );
          },
          function (err) {
            if (lookBusy(err)) {
              reject(Object.assign(new Error('yandex_quota_or_busy'), { cause: err }));
              return;
            }
            ymaps.geocode(q, { results: 6 }).then(
              function (res) { resolve(geoResultToList(res)); },
              onGeocodeFail
            );
          }
        );
      });
    }).catch(function (err) {
      if (lookBusy(err) || (err && String(err.message || '').indexOf('yandex_quota') >= 0)) {
        return failBusy(err);
      }
      return Promise.reject(err);
    });
  }

  function geoResultToList(res) {
    var out = [];
    if (!res || !res.geoObjects) return out;
    res.geoObjects.each(function (obj) {
      var c = obj.geometry.getCoordinates();
      var name = obj.getPremise() || obj.getThoroughfare() || obj.getLocalities()[0] || obj.getAddressLine();
      var label = obj.getAddressLine();
      out.push({
        name: String(name || label || '').trim(),
        label: String(label || name || '').trim(),
        lat: c[0],
        lon: c[1]
      });
    });
    return out.filter(function (r) {
      return r.name && isFinite(r.lat) && isFinite(r.lon);
    });
  }

  /** External map deep links for the current pin. */
  function externalUrls(lat, lon, zoom) {
    var la = Number(lat);
    var lo = Number(lon);
    var z = zoom || 15;
    if (!isFinite(la) || !isFinite(lo)) {
      return {
        yandex: 'https://yandex.com.tr/maps/',
        google: 'https://www.google.com/maps',
        apple: 'https://maps.apple.com/',
        osm: 'https://www.openstreetmap.org/',
        bing: 'https://www.bing.com/maps'
      };
    }
    return {
      yandex:
        'https://yandex.com.tr/maps/?pt=' + lo + ',' + la + '&z=' + z + '&l=map',
      google:
        'https://www.google.com/maps/search/?api=1&query=' + la + ',' + lo,
      apple: 'https://maps.apple.com/?ll=' + la + ',' + lo + '&q=' + la + ',' + lo,
      osm:
        'https://www.openstreetmap.org/?mlat=' +
        la +
        '&mlon=' +
        lo +
        '#map=' +
        z +
        '/' +
        la +
        '/' +
        lo,
      bing:
        'https://www.bing.com/maps?cp=' + la + '~' + lo + '&lvl=' + z + '&sp=point.' + la + '_' + lo
    };
  }

  var EXTERNAL_LABELS = [
    { id: 'yandex', label: 'Yandex’te aç' },
    { id: 'google', label: 'Google Maps' },
    { id: 'apple', label: 'Apple Haritalar' },
    { id: 'osm', label: 'OpenStreetMap' },
    { id: 'bing', label: 'Bing Maps' }
  ];

  function openExternal(provider, lat, lon, zoom) {
    var urls = externalUrls(lat, lon, zoom);
    var url = urls[provider] || urls.yandex;
    global.open(url, '_blank', 'noopener');
  }

  /**
   * Attach a small "Diğer haritalarda aç" menu next to a button or into a host.
   * Returns { refresh(lat,lon), destroy }.
   */
  function attachOtherMapsMenu(anchorBtn, getCoords) {
    if (!anchorBtn) {
      return { refresh: function () {}, destroy: function () {} };
    }
    var wrap = document.createElement('div');
    wrap.className = 'ymap-other-wrap';
    var toggle = anchorBtn;
    toggle.classList.add('ymap-other-toggle');
    if (!trim(toggle.textContent)) toggle.textContent = 'Diğer haritalarda aç';
    var menu = document.createElement('div');
    menu.className = 'ymap-other-menu';
    menu.hidden = true;
    EXTERNAL_LABELS.forEach(function (item) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'ymap-other-item';
      b.dataset.provider = item.id;
      b.textContent = item.label;
      menu.appendChild(b);
    });
    if (anchorBtn.parentNode) {
      anchorBtn.parentNode.insertBefore(wrap, anchorBtn);
      wrap.appendChild(toggle);
      wrap.appendChild(menu);
    } else {
      wrap.appendChild(toggle);
      wrap.appendChild(menu);
    }

    function coords() {
      if (typeof getCoords === 'function') return getCoords();
      return null;
    }

    function close() {
      menu.hidden = true;
    }

    toggle.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      menu.hidden = !menu.hidden;
    });
    menu.addEventListener('click', function (e) {
      var t = e.target.closest('[data-provider]');
      if (!t) return;
      e.preventDefault();
      var c = coords();
      if (!c || !isFinite(c.lat) || !isFinite(c.lon)) {
        alert('Önce haritadan veya aramadan bir konum seçin.');
        return;
      }
      openExternal(t.dataset.provider, c.lat, c.lon, 15);
      close();
    });
    document.addEventListener('click', function docClose(ev) {
      if (!wrap.contains(ev.target)) close();
    });

    return {
      refresh: function () {},
      destroy: function () {
        if (wrap.parentNode) wrap.parentNode.removeChild(wrap);
      },
      el: wrap
    };
  }

  /** App-saved apiary bookmarks (not Yandex account OAuth places). */
  function listAppBookmarks() {
    var out = [];
    try {
      var D = global.SuperAriDemo;
      if (D && D.loadApiaries) {
        (D.loadApiaries() || []).forEach(function (a) {
          var lat = Number(a.lat);
          var lon = Number(a.lon);
          if (!isFinite(lat) || !isFinite(lon)) return;
          out.push({
            id: a.id,
            name: a.name || a.place || 'Arılık',
            label: (a.place || '') + (a.name ? ' · ' + a.name : ''),
            lat: lat,
            lon: lon,
            source: 'apiary'
          });
        });
      }
    } catch (e) { /* ignore */ }
    try {
      var raw = global.localStorage.getItem(BOOKMARKS_KEY);
      var extra = raw ? JSON.parse(raw) : [];
      (extra || []).forEach(function (b) {
        if (!b || !isFinite(Number(b.lat)) || !isFinite(Number(b.lon))) return;
        out.push({
          id: b.id || ('bm_' + b.lat + '_' + b.lon),
          name: b.name || 'Kayıtlı yer',
          label: b.label || b.name || '',
          lat: Number(b.lat),
          lon: Number(b.lon),
          source: 'bookmark'
        });
      });
    } catch (e2) { /* ignore */ }
    return out;
  }

  function saveAppBookmark(entry) {
    if (!entry || !isFinite(Number(entry.lat)) || !isFinite(Number(entry.lon))) return;
    var list = [];
    try {
      list = JSON.parse(global.localStorage.getItem(BOOKMARKS_KEY) || '[]') || [];
    } catch (e) {
      list = [];
    }
    list.unshift({
      id: entry.id || ('bm_' + Date.now()),
      name: entry.name || 'Kayıtlı yer',
      label: entry.label || '',
      lat: Number(entry.lat),
      lon: Number(entry.lon),
      savedAt: Date.now()
    });
    list = list.slice(0, 40);
    try {
      global.localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(list));
    } catch (e2) { /* ignore */ }
  }

  function renderBookmarksList(el, onPick) {
    if (!el) return;
    var items = listAppBookmarks();
    if (!items.length) {
      el.innerHTML =
        '<p class="ymap-bm-empty">Kayıtlı arılık konumu yok. Yandex hesap yerleri için giriş sonra eklenecek.</p>';
      el.hidden = false;
      return;
    }
    el.innerHTML =
      '<div class="ymap-bm-head">Uygulama kayıtlı konumlar</div><ul class="ymap-bm-list">' +
      items
        .map(function (it, i) {
          return (
            '<li><button type="button" data-bm="' +
            i +
            '">' +
            escapeHtml(it.name) +
            (it.label
              ? '<span class="meta">' + escapeHtml(it.label) + '</span>'
              : '') +
            '</button></li>'
          );
        })
        .join('') +
      '</ul>';
    el.hidden = false;
    el.querySelectorAll('button[data-bm]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var hit = items[Number(btn.getAttribute('data-bm'))];
        if (hit && onPick) onPick(hit);
      });
    });
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /** Forage radius circle on a Yandex map (no Leaflet). */
  function attachRadar(ctrl, opts) {
    opts = opts || {};
    var radiusKm = Number(opts.radiusKm);
    if (!isFinite(radiusKm) || radiusKm <= 0) radiusKm = 3;
    var circle = null;

    function meters() {
      return radiusKm * 1000;
    }

    function setCenter(lat, lon) {
      if (!ctrl || !ctrl.map || !isFinite(lat) || !isFinite(lon)) return;
      var center = coordsOf(lat, lon);
      if (!circle) {
        circle = new ctrl.ymaps.Circle(
          [center, meters()],
          {},
          {
            fillColor: '#f0c43a24',
            strokeColor: '#c9a227',
            strokeWidth: 2,
            opacity: 0.85,
            interactivityModel: 'default#transparent'
          }
        );
        ctrl.map.geoObjects.add(circle);
      } else {
        circle.geometry.setCoordinates(center);
        circle.geometry.setRadius(meters());
      }
    }

    function setRadiusKm(km) {
      radiusKm = Number(km) || radiusKm;
      if (circle) circle.geometry.setRadius(meters());
      return radiusKm;
    }

    function clear() {
      if (circle && ctrl && ctrl.map) {
        try {
          ctrl.map.geoObjects.remove(circle);
        } catch (e) { /* ignore */ }
      }
      circle = null;
    }

    return {
      setCenter: setCenter,
      setRadiusKm: setRadiusKm,
      getRadiusKm: function () { return radiusKm; },
      clear: clear
    };
  }

  function attachFullscreen(hostEl, mapEl, ctrl, opts) {
    opts = opts || {};
    if (!hostEl || !mapEl) {
      return {
        open: function () {},
        close: function () {},
        isOpen: function () { return false; },
        shouldSuppressPick: function () { return false; },
        destroy: function () {}
      };
    }

    hostEl.classList.add('ymap-host');
    var geri = hostEl.querySelector('.ymap-geri');
    if (!geri) {
      geri = document.createElement('button');
      geri.type = 'button';
      geri.className = 'ymap-geri';
      geri.setAttribute('aria-label', 'Geri');
      geri.textContent = 'Geri';
      hostEl.insertBefore(geri, hostEl.firstChild);
    }
    var hint = hostEl.querySelector('.ymap-tap-hint');
    if (!hint) {
      hint = document.createElement('div');
      hint.className = 'ymap-tap-hint';
      hint.textContent = 'Büyütmek için dokun';
      hostEl.appendChild(hint);
    }

    var root =
      opts.root ||
      hostEl.closest('.phone') ||
      document.getElementById('phone') ||
      document.body;
    var open = false;
    var placeholder = null;
    var suppressUntil = 0;

    function setHint(on) {
      if (hint) hint.classList.toggle('is-on', !!on && !open);
    }
    setHint(true);

    function invalidate() {
      setTimeout(function () {
        if (ctrl && ctrl.invalidateSize) ctrl.invalidateSize();
      }, 60);
      setTimeout(function () {
        if (ctrl && ctrl.invalidateSize) ctrl.invalidateSize();
      }, 280);
    }

    function openFs() {
      if (open) return;
      open = true;
      /* Short suppress only to ignore a duplicate synthetic click — do not block pin place. */
      suppressUntil = Date.now() + 120;
      if (hostEl.parentNode !== root) {
        placeholder = document.createComment('ymap-fs-anchor');
        hostEl.parentNode.insertBefore(placeholder, hostEl);
        root.appendChild(hostEl);
      }
      hostEl.classList.add('is-fullscreen');
      geri.hidden = false;
      setHint(false);
      if (opts.onChange) opts.onChange(true);
      invalidate();
      /* Extra pass after layout so pin/center survive fullscreen expand */
      setTimeout(function () {
        if (ctrl && ctrl.invalidateSize) ctrl.invalidateSize();
      }, 120);
      setTimeout(function () {
        if (ctrl && ctrl.invalidateSize) ctrl.invalidateSize();
      }, 400);
    }

    function closeFs() {
      if (!open) return;
      open = false;
      hostEl.classList.remove('is-fullscreen');
      geri.hidden = true;
      if (placeholder && placeholder.parentNode) {
        placeholder.parentNode.insertBefore(hostEl, placeholder);
        placeholder.parentNode.removeChild(placeholder);
        placeholder = null;
      }
      setHint(true);
      if (opts.onChange) opts.onChange(false);
      invalidate();
    }

    function onGeri(e) {
      e.preventDefault();
      e.stopPropagation();
      closeFs();
    }
    geri.addEventListener('click', onGeri);

    /* Hint is visual-only (CSS pointer-events:none). If a click still arrives, open FS without blocking map pick. */
    hint.addEventListener('click', function (e) {
      e.preventDefault();
      openFs();
    });

    return {
      open: openFs,
      close: closeFs,
      isOpen: function () { return open; },
      shouldSuppressPick: function () {
        return Date.now() < suppressUntil;
      },
      destroy: function () {
        geri.removeEventListener('click', onGeri);
        closeFs();
      }
    };
  }

  var CSS =
    '.ymap-host{position:relative;}' +
    '.ymap-host .ymap-geri{' +
      'display:none;position:absolute;top:10px;left:10px;z-index:2500;' +
      'min-height:32px;padding:6px 12px;border-radius:999px;border:0;cursor:pointer;' +
      'font-size:12px;font-weight:800;font-family:inherit;' +
      'background:rgba(255,255,255,.94);color:#2c241c;' +
      'box-shadow:0 2px 10px rgba(0,0,0,.18);' +
      '-webkit-tap-highlight-color:transparent;' +
    '}' +
    '.ymap-host.is-fullscreen .ymap-geri{display:inline-flex;align-items:center;}' +
    '.ymap-my-loc{' +
      'position:absolute;top:10px;left:10px;z-index:2600;' +
      'width:40px;height:40px;border-radius:10px;border:1px solid #d8d0c6;' +
      'background:#fff;color:#333;display:flex;align-items:center;justify-content:center;' +
      'box-shadow:0 2px 8px rgba(0,0,0,.18);cursor:pointer;padding:0;' +
      '-webkit-tap-highlight-color:transparent;' +
    '}',
    '.ymap-my-loc:active{transform:scale(.96);}',
    '.ymap-my-loc.is-busy{opacity:.55;}',
    '.ymap-host.is-fullscreen .ymap-my-loc{top:54px;}',
    '.ymap-tap-hint{' +
      'display:none;position:absolute;left:50%;bottom:10px;transform:translateX(-50%);' +
      'z-index:500;padding:5px 10px;border-radius:999px;' +
      'background:rgba(20,16,10,.72);color:#fff;font-size:11px;font-weight:700;' +
      'pointer-events:none;white-space:nowrap;' +
    '}' +
    '.ymap-tap-hint.is-on{display:block;}' +
    '.ymap-host.is-fullscreen{' +
      'position:absolute;inset:0;z-index:120;margin:0;border-radius:0;' +
      'border:0;background:#f7f8fa;' +
      'display:flex;flex-direction:column;' +
    '}' +
    '.ymap-host.is-fullscreen #pickerMap,' +
    '.ymap-host.is-fullscreen #detailMap,' +
    '.ymap-host.is-fullscreen .ymap-canvas{' +
      'flex:1 1 auto;height:100%!important;border-radius:0!important;border:0!important;' +
    '}' +
    '.ymap-host.is-fullscreen .ymap-tap-hint{display:none!important;}' +
    '.ymap-key-needed{padding:14px 14px 16px;border-radius:14px;background:#fff6e8;border:1px solid #e0c56a;color:#2c241c;font-size:13px;line-height:1.45;}' +
    '.ymap-key-needed strong{display:block;margin-bottom:6px;font-size:14px;}' +
    '.ymap-key-needed ol{margin:8px 0 0;padding-left:18px;}' +
    '.ymap-key-needed li{margin:4px 0;}' +
    '.ymap-key-needed code{font-size:11px;background:#fff;padding:1px 4px;border-radius:4px;}' +
    '.ymap-key-needed a{color:#8a5a12;font-weight:700;}' +
    '.ymap-key-note{margin:10px 0 0;font-size:11px;color:#6b635a;}' +
    '.ymap-other-wrap{position:relative;display:inline-flex;flex-direction:column;align-items:stretch;}' +
    '.ymap-other-menu{position:absolute;top:100%;left:0;z-index:40;min-width:180px;margin-top:4px;padding:6px;border-radius:12px;background:#fff;border:1px solid #e5ddd0;box-shadow:0 8px 24px rgba(0,0,0,.14);display:grid;gap:4px;}' +
    '.ymap-other-menu[hidden]{display:none!important;}' +
    '.ymap-other-item{display:block;width:100%;text-align:left;border:0;background:#f7f3ea;color:#2c241c;border-radius:8px;padding:8px 10px;font:inherit;font-size:12px;font-weight:700;cursor:pointer;}' +
    '.ymap-other-item:hover,.ymap-other-item:focus{background:#efe4cf;}' +
    '.ymap-bm-empty{font-size:11px;color:#6b635a;margin:6px 0 0;}' +
    '.ymap-bm-head{font-size:11px;font-weight:800;color:#6b635a;margin:8px 0 4px;}' +
    '.ymap-bm-list{list-style:none;margin:0;padding:0;display:grid;gap:4px;max-height:140px;overflow:auto;}' +
    '.ymap-bm-list button{width:100%;text-align:left;border:1px solid #e5ddd0;background:#fff;border-radius:10px;padding:8px 10px;font:inherit;font-size:12px;font-weight:700;cursor:pointer;}' +
    '.ymap-bm-list .meta{display:block;font-size:10px;font-weight:600;color:#8a8278;margin-top:2px;}';

  function injectCss(doc) {
    doc = doc || document;
    if (doc.getElementById('ymap-fs-css')) return;
    var s = doc.createElement('style');
    s.id = 'ymap-fs-css';
    s.textContent = CSS;
    doc.head.appendChild(s);
  }

  injectCss();

  global.SuperAriYandexMap = {
    KEY_HELP: KEY_HELP,
    USER_BUSY_MSG: USER_BUSY_MSG,
    resolveApiKey: resolveApiKey,
    hasApiKey: hasApiKey,
    isBusyOrQuotaError: isBusyOrQuotaError,
    showBusyMessage: showBusyMessage,
    notifyAdminsBusy: notifyAdminsBusy,
    showKeyRequired: showKeyRequired,
    loadYmaps: loadYmaps,
    createMap: createMap,
    attachMyLocationButton: attachMyLocationButton,
    createPlacemark: createPlacemark,
    upsertPlacemark: upsertPlacemark,
    removePlacemark: removePlacemark,
    placemarkCoords: placemarkCoords,
    fitPoints: fitPoints,
    reverseGeocode: reverseGeocode,
    searchPlaces: searchPlaces,
    externalUrls: externalUrls,
    openExternal: openExternal,
    attachOtherMapsMenu: attachOtherMapsMenu,
    EXTERNAL_LABELS: EXTERNAL_LABELS,
    listAppBookmarks: listAppBookmarks,
    saveAppBookmark: saveAppBookmark,
    renderBookmarksList: renderBookmarksList,
    attachRadar: attachRadar,
    attachFullscreen: attachFullscreen,
    injectCss: injectCss,
    CSS: CSS,
    /* Back-compat aliases (old Leaflet helpers removed) */
    createYandexMap: null,
    yandexEmbedUrl: function (lat, lon, zoom) {
      return externalUrls(lat, lon, zoom).yandex;
    }
  };
})(window);

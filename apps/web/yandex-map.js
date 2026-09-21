/**
 * Yandex Maps tiles + fullscreen helper for Leaflet pickers (no API key).
 * Uses core-renderer tiles with EPSG:3395 so pins align with Yandex imagery.
 * Optional: set window.YANDEX_MAPS_API_KEY later to unlock official JS API.
 */
(function (global) {
  var TILE =
    'https://core-renderer-tiles.maps.yandex.net/tiles?l=map&v=latest&x={x}&y={y}&z={z}&scale=1&lang=tr_TR';

  function ensureYandexCrs(L) {
    if (!L || L.CRS.Yandex) return L && L.CRS.Yandex;
    /* Elliptical Mercator — matches Yandex / EPSG:3395 */
    L.CRS.Yandex = L.extend({}, L.CRS.Earth, {
      code: 'EPSG:3395',
      projection: L.Projection.Mercator,
      transformation: (function () {
        var scale = 0.5 / (Math.PI * L.Projection.Mercator.R);
        return new L.Transformation(scale, 0.5, -scale, 0.5);
      })()
    });
    return L.CRS.Yandex;
  }

  function yandexTileLayer(L, opts) {
    opts = opts || {};
    return L.tileLayer(TILE, {
      maxZoom: opts.maxZoom || 19,
      minZoom: opts.minZoom || 3,
      attribution: opts.attribution || '&copy; <a href="https://yandex.com/maps/">Yandex</a>',
      errorTileUrl: ''
    });
  }

  /**
   * Create a Leaflet map on `el` (HTMLElement|id) with Yandex tiles.
   * Options: center [lat,lon], zoom, mapOpts (passed to L.map).
   */
  function createYandexMap(L, el, options) {
    options = options || {};
    ensureYandexCrs(L);
    var center = options.center || [39.92, 41.27];
    var zoom = options.zoom != null ? options.zoom : 9;
    var mapOpts = L.extend(
      {
        crs: L.CRS.Yandex,
        zoomControl: true,
        attributionControl: true
      },
      options.mapOpts || {}
    );
    var map = L.map(el, mapOpts).setView(center, zoom);
    yandexTileLayer(L, options.tileOpts).addTo(map);
    return map;
  }

  /**
   * Embed / widget URL (iframe) — keyless preview deep link.
   * ll and pt are lon,lat for Yandex.
   */
  function yandexEmbedUrl(lat, lon, zoom) {
    var la = Number(lat);
    var lo = Number(lon);
    var z = zoom || 14;
    if (!isFinite(la) || !isFinite(lo)) {
      return 'https://yandex.com/map-widget/v1/?z=' + z + '&l=map';
    }
    return (
      'https://yandex.com/map-widget/v1/?ll=' +
      lo +
      ',' +
      la +
      '&z=' +
      z +
      '&pt=' +
      lo +
      ',' +
      la +
      ',pm2rdm&l=map'
    );
  }

  /**
   * Attach fullscreen expand/collapse to a map container inside a phone shell.
   *
   * hostEl: wrapper around the map div (gets .ymap-host + .is-fullscreen)
   * mapEl: the Leaflet map container
   * map: Leaflet map instance (for invalidateSize)
   * opts.root: element that should host fullscreen (default: closest .phone or document.body)
   * opts.onChange(isFs): optional callback
   *
   * Compact map click (when not fullscreen) opens fullscreen; Geri closes.
   * Returns { open, close, isOpen, destroy }.
   */
  function attachFullscreen(hostEl, mapEl, map, opts) {
    opts = opts || {};
    if (!hostEl || !mapEl) {
      return {
        open: function () {},
        close: function () {},
        isOpen: function () { return false; },
        destroy: function () {}
      };
    }

    hostEl.classList.add('ymap-host');
    if (!hostEl.getAttribute('data-ymap-fs')) {
      hostEl.setAttribute('data-ymap-fs', '1');
    }

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
    var suppressMapClickUntil = 0;

    function setHint(on) {
      if (hint) hint.classList.toggle('is-on', !!on && !open);
    }
    setHint(true);

    function invalidate() {
      if (!map) return;
      setTimeout(function () {
        try {
          map.invalidateSize({ animate: false });
        } catch (e) { /* ignore */ }
      }, 60);
      setTimeout(function () {
        try {
          map.invalidateSize({ animate: false });
        } catch (e2) { /* ignore */ }
      }, 280);
    }

    function openFs() {
      if (open) return;
      open = true;
      suppressMapClickUntil = Date.now() + 350;
      /* Move host to phone root so it covers status/tab chrome */
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

    /* Tap compact map → fullscreen (Leaflet click or direct) */
    function onMapClick() {
      if (!open) openFs();
    }
    if (map && map.on) {
      map.on('click', onMapClick);
    }

    /* Also catch taps on the host chrome / hint */
    function onHostPointer(e) {
      if (open) return;
      if (e.target === geri || (geri.contains && geri.contains(e.target))) return;
      openFs();
    }
    hint.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      openFs();
    });

    return {
      open: openFs,
      close: closeFs,
      isOpen: function () {
        return open;
      },
      /** True when a map click should be ignored (just opened FS). */
      shouldSuppressPick: function () {
        return Date.now() < suppressMapClickUntil;
      },
      destroy: function () {
        geri.removeEventListener('click', onGeri);
        if (map && map.off) map.off('click', onMapClick);
        closeFs();
      }
    };
  }

  /** Shared CSS text for pages that include Yandex picker fullscreen. */
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
    '.ymap-tap-hint{' +
      'display:none;position:absolute;left:50%;bottom:10px;transform:translateX(-50%);' +
      'z-index:500;padding:5px 10px;border-radius:999px;' +
      'background:rgba(20,16,10,.72);color:#fff;font-size:11px;font-weight:700;' +
      'pointer-events:auto;white-space:nowrap;' +
    '}' +
    '.ymap-tap-hint.is-on{display:block;}' +
    '.ymap-host.is-fullscreen{' +
      'position:absolute;inset:0;z-index:120;margin:0;border-radius:0;' +
      'border:0;background:#f7f8fa;' +
      'display:flex;flex-direction:column;' +
    '}' +
    '.ymap-host.is-fullscreen .leaflet-container,' +
    '.ymap-host.is-fullscreen #pickerMap,' +
    '.ymap-host.is-fullscreen #detailMap{' +
      'flex:1 1 auto;height:100%!important;border-radius:0!important;border:0!important;' +
    '}' +
    '.ymap-host.is-fullscreen .ymap-tap-hint{display:none!important;}';

  function injectCss(doc) {
    doc = doc || document;
    if (doc.getElementById('ymap-fs-css')) return;
    var s = doc.createElement('style');
    s.id = 'ymap-fs-css';
    s.textContent = CSS;
    doc.head.appendChild(s);
  }

  global.SuperAriYandexMap = {
    TILE: TILE,
    ensureYandexCrs: ensureYandexCrs,
    yandexTileLayer: yandexTileLayer,
    createYandexMap: createYandexMap,
    yandexEmbedUrl: yandexEmbedUrl,
    attachFullscreen: attachFullscreen,
    injectCss: injectCss,
    CSS: CSS
  };
})(window);

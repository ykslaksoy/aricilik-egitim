/**
 * Yandex Maps API key config (static site).
 *
 * Priority (highest first) is resolved in yandex-map.js:
 *   1. ?ymaps_key= / ?YANDEX_MAPS_API_KEY= query
 *   2. window.YANDEX_MAPS_API_KEY
 *   3. localStorage YANDEX_MAPS_API_KEY
 *   4. <meta name="yandex-maps-api-key" content="...">
 *   5. This file: window.__YANDEX_MAPS_CONFIG__.apiKey
 *
 * Vercel: set project env YANDEX_MAPS_API_KEY, then either paste the key
 * into apiKey below before deploy, or generate this file in CI:
 *   echo "window.__YANDEX_MAPS_CONFIG__={apiKey:\"$YANDEX_MAPS_API_KEY\"};" > apps/web/yandex-config.js
 *
 * Free key: https://developer.tech.yandex.ru/services/
 */
window.__YANDEX_MAPS_CONFIG__ = window.__YANDEX_MAPS_CONFIG__ || {
  apiKey: ''
};

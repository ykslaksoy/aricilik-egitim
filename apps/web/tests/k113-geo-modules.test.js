/* k113: geo modülleri — dosya varlığı ve Overpass sorgu şekli */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const geoRoot = path.join(__dirname, '..', 'geo');
const apiGeo = path.join(__dirname, '..', '..', 'api', 'src', 'geo');

assert.ok(fs.existsSync(path.join(geoRoot, 'overpass.js')), 'apps/web/geo/overpass.js');
assert.ok(fs.existsSync(path.join(geoRoot, 'fireRisk.js')), 'apps/web/geo/fireRisk.js');
assert.ok(fs.existsSync(path.join(geoRoot, 'firms.js')), 'apps/web/geo/firms.js');
assert.ok(fs.existsSync(path.join(apiGeo, 'geoContextService.js')), 'apps/api/src/geo/geoContextService.js');

const { buildWaterQuery, OVERPASS_ENDPOINTS } = require(path.join(geoRoot, 'overpass'));
const { scoreFireRisk } = require(path.join(geoRoot, 'fireRisk'));

assert.ok(Array.isArray(OVERPASS_ENDPOINTS) && OVERPASS_ENDPOINTS.length >= 1);

const q = buildWaterQuery(41.08, 40.754, 800);
assert.ok(q.includes('[out:json]'), 'overpass json output');
assert.ok(q.includes('around:800,41.08,40.754'), 'around clause');
assert.ok(q.includes('natural"="spring"'), 'springs');
assert.ok(q.includes('amenity"="drinking_water"'), 'drinking water');
assert.ok(q.includes('waterway'), 'waterways');

const dryHot = scoreFireRisk({ tempC: 34, humidity: 22, windKmh: 35, precipMm: 0 });
assert.ok(dryHot.score >= 50, 'dry hot should elevate risk');
assert.ok(['orta', 'yuksek', 'cok_yuksek'].includes(dryHot.level));

const rainy = scoreFireRisk({ tempC: 18, humidity: 70, windKmh: 10, precipMm: 8 });
assert.ok(rainy.score < dryHot.score, 'rain lowers score');

const landcover = fs.readFileSync(path.join(__dirname, '..', 'landcover-sync.js'), 'utf8');
assert.ok(landcover.includes('drinking_water'), 'landcover-sync extended for OSM drinking_water');

console.log('k113-geo-modules ok');

const path = require('path');
const { assessFireRisk } = require(path.join(__dirname, '../../../web/geo/fireRisk'));
const { fetchNearbyHotspots } = require(path.join(__dirname, '../../../web/geo/firms'));
const overpassService = require('./overpassService');
const geonamesLookup = require('./geonamesLookup');
const staticLayers = require('./staticLayers');

/**
 * Arılık koordinatı için geo özet (MVP: canlı Overpass + Open-Meteo; statik katmanlar demo).
 * @param {number} lat
 * @param {number} lon
 * @param {{ skipNetwork?: boolean }} [opts]
 */
async function buildGeoContext(lat, lon, opts = {}) {
  const la = Number(lat);
  const lo = Number(lon);
  if (!Number.isFinite(la) || !Number.isFinite(lo)) {
    throw new Error('invalid_coords');
  }

  const flora = staticLayers.floraAtPoint(la, lo);
  const mescere = staticLayers.mescereAtPoint(la, lo);
  const geonamesWater = geonamesLookup.nearestWaterFeature(la, lo);

  if (opts.skipNetwork) {
    return {
      lat: la,
      lon: lo,
      water: geonamesWater,
      fireRisk: null,
      firms: { hotspots: [], configured: false, demo: true },
      flora,
      mescere,
      sources: ['geonames_local', 'corine_clms_static', 'ogm_mescere_static'],
      fetchedAt: new Date().toISOString(),
    };
  }

  const [waterOverpass, fireRisk, firms] = await Promise.all([
    overpassService.findNearestWater(la, lo).catch(() => null),
    assessFireRisk(la, lo).catch(() => null),
    fetchNearbyHotspots(la, lo).catch(() => ({
      hotspots: [],
      source: 'firms',
      configured: Boolean(process.env.NASA_FIRMS_MAP_KEY),
      error: true,
    })),
  ]);

  const water =
    waterOverpass && geonamesWater
      ? waterOverpass.metres <= geonamesWater.metres
        ? waterOverpass
        : geonamesWater
      : waterOverpass || geonamesWater;

  const sources = ['overpass', 'open_meteo'];
  if (firms?.configured) sources.push('firms');
  if (geonamesWater) sources.push('geonames_local');
  if (flora) sources.push('corine_clms_static');
  if (mescere) sources.push('ogm_mescere_static');

  return {
    lat: la,
    lon: lo,
    water,
    fireRisk,
    firms,
    flora,
    mescere,
    sources,
    fetchedAt: new Date().toISOString(),
  };
}

module.exports = {
  buildGeoContext,
};

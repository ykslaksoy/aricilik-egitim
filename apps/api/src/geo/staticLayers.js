/**
 * Statik ön-işlenmiş katmanlar (CORINE/CLMS özet, OGM meşcere örnek).
 */

const fs = require('fs');
const path = require('path');

const CORINE_SAMPLE = path.join(__dirname, '../../../../data/seed/corine-flora-grid.sample.json');
const OGM_SAMPLE = path.join(__dirname, '../../../../data/seed/ogm-mescere.sample.geojson');

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function pointInRing(lon, lat, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];
    const intersect = yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function floraAtPoint(lat, lon) {
  const grid = readJson(CORINE_SAMPLE);
  if (!grid?.cells?.length) return null;
  for (const cell of grid.cells) {
    const dLat = Math.abs(cell.lat - lat);
    const dLon = Math.abs(cell.lon - lon);
    if (dLat <= (cell.halfDeg || 0.015) && dLon <= (cell.halfDeg || 0.015)) {
      return {
        source: 'corine_clms_static',
        resolutionM: grid.resolutionM || 3000,
        dominance: cell.dominance,
        forestPct: cell.forestPct,
        label: cell.label,
      };
    }
  }
  return null;
}

function mescereAtPoint(lat, lon) {
  const gj = readJson(OGM_SAMPLE);
  if (!gj?.features?.length) return null;
  for (const f of gj.features) {
    const geom = f.geometry;
    if (geom?.type === 'Polygon' && geom.coordinates?.[0]) {
      if (pointInRing(lon, lat, geom.coordinates[0])) {
        return {
          source: 'ogm_mescere_static',
          ...f.properties,
        };
      }
    }
  }
  return null;
}

module.exports = {
  floraAtPoint,
  mescereAtPoint,
};

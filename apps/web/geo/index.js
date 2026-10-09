const overpass = require('./overpass');
const fireRisk = require('./fireRisk');
const firms = require('./firms');

module.exports = {
  ...overpass,
  ...fireRisk,
  firms,
  fetchNearbyHotspots: firms.fetchNearbyHotspots,
};

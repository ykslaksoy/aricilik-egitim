/**
 * gezginci taşıma
 * POST /api/transport/start  { apiaryFrom, apiaryTo, hiveIds[] }
 * POST /api/transport/end    { transportId }
 */
module.exports = function createTransportRouter(/* deps */) {
  const express = require("express");
  return express.Router();
};

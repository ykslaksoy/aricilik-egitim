/** TODO: abonelik planına göre geçmiş gün limiti */
function requireAuth(req, res, next) {
  next();
}

module.exports = { requireAuth };

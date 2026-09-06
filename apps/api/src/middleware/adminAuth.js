/** Yönetici paneli — demo anahtar: koloni-admin (ADMIN_KEY env ile değiştir) */
function requireAdmin(req, res, next) {
  const key = req.headers["x-admin-key"] || req.query.key;
  const expected = process.env.ADMIN_KEY || "koloni-admin";
  if (key !== expected) {
    return res.status(403).json({
      error: "admin_forbidden",
      hint: "X-Admin-Key başlığı veya ?key= parametresi gerekli",
    });
  }
  next();
}

module.exports = { requireAdmin };

/**
 * ingest payload doğrulama (hafif)
 * @param {object} body
 * @returns {{ ok: boolean, error?: string }}
 */
function validateIngest(body) {
  if (!body || !Number.isFinite(Number(body.hiveId))) {
    return { ok: false, error: "hiveId_required" };
  }
  if (body.weightKg == null && body.cornerKg == null) {
    return { ok: false, error: "weight_required" };
  }
  return { ok: true };
}

module.exports = { validateIngest };

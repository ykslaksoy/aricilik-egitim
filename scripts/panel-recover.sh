#!/usr/bin/env bash
# SüperArı panel — 1-komut yeniden kurulum + sağlık kontrolü + PUBLIC_LINKS güncelle
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
API_BASE="${KOLONI_API:-http://127.0.0.1:3847}"
TMUX=(tmux -f /exec-daemon/tmux.portal.conf)
PUB="$ROOT/docs/PUBLIC_LINKS.md"
TMP_LINKS="/tmp/koloni-public-links.md"
HEALTH_OUT="/tmp/superari-panel-health.txt"

log() { printf '[panel-recover] %s\n' "$*"; }

ensure_api() {
  if curl -fsS --max-time 4 "$API_BASE/giris.html" >/dev/null 2>&1; then
    log "API OK ($API_BASE)"
    return 0
  fi
  log "API yok — başlatılıyor…"
  "${TMUX[@]}" has-session -t "=hive-api-watch" 2>/dev/null \
    && "${TMUX[@]}" kill-session -t hive-api-watch 2>/dev/null || true
  "${TMUX[@]}" new-session -d -s hive-api-watch -c "$ROOT" -- \
    bash -lc "cd '$ROOT' && node apps/api/src/server.js"
  for _ in $(seq 1 20); do
    sleep 0.5
    if curl -fsS --max-time 3 "$API_BASE/giris.html" >/dev/null 2>&1; then
      log "API ayağa kalktı"
      return 0
    fi
  done
  log "HATA: API $API_BASE yanıt vermiyor"
  return 1
}

ensure_watchdog() {
  if pgrep -f 'scripts/tunnel-watchdog.py' >/dev/null 2>&1; then
    log "tunnel-watchdog çalışıyor — tek sefer ensure_tunnels"
    python3 - <<'PY'
import sys
sys.path.insert(0, "/agent/hive-demo/scripts")
import importlib.util
spec = importlib.util.spec_from_file_location("tw", "/agent/hive-demo/scripts/tunnel-watchdog.py")
tw = importlib.util.module_from_spec(spec)
spec.loader.exec_module(tw)
tw.ensure_tunnels()
PY
  else
    log "tunnel-watchdog yok — başlatılıyor"
    "${TMUX[@]}" has-session -t "=koloni-watch" 2>/dev/null \
      && "${TMUX[@]}" kill-session -t koloni-watch 2>/dev/null || true
    "${TMUX[@]}" new-session -d -s koloni-watch -c "$ROOT" -- \
      bash -lc "cd '$ROOT' && python3 -u scripts/tunnel-watchdog.py"
    sleep 8
    python3 - <<'PY'
import sys, importlib.util
spec = importlib.util.spec_from_file_location("tw", "/agent/hive-demo/scripts/tunnel-watchdog.py")
tw = importlib.util.module_from_spec(spec)
spec.loader.exec_module(tw)
tw.ensure_tunnels()
PY
  fi
}

pick_base() {
  python3 - <<'PY'
from pathlib import Path
import re, urllib.request, ssl
CTX = ssl.create_default_context()

def ok(u):
    try:
        with urllib.request.urlopen(u + "/giris.html", timeout=12, context=CTX) as r:
            return 200 <= r.status < 400
    except Exception:
        return False

cf = lhr = None
for logp, pat, kind in [
    ("/tmp/cf-live.log", r"https://[a-z0-9-]+\.trycloudflare\.com", "cf"),
    ("/tmp/lhr-live.log", r"https://[a-z0-9]+\.lhr\.life", "lhr"),
]:
    p = Path(logp)
    if not p.exists():
        continue
    m = re.findall(pat, p.read_text(errors="ignore"))
    if not m:
        continue
    u = m[-1]
    if kind == "cf":
        cf = u
    else:
        lhr = u

primary = None
if cf and ok(cf):
    primary = cf
elif lhr and ok(lhr):
    primary = lhr
elif lhr:
    primary = lhr
elif cf:
    primary = cf
print(primary or "")
PY
}

health_check() {
  local base="$1"
  local paths=(
    "/giris.html"
    "/arici.html?org=koloni-demo"
    "/yonetici.html?org=koloni-demo"
    "/isci.html?org=koloni-demo"
    "/api/hives"
    "/api/alerts"
  )
  : > "$HEALTH_OUT"
  local fail=0
  if [[ -z "$base" ]]; then
    log "Public base yok — yalnızca local kontrol"
    base="$API_BASE"
  fi
  echo "base=$base" >> "$HEALTH_OUT"
  for p in "${paths[@]}"; do
    local code
    code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 "${base}${p}" || echo 000)
    echo "$code $p" >> "$HEALTH_OUT"
    if [[ "$code" != 200 && "$code" != 301 && "$code" != 302 ]]; then
      fail=1
      log "SAĞLIK FAIL $code ${base}${p}"
    else
      log "SAĞLIK OK  $code $p"
    fi
  done
  return $fail
}

main() {
  log "başlıyor…"
  ensure_api
  ensure_watchdog
  local base
  base="$(pick_base)"
  if [[ -n "$base" ]]; then
    log "Public base: $base"
  fi
  # watchdog zaten PUBLIC_LINKS yazar; yoksa local not düş
  if [[ -f "$PUB" ]]; then
    log "PUBLIC_LINKS: $PUB"
    head -n 20 "$PUB" || true
  fi
  if [[ -f "$TMP_LINKS" ]]; then
    cp -f "$TMP_LINKS" "$PUB" 2>/dev/null || true
  fi
  if health_check "$base"; then
    log "TAMAM — paneller sağlıklı"
    echo "OK base=${base:-$API_BASE}"
    exit 0
  else
    log "UYARI — bazı uçlar başarısız (detay: $HEALTH_OUT)"
    echo "DEGRADED base=${base:-$API_BASE}"
    exit 0
  fi
}

main "$@"

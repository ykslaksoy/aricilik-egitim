#!/usr/bin/env python3
"""Keep koloni panel tunnels up; rewrite /tmp/koloni-public-links.md on change."""
from __future__ import annotations

import os
import re
import subprocess
import time
import urllib.request
import ssl
from pathlib import Path

API = "http://127.0.0.1:3847/giris.html"
CF_BIN = "/tmp/cloudflared"
CF_LOG = Path("/tmp/cf-live.log")
LHR_LOG = Path("/tmp/lhr-live.log")
LINKS = Path("/tmp/koloni-public-links.md")
DOCS = Path("/agent/hive-demo/docs/MASTER_78_ILERI.md")
TMUX = ["tmux", "-f", "/exec-daemon/tmux.portal.conf"]
CTX = ssl.create_default_context()
INTERVAL = int(os.environ.get("KOLONI_WATCH_SEC", "90"))


def run(cmd: list[str] | str, shell: bool = False) -> str:
    r = subprocess.run(cmd, shell=shell, capture_output=True, text=True)
    return (r.stdout or "") + (r.stderr or "")


def http_ok(url: str, timeout: float = 18) -> bool:
    try:
        req = urllib.request.Request(url, method="GET")
        with urllib.request.urlopen(req, timeout=timeout, context=CTX) as r:
            return 200 <= r.status < 400
    except Exception:
        return False


def local_api_ok() -> bool:
    try:
        with urllib.request.urlopen(API, timeout=5) as r:
            return r.status == 200
    except Exception:
        return False


def ensure_api() -> None:
    if local_api_ok():
        return
    run(TMUX + ["has-session", "-t", "=hive-api-v2"])
    # restart api in hive-api-v2 if needed
    run(
        TMUX
        + [
            "new-session",
            "-d",
            "-s",
            "hive-api-watch",
            "-c",
            "/agent/hive-demo",
            "--",
            "bash",
            "-lc",
            "cd /agent/hive-demo && node apps/api/src/server.js",
        ]
    )
    time.sleep(2)


def cf_url() -> str | None:
    if not CF_LOG.exists():
        return None
    m = re.findall(r"https://[a-z0-9-]+\.trycloudflare\.com", CF_LOG.read_text(errors="ignore"))
    return m[-1] if m else None


def lhr_url() -> str | None:
    if not LHR_LOG.exists():
        return None
    m = re.findall(r"https://[a-z0-9]+\.lhr\.life", LHR_LOG.read_text(errors="ignore"))
    return m[-1] if m else None


def pgrep(pat: str) -> bool:
    r = subprocess.run(["pgrep", "-af", pat], capture_output=True, text=True)
    return r.returncode == 0 and bool(r.stdout.strip())


def kill_session(name: str) -> None:
    subprocess.run(TMUX + ["kill-session", "-t", name], capture_output=True)


def start_cf() -> None:
    kill_session("cf-live")
    if CF_LOG.exists():
        CF_LOG.unlink()
    cmd = f"{CF_BIN} tunnel --url http://127.0.0.1:3847 2>&1 | tee {CF_LOG}"
    subprocess.run(
        TMUX
        + ["new-session", "-d", "-s", "cf-live", "-c", "/agent/hive-demo", "--", "bash", "-lc", cmd],
        check=False,
    )


def start_lhr() -> None:
    kill_session("lhr-live")
    if LHR_LOG.exists():
        LHR_LOG.unlink()
    cmd = (
        "ssh -o StrictHostKeyChecking=no -o ServerAliveInterval=30 "
        "-R 80:127.0.0.1:3847 nokey@localhost.run 2>&1 | tee "
        f"{LHR_LOG}"
    )
    subprocess.run(
        TMUX
        + ["new-session", "-d", "-s", "lhr-live", "-c", "/agent/hive-demo", "--", "bash", "-lc", cmd],
        check=False,
    )


def wait_url(getter, tries: int = 30) -> str | None:
    for _ in range(tries):
        time.sleep(2)
        u = getter()
        if u and http_ok(u + "/giris.html"):
            return u
    return getter()


def write_links(cf: str | None, lhr: str | None) -> None:
    cf_ok = bool(cf and http_ok(cf + "/giris.html"))
    lhr_ok = bool(lhr and http_ok(lhr + "/giris.html"))
    primary = cf if cf_ok else (lhr if lhr_ok else (cf or lhr))
    if not primary:
        return

    if cf_ok:
        primary_title = "Öncelikli (Cloudflare)"
        backup_title = "Yedek (localhost.run)"
        primary_base, backup_base = cf, lhr
    else:
        primary_title = "Öncelikli (localhost.run — CF DNS çözülmüyor)"
        backup_title = "Cloudflare (yeniden kuruldu, DNS bekleniyor)"
        primary_base, backup_base = lhr, cf

    def section(title: str, base: str | None) -> str:
        if not base:
            return f"## {title}\n\n_(yok)_\n"
        return f"""## {title}

| Panel | URL |
|-------|-----|
| Ana giriş | {base}/giris.html |
| Yönetici | {base}/yonetici.html?org=koloni-demo |
| Patron | {base}/arici.html?org=koloni-demo |
| Çalışan | {base}/isci.html?org=koloni-demo |
"""

    body = f"""# SüperArı panel — canlı public linkler

Güncellendi: {time.strftime('%Y-%m-%d %H:%M:%S UTC', time.gmtime())}

Kurtarma (1 komut): `./scripts/panel-recover.sh`

{section(primary_title, primary_base)}
{section(backup_title, backup_base)}
Demo PIN: Patron `1111` · Yönetici `1234` · Çalışan `3333`
"""
    LINKS.write_text(body)
    pub = Path(__file__).resolve().parents[1] / "docs" / "PUBLIC_LINKS.md"
    pub.write_text(body)

    # patch MASTER doc — always point Ana ekran to healthy primary
    if DOCS.exists() and primary:
        text = DOCS.read_text()
        text2 = re.sub(
            r"(\*\*Ana ekran \(öncelikli\):\*\* )https://\S+",
            rf"\1{primary}/giris.html",
            text,
            count=1,
        )
        if lhr:
            text2 = re.sub(
                r"https://[a-z0-9]+\.lhr\.life",
                lhr,
                text2,
            )
        if cf and cf_ok:
            text2 = re.sub(
                r"https://[a-z0-9-]+\.trycloudflare\.com",
                cf,
                text2,
            )
        if text2 != text:
            DOCS.write_text(text2)


def ensure_tunnels() -> tuple[str | None, str | None]:
    ensure_api()
    cf = cf_url()
    need_cf = not (cf and http_ok(cf + "/giris.html") and pgrep("cloudflared tunnel"))
    if need_cf:
        if not Path(CF_BIN).is_file():
            print("cloudflared missing at", CF_BIN)
        else:
            print("restarting CF tunnel…")
            start_cf()
            cf = wait_url(cf_url)

    lhr = lhr_url()
    need_lhr = not (lhr and http_ok(lhr + "/giris.html") and pgrep("nokey@localhost.run"))
    if need_lhr:
        print("restarting LHR tunnel…")
        start_lhr()
        lhr = wait_url(lhr_url)

    write_links(cf, lhr)
    print("CF", cf, "ok" if cf and http_ok(cf + "/giris.html") else "DOWN")
    print("LHR", lhr, "ok" if lhr and http_ok(lhr + "/giris.html") else "DOWN")
    return cf, lhr


def main() -> None:
    interval_sec = int(os.environ.get("KOLONI_WATCH_SEC", "90"))
    print("koloni tunnel watchdog started", flush=True)
    while True:
        try:
            ensure_tunnels()
        except Exception as e:
            print("watch error", e)
        time.sleep(interval_sec)


if __name__ == "__main__":
    main()

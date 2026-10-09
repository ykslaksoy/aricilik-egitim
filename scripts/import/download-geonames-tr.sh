#!/usr/bin/env bash
# GeoNames Türkiye dump — su ile ilgili feature kodları için filtreleme adımları.
# Lisans: https://www.geonames.org/export/ (CC BY 4.0)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OUT_DIR="${ROOT}/data/seed/geonames"
mkdir -p "$OUT_DIR"
ZIP="${OUT_DIR}/TR.zip"
echo "İndiriliyor: GeoNames TR..."
curl -fsSL "https://download.geonames.org/export/dump/TR.zip" -o "$ZIP"
unzip -o "$ZIP" -d "$OUT_DIR"
echo "Ham dosya: ${OUT_DIR}/TR.txt"
echo "Sonraki adım: H/L featureClass ile su gölleri/nehirleri filtreleyip geonames-tr-water.json üretin (ör. awk/grep veya küçük Node betiği)."

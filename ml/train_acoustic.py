#!/usr/bin/env python3
"""
Akustik / sensör sınıflandırma — eğitim iskeleti.
Veri: GET /api/export/dataset → dataset.json

Kullanım:
  curl -o ml/data/dataset.json http://localhost:3847/api/export/dataset
  python ml/train_acoustic.py --dataset ml/data/dataset.json
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report
from sklearn.model_selection import train_test_split


FEATURES = [
    "weight_kg",
    "temp_c",
    "humidity",
    "bee_in",
    "bee_out",
    "vibration",
    "audio_rms",
]


def load_dataset(path: Path) -> tuple[pd.DataFrame, pd.Series | None]:
    with path.open(encoding="utf-8") as f:
        data = json.load(f)

    readings = pd.DataFrame(data.get("readings") or [])
    labels = pd.DataFrame(data.get("labels") or [])

    if readings.empty:
        raise SystemExit("Okuma yok — önce saha ingest veya demo veri gerekli.")

    for col in FEATURES:
        if col not in readings.columns:
            readings[col] = 0.0

    readings["ts"] = pd.to_datetime(readings["ts"], utc=True, errors="coerce")

    if labels.empty:
        print("Uyarı: etiket yok — POST /api/labels ile muayene kaydı ekleyin.")
        return readings, None

    labels["ts"] = pd.to_datetime(labels["ts"], utc=True, errors="coerce")
    # Basit join: her etiketten önceki 24 saat okumalarına event_type ata (geliştirilecek)
    y = pd.Series(["normal"] * len(readings), index=readings.index)
    for _, lab in labels.iterrows():
        hid = lab.get("hiveId") if "hiveId" in lab else lab.get("hive_id")
        mask = (readings["hive_id"] == hid) & (
            readings["ts"] <= lab["ts"]
        ) & (readings["ts"] >= lab["ts"] - pd.Timedelta(hours=24))
        y.loc[mask] = lab["eventType"]

    return readings, y


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dataset", type=Path, required=True)
    parser.add_argument(
        "--out",
        type=Path,
        default=Path(__file__).resolve().parent.parent / "data" / "models" / "metrics.json",
    )
    args = parser.parse_args()

    X_df, y = load_dataset(args.dataset)
    X = X_df[FEATURES].fillna(0).astype(float)

    if y is None or y.nunique() < 2:
        print("Yeterli etiket yok — en az 2 farklı event_type gerekli.")
        print(f"Okuma: {len(X_df)}, özellik: {FEATURES}")
        args.out.parent.mkdir(parents=True, exist_ok=True)
        args.out.write_text(
            json.dumps({"status": "need_more_labels", "readings": len(X_df)}, indent=2),
            encoding="utf-8",
        )
        return

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    clf = RandomForestClassifier(n_estimators=100, random_state=42, max_depth=8)
    clf.fit(X_train, y_train)
    pred = clf.predict(X_test)
    report = classification_report(y_test, pred, output_dict=True, zero_division=0)

    args.out.parent.mkdir(parents=True, exist_ok=True)
    metrics = {
        "status": "trained",
        "samples": len(X_df),
        "features": FEATURES,
        "classes": sorted(y.unique().tolist()),
        "accuracy": report.get("accuracy"),
        "report": report,
    }
    args.out.write_text(json.dumps(metrics, indent=2, ensure_ascii=False), encoding="utf-8")
    print(json.dumps(metrics, indent=2, ensure_ascii=False))
    print(f"Metrikler: {args.out}")
    print("Sonraki adım: skl2onnx ile acoustic_v1.onnx export → data/models/")


if __name__ == "__main__":
    main()

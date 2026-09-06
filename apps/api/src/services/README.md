# services

| dosya | iş |
|-------|-----|
| `alertEngine.js` | **Sensör + koloni değerlendirmesi → alerts[]** (eşikler: `constants.js`) |
| `entranceGate.js` | giriş kapısı çoklu sensör + otomatik aç-kapa |
| `cameraAnalysis.js` | kovan + arılık kamera CV sayım, IR karşılaştırma, snapshot (demo) |
| `sensorAnalysis.js` | IR, tartı, ses, titreşim, bağlantı, köşe + çift sensör birleşimi |
| `sensorFusion.js` | tek kovan — tüm sensörlerden hikâye + yapılacaklar |
| `apiaryFusion.js` | **arılık fusion** — konumdaki tüm kovanlar birlikte |
| `scoreDeep.js` | oğul / hastalık / sağlık / yavru derin katman |
| `calibrationAnalysis.js` | kalibrasyon güven skoru |
| `metaAnalysis.js` | ana yaşı, petek, muayene gecikmesi |
| `predictiveAnalysis.js` | tahmin + anomali |
| `weatherIndices.js` | nektar / uçuş / stres indeksi |
| `transportAnalysis.js` | taşıma / yerleşme |
| `transportMode.js` | taşıma aktifken hangi alarm kapalı |
| `ingestValidator.js` | ingest.schema.json doğrulama |

Akış: `server.js` → `syncAlertsFromHives()` → `buildHiveAlerts()` per kovan.

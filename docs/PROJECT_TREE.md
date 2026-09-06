# koloni — proje dosya ağacı

```
hive-demo/
├── README.md
├── package.json
│
├── docs/                              # dokümantasyon
│   ├── ozellikler/                    # ★ HER ÖZELLİK AYRI TÜRKÇE DOSYA
│   │   ├── README.md                  # indeks
│   │   ├── AGAC.md                    # tam ağaç
│   │   ├── ekranlar/                  # 9 ekran
│   │   ├── skorlar/                   # 6 skor/tahmin
│   │   ├── kovan-kaydi/               # işletme, ana, baba, ırk…
│   │   ├── sensorler/                 # 7 sensör
│   │   ├── alarmlar/                  # 8 alarm tipi
│   │   ├── kalibrasyon/               # 5 kalibrasyon yöntemi
│   │   ├── gezginci/                  # 5 gezginci özellik
│   │   ├── abonelik/                  # 4 abonelik
│   │   ├── bildirimler/               # 3 bildirim kanalı
│   │   └── donanim/                   # paket standart/kamera, kovan kartı, geçit
│   ├── ozel/                          # ★ SADECE SAHİP — uygulamada yok
│   │   ├── README.md
│   │   ├── malzeme-listesi.md
│   │   └── MALZEME_LISTESI.md         # “malzeme listesini getir”
│   ├── UYGULAMA_OZELLIKLER.md         # özet liste (eski)
│   ├── PROJECT_TREE.md                # ★ bu dosya
│   ├── COLONY_SCORE.md                # skor algoritması detay
│   ├── ABONELIK_MODELI.md
│   ├── GEZGINCI_MODU.md
│   ├── SENSOR_PAKETI.md
│   ├── KART_VE_VERI.md
│   ├── ALIM_PLANI.md
│   ├── ALIM_LISTESI_TAM.md
│   ├── ALIM_ASAMA1_ASAMA2.md
│   ├── ALIM_UZAK_ONCELIKLI.md
│   ├── IKI_SISTEM_S_ve_C.md
│   ├── DEMO_PLAN.md
│   ├── TEST_PLAN_100_KOVAN.md
│   ├── PROFESYONEL_LIG_OZELLIKLER.md
│   ├── payload.schema.json
│   └── alim-listesi-tam.csv
│
├── apps/
│   ├── api/                           # koloni backend
│   │   ├── README.md
│   │   └── src/
│   │       ├── server.js              # ✓ giriş noktası
│   │       ├── colony.js              # ✓ skor / oğul / arı
│   │       ├── routes/                # plan: router modülleri
│   │       │   ├── README.md
│   │       │   ├── hives.js           # stub
│   │       │   ├── ingest.js          # stub
│   │       │   ├── alerts.js          # stub
│   │       │   ├── apiaries.js        # stub — arılık
│   │       │   ├── transport.js       # stub — gezginci
│   │       │   └── subscription.js    # stub — abonelik
│   │       ├── services/
│   │       │   ├── README.md
│   │       │   ├── alertEngine.js     # stub
│   │       │   ├── transportMode.js   # stub — taşıma kuralları
│   │       │   └── ingestValidator.js # stub
│   │       └── middleware/
│   │           ├── README.md
│   │           └── auth.js            # stub
│   │
│   ├── web/                           # koloni web panel
│   │   ├── README.md
│   │   ├── index.html                 # ✓
│   │   ├── app.js                     # ✓ liste + alarm
│   │   ├── styles.css                 # ✓
│   │   ├── pages/                     # plan: ayrı ekranlar
│   │   │   ├── README.md
│   │   │   ├── dashboard.js           # stub
│   │   │   ├── hive-detail.js         # stub
│   │   │   ├── calibrate.js           # stub
│   │   │   ├── transport.js           # stub — gezginci
│   │   │   └── alerts.js              # stub
│   │   └── components/                # plan: UI parçaları
│   │       ├── README.md
│   │       ├── score-badge.js         # stub
│   │       ├── sensor-chart.js        # stub
│   │       └── hive-row.js            # stub
│   │
│   └── mobile/                        # plan: iOS / Android
│       └── README.md
│
├── packages/
│   └── shared/                        # api + firmware ortak
│       ├── README.md
│       ├── constants.js
│       └── schemas/
│           ├── ingest.schema.json
│           └── colony.response.json   # plan
│
├── firmware/
│   ├── README.md                      # genel
│   ├── node/                          # T-Weigh kovan NODE
│   │   ├── README.md
│   │   ├── platformio.ini             # plan
│   │   └── src/
│   │       ├── main.cpp               # plan
│   │       ├── sensors/
│   │       │   ├── loadcells.cpp      # plan — 4× HX711
│   │       │   ├── dht22.cpp          # plan
│   │       │   ├── ir_counter.cpp     # plan
│   │       │   ├── adxl345.cpp        # plan
│   │       │   └── microphone.cpp     # plan
│   │       ├── transport/
│   │       │   ├── wifi_test.cpp      # plan — ev router test
│   │       │   └── lora_send.cpp      # plan — GATE
│   │       └── config.h               # plan — hiveId, wifi, api
│   └── gate/                          # T-Beam + A7670E
│       ├── README.md
│       └── src/
│           ├── main.cpp               # plan
│           ├── lora_receive.cpp       # plan
│           └── cellular_forward.cpp   # plan — POST ingest
│
├── hardware/                          # mekanik / montaj
│   ├── README.md
│   ├── platform/
│   │   ├── README.md                  # tartı platform ölçüleri
│   │   └── dimensions.md              # langstroth uyum
│   ├── wiring/
│   │   ├── README.md
│   │   └── node-pinout.md             # T-Weigh pin bağlantı
│   └── mounting/
│       ├── README.md
│       ├── ir-entrance.md             # kapı IR montaj
│       └── hive-integration.md        # kovana uygulama
│
└── scripts/
    ├── README.md
    ├── dev.sh                         # npm run dev kısayolu
    └── test-ingest.sh                 # curl ingest örneği
```

## durum işaretleri

| simge | anlam |
|-------|--------|
| ✓ | çalışıyor / dolu |
| stub | dosya var, henüz bağlanmadı |
| plan | yapılacak |

## nereden başlanır

1. `docs/ozellikler/` — **her özellik ayrı Türkçe dosya** (`AGAC.md`)  
2. `docs/UYGULAMA_OZELLIKLER.md` — özet özellik listesi  
3. `apps/api/src/colony.js` — skor mantığı  
4. `firmware/node/` — T-Weigh WiFi test  
5. `apps/web/pages/` — ekran ekran panel  

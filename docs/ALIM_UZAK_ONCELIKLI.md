# beepack — alım sırası

**karar:** önce WiFi ile NODE test → **çalışınca GATE**.

```
1) NODE + ev WiFi     ~3.800 ₺    yakında doğrula
2) çalışıyorsa GATE   ~5.100 ₺    uzak dinleme (Tortum)
```

---

## şimdi al (NODE — WiFi test)

| blok | ~₺ |
|------|---:|
| T-Weigh + T-U2T + tüm sensörler + pil + platform | 3.410 |
| kargo | ~350 |
| **şimdi** | **~3.760** |

**alma:** T-Beam, A7670E, GATE kutusu/pil — henüz yok.

veri yolu (test):

```
T-Weigh → ev WiFi router → laptop koloni (localhost:3847)
```

---

## çalışınca al (GATE — uzak)

| blok | ~₺ |
|------|---:|
| T-Beam + A7670E + güneş/pil/kutu | 5.022 |
| kargo | ~80 |
| SIM | 0 (kendi hattın) |
| **sonra** | **~5.100** |

veri yolu (uzak):

```
T-Weigh → LoRa → GATE → 4G → koloni (her yerden)
```

---

## “çalışıyor” kriteri (GATE’e geç)

- [ ] tartı panoda değişiyor  
- [ ] sıcaklık / nem geliyor  
- [ ] ir beeIn/Out sayılıyor (veya en azından okuma var)  
- [ ] skor / oğul paneli doluyor  
- [ ] birkaç gün stabil (pil + güneş)

hepsi OK → GATE sipariş.

---

## toplam

| | ₺ |
|--|--:|
| şimdi (NODE) | **~3.760** |
| sonra (GATE) | **~5.100** |
| sistem | **~8.900** |

malzeme detay: `ALIM_LISTESI_TAM.md`  
WiFi test: T-Weigh WiFi → `POST /api/ingest`

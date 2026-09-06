# Görev listesi (yapılacaklar)

**Durum:** calisiyor (demo — `GET /api/tasks` + panel)  
**Ekran:** üstte görev bandı + kovan detay  
**Sıra:** **Öncelik 1 → 5** (1 en acil)

Kod alanı: **Öncelik 1** … **Öncelik 5**.

---

## Öncelik 1–5

| Kod | Anlam | Ne zaman |
|-----|--------|----------|
| **Öncelik 1** | En acil | Hemen / 48 saat |
| **Öncelik 2** | Acil | Bu hafta başı |
| **Öncelik 3** | Yüksek | Bu hafta |
| **Öncelik 4** | Orta | Takip / bu ay |
| **Öncelik 5** | Düşük | Rutin / isteğe bağlı |

Görünen kod: **`Öncelik 1`** … **`Öncelik 5`**.  
Aynı kodda: oğul > sağlık > operasyon > kayıt.

---

## Görev türleri

### Oğul
| Görev | Tetik | |
|-------|--------|--|
| Oğul alarm — müdahale | risk ≥75 veya katman kritik/maks | **Öncelik 1** |
| Oğul gerçekleşti — ana kontrol | faz = occurred | **Öncelik 1** |
| Kat böl adayı | arı 55k+ / katman maksimum | **Öncelik 1** |
| Süper ekle | oğul yüksek + ağırlık plato | **Öncelik 1–2** |
| Oğul risk — süper / kat planla | risk 50–74 veya katman yüksek | **Öncelik 2** |
| Oğul izle — günlük kontrol | risk 28–49 veya katman izle/artan | **Öncelik 4** |

### Sağlık / çevre
| Görev | Tetik | |
|-------|--------|--|
| Sağlık kritik — yerinde bak | sağlık &lt; 45 | **Öncelik 1** |
| Ana kaybı şüphesi — kontrol | queenless sinyali / ana kaydı | **Öncelik 1** |
| Aşırı sıcak — gölge / havalandır | temp yüksek | **Öncelik 2** |
| Nem düzensiz | nem eşik dışı | **Öncelik 4** |

### Besleme (ayrı tür: `feeding`)
| Görev | Tetik | |
|-------|--------|--|
| Besleme — don / soğuk | dış hava ≤5°C / don | **Öncelik 2** |
| Besleme — zayıf koloni | tartı &lt; 24 kg veya skor &lt; 40 veya arı &lt; 18k | **Öncelik 2–3** |
| Besleme — düşük kovan ısısı | kovan içi ≤28°C (dış soğuk değil) | **Öncelik 2** |
| Don riski — yalıtım kontrol | dış soğuk (`weather_frost`) | **Öncelik 2** |

Besleme ile yalıtım **ayrı görev**; ikisi birlikte çıkabilir.

### Tartı / alarm
| Görev | Tetik | |
|-------|--------|--|
| Ani ağırlık düşüşü — kontrol | weight_drop / occurred | **Öncelik 1** |
| Dengesizlik — platform düzelt | köşe farkı | **Öncelik 2** |
| Darbe / titreşim — kontrol | vibration | **Öncelik 2** |
| Pil bitiyor — şarj / değiştir | pil &lt; 20% | **Öncelik 3** |

### Operasyon
| Görev | Tetik | |
|-------|--------|--|
| Offline — bağlantı kontrol | veri yok | **Öncelik 2** |
| Yerleşme takibi | taşıma + 48s | **Öncelik 3** |
| Kalibrasyon eksik | tare/referans yok | **Öncelik 4** |
| Taşıma hazırlığı | takvim / manuel | **Öncelik 4** |
| Muayene zamanı | son muayene &gt; N gün | **Öncelik 4** |

### Kayıt
| Görev | Tetik | |
|-------|--------|--|
| Ana / baba ırkı gir | ırk boş | **Öncelik 5** |
| Kovan düzeni güncelle | plaka/süper boş | **Öncelik 5** |

### Manuel
Arıcı serbest görev ekler; **Öncelik 1–5** seçer.

---

## Görev kartı (örnek)

```
Öncelik 1 · Kovan 47 · Ana Kafkas × Baba Karniyol
Oğul alarm — müdahale
Risk 78 · Arı ~52k · Kritik
→ 48 saat içinde süper ekle veya kat böl
[ Tamam ] [ Ertele ] [ Kovana git ]
```

---

## 100 kovanda

```
Görevler
  Öncelik 1 (3)  …
  Öncelik 2 (5)  …
  Öncelik 3 (7)  …
  Öncelik 4 (12) …
  Öncelik 5 (4)  …
```

Filtre: Öncelik 1–5 · tür · arılık · Ana×Baba  
Sıra: Öncelik 1 → 5, sonra risk puanı.

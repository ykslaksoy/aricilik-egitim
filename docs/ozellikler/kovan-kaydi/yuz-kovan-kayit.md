# 100 kovan — uygulamada kayıt nereye?

Arıcı donanım dosyasını görmez. Uygulamada kayıt **işletme → arılık → kovan** sırasıyla yapılır.

---

## Hiyerarşi

```
İşletme / sahip          örn. Yılmaz Arılığı
  └── Arılık (konum)     örn. Tortum · Yanıkdağ
        └── Kovan 1…100  her biri aynı özellik alanları
```

100 kovan = aynı işletme altında 100 satır; her satırda aynı kart yapısı.

---

## Nerede ne girilir?

### 1. İşletme (bir kez)
| Alan | Ekran |
|------|--------|
| İşletme / sahip adı | Ayarlar / işletme profili |
| Abonelik | Ayarlar |

### 2. Arılık (arılık başına)
| Alan | Ekran |
|------|--------|
| Arılık adı (konum etiketi) | Gezginci / arılıklar |
| Ana kamera var mı? | Arılık ayarı (`mainCameraPresent`) |
| Geçit / WiFi kutusu notu | Arılık ayarı (opsiyonel teknik) |

### 3. Kovan (her kovan — veya toplu)
| Alan | Ekran | Not |
|------|--------|-----|
| Kovan no (1…100) | Kovan oluştur / liste | Kimlik |
| Standart / kameralı | Kovan oluştur | paket tipi |
| Ana arı | Kovan profili | |
| Baba hattı | Kovan profili | |
| Irk / yavru | Kovan profili | |
| Kovan düzeni (plaka, süper) | Kovan profili | |
| Tare / petek / kalibrasyon | Kalibrasyon | |
| `cameraPresent` | Kovan profili / otomatik | takılıysa |

### 4. Otomatik (arıcı doldurmaz)
| Veri | Nereden |
|------|---------|
| kg, °C, nem, IR, mic, titreşim, pil | Kovan kartı → ingest |
| Skorlar, oğul, arı tahmini | Sunucu hesaplar |
| Alarmlar | Alarm motoru |

---

## 100 kovanda hızlı kayıt (toplu)

Tek tek 100 form doldurulmaz:

1. **İşletme** oluştur  
2. **Arılık** ekle  
3. **Toplu kovan ekle:** “Kovan 1–100 oluştur”  
   - ortak: ırk = Kafkas, paket = standart  
4. Sonra sadece fark edenleri düzenle (ana, baba, kamera)  
5. Kalibrasyon: önce 3–5 kovanda; diğerlerine kopyala / şablon

Şablon örneği: “Yılmaz-Kafkas-standart” → yeni kovana uygula.

---

## Ekran → özellik eşlemesi

| Ekran | Ne girilir / görülür |
|--------|----------------------|
| Özet | 100 kovan özeti, riskli sayısı |
| Kovan listesi | #, kg, skor, sağlık, oğul, arı |
| Kovan detay | canlı sensör + skor (giriş yok) |
| Kovan profili | ana, baba, ırk, düzen, kamera bayrağı |
| Kalibrasyon | tare, petek, öğlen, silkme |
| Gezginci | arılık, taşıma, yerleşme |
| Alarmlar | otomatik; okuma / filtre |
| Kamera görüntüsü | varsa; yoksa gizli |
| Ayarlar | işletme, abonelik, bildirim |

---

## Örnek: Kovan 47

```
Yılmaz Arılığı
  └── Tortum
        └── Kovan 47
              profil: ana Yılmaz-A3 · baba Yılmaz-B1 · Kafkas
              paket: standart (kamera yok)
              sensör: otomatik akıyor
              skor: sunucu üretiyor
```

**Özet:** Özellikler **kovan profiline** ve **arılık ayarına** girilir; sensör/skor **otomatik**. 100 kovanda toplu oluştur + şablon kullanılır.

# Kalibrasyon ekranı

**Durum:** calisiyor (API calibrate + **Kovan Petek Tarama** sihirbazı)

| Yöntem | Ekran |
|--------|--------|
| Manuel API | `POST /api/hives/:id/calibrate` |
| **Kovan Petek Tarama** | `/petek-tarama.html?hiveId=N` |

Petek Tarama: tare + dolu tartı + 20 segment telefon videosu → AI arı/bal → onay.  
Detay: `kalibrasyon/petek-tarama.md`

Manuel alanlar: tare, comb, öğlen beeOut, referans arı sayısı.  
İleride: petek silkme olayı başlat / bitir.

**Bağlı:** `kalibrasyon/`

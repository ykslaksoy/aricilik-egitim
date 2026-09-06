# Risk kategorileri

**Durum:** calisiyor (kısmen proxy)  
**Kod:** `evaluateRiskKategorileri()` · `apps/api/src/hiveState.js`  
**API:** `evaluation.riskKategorileri`

Kullanıcı risk listesinin dört ana başlığı tek yapıda değerlendirilir.  
Kesin teşhis değildir — her madde `calisiyor`, `proxy` veya `plan` olarak işaretlenir.

---

## Yapı

```json
{
  "riskKategorileri": {
    "ozet": "Varroa zararlısı: Muayene / akar sayımı — …",
    "enKotuSeviye": 1,
    "oneCikan": [{ "kategori": "biyolojik", "label": "…", "seviye": 1 }],
    "kategoriler": {
      "biyolojik": { "label": "…", "seviye": 1, "maddeler": […] },
      "cevresel": { … },
      "yonetimsel": { … },
      "kimyasal_dis": { … }
    }
  }
}
```

### Seviye (1–5)

| Seviye | Anlam |
|--------|--------|
| **1** | Acil muayene / müdahale |
| **2** | Bu hafta kontrol |
| **3** | İzle |
| **4–5** | Düşük / rutin |

### Mod

| Mod | Anlam |
|-----|--------|
| `calisiyor` | Sensör veya kayıt ile otomatik |
| `proxy` | Dolaylı sinyal — yerinde doğrulama şart |
| `plan` | Henüz otomatik değil; manuel kayıt veya ileride |

---

## 1. Biyolojik riskler

| Madde | Mod | Sinyaller |
|-------|-----|-----------|
| **Varroa** | proxy | Zayıf koloni, düşük IR (hava açık), yüksek `diseaseRiskScore` |
| **Yavru çürüklüğü (AFB/EFB)** | proxy | Kritik sağlık + zayıf koloni; nem + düşük sağlık |
| **Mantar / sindirim (chalkbrood, Nosema)** | proxy | Nem ≥ %85; zayıf + düşük trafik |
| **Yağmacılık / zararlı** | proxy / plan | Titreşim, hafif kg kaybı (oğul değil), sonbahar + zayıf kovan |

---

## 2. Çevresel ve iklimsel

| Madde | Mod | Sinyaller |
|-------|-----|-----------|
| **Nem / havalandırma** | calisiyor | `humidity` eşikleri |
| **Aşırı hava / kış** | calisiyor | Konum hava: don, fırtına, düşük kovan ısısı |
| **Besin / su** | calisiyor / proxy | `besleme` boyutu; `suKaynagiYakin`, `kuraklikBolgesi` kayıtları |

---

## 3. Yönetimsel

| Madde | Mod | Sinyaller |
|-------|-----|-----------|
| **Ana arı** | calisiyor | `ana` durumu; `anaYasAy` kaydı |
| **Petek kullanımı** | proxy / plan | `petekYasYil`, `petekEski`, `petekTransferSon` |
| **Kontrol eksikliği** | calisiyor | `sonMuayeneAt` — 21 / 35 gün eşikleri |

---

## 4. Kimyasal ve dış tehditler

| Madde | Mod | Sinyaller |
|-------|-----|-----------|
| **Pestisit** | proxy / plan | Açık hava + düşük trafik + düşük sağlık; `pestisitSuphesi` kaydı |
| **Hırsızlık / fizik** | proxy / plan | Yüksek titreşim, platform dengesizliği; `hirsizlikSuphesi`, `fizikselHasar` |

---

## Demo kovanlar

| Kovan | Öne çıkan risk |
|-------|----------------|
| **10** | Varroa proxy, petek yaşı, muayene 42 gün önce |
| **13** | Tortum yağmur — düşük IR hastalık sayılmaz |
| **15** | Pestisit proxy (sessiz + düşük trafik) |
| **21** | Chalkbrood proxy (yüksek nem) |
| **24** | Yağma / fizik proxy (yüksek titreşim) |
| **40** | Ana kaybı + yönetim riski |

---

## Kayıt alanları (`hiveMeta`)

| Alan | Tip | Açıklama |
|------|-----|----------|
| `sonMuayeneAt` | ISO tarih | Son yerinde kontrol |
| `petekYasYil` | sayı | Petek yaşı |
| `petekEski` | bool | Siyah / eski petek |
| `petekTransferSon` | bool | Yakın dönem petek transferi |
| `anaYasAy` | sayı | Ana yaşı (ay) |
| `suKaynagiYakin` | bool | Su kaynağı yakın mı |
| `kuraklikBolgesi` | bool | Kuraklık bölgesi |
| `yagmacilikSuphesi` | bool | Manuel yağma şüphesi |
| `pestisitSuphesi` | bool | Manuel ilaçlama şüphesi |
| `hirsizlikSuphesi` | bool | Hırsızlık şüphesi |
| `fizikselHasar` | bool | Ayı / devrilme vb. |

**Eşikler:** `packages/shared/constants.js` → `RISK`  
**Bağlı:** `hastalik-riski.md` · `kovan-durumlari.md` · `sensorler/degerlendirme.md`

# Ana × baba süzme (ırk çaprazı)

**Karar:** Kovanlar **Ana ırkı × Baba ırkı** ile kategorize edilir.  
Irklar **sabit liste değil** — yeni ırk eklenebilir.

---

## Süzgeç mantığı

```
Ana {ırk} × Baba {ırk}
```

Örnekler:

| Ana | Baba | Etiket |
|-----|------|--------|
| Karniyol | Kafkas | Ana Karniyol × Baba Kafkas |
| Kafkas | Karniyol | Ana Kafkas × Baba Karniyol |
| Kafkas | Kafkas | Saf Kafkas |
| Anadolu | İtalyan | Ana Anadolu × Baba İtalyan |
| (yeni) | (yeni) | aynı format |

---

## Irk listesi (genişletilebilir)

Başlangıç önerisi (ayarlardan / işletme ekler):

1. Kafkas  
2. Karniyol  
3. Anadolu  
4. İtalyan  
5. Buckfast  
6. Yerel / melez  
7. Bilinmiyor  

**Yeni ırk:** Ayarlar → Irklar → “Ekle” → hem ana hem baba seçiminde çıkar.  
Silinen ırk: kayıtlarda varsa “eski ad” korunur veya “Bilinmiyor”a map.

---

## Veri modeli

```json
{
  "breeds": ["Kafkas", "Karniyol", "Anadolu"],
  "hive": {
    "hiveNo": 47,
    "anaIrk": "Kafkas",
    "babaIrk": "Karniyol",
    "caprazEtiket": "Ana Kafkas × Baba Karniyol"
  }
}
```

`caprazEtiket` sunucu veya istemci üretir: `"Ana " + anaIrk + " × Baba " + babaIrk`  
Saf ise isteğe bağlı kısa etiket: `"Saf " + anaIrk` (ana === baba).

---

## Liste / özet

- Filtre: çapraz kombinasyonlar (sadece mevcut kayıtlarda olanlar gösterilir)  
- Grup: aynı çapraz altındaki kovan sayısı + risk özeti  
- 100 kovan: “Ana Kafkas × Baba Karniyol — 23 kovan”

Kimlik değişmez: **İşletme · Kovan no**

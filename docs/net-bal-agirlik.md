# Net bal ağırlığı — kısa rehber

## Kovan tipi (Türkiye varsayılanları)

Pazar ve TAŞ tarzı ekipman için **varsayılan tip:** `langstroth_10` — 10 çerçeveli Langstroth derin gövde.

| Kod | Etiket (kısa) | Kapasite | Boş kovan (kg) | Boş çerçeve | Ballı çerçeve | Bal farkı |
|-----|---------------|----------|----------------|-------------|---------------|-----------|
| `langstroth_10` | Langstroth · Standart 10 çerçeve | 10 | 18,5 | 1,2 | **3,0** | 1,8 |
| `langstroth_8` | Langstroth · küçük 8 çerçeve | 8 | 15,5 | 1,1 | 2,8 | 1,7 |
| `dadant_11` | Dadant | 11 | 20 | 1,25 | 3,1 | 1,85 |
| `layens_12` | Layens | 12 | 17,5 | 1,05 | 2,85 | 1,8 |
| `national` | National (British) | 10 | 16 | 1,1 | 2,9 | 1,8 |
| `warre` | Warre | 8 | 12,5 | 0,85 | 2,2 | 1,35 |
| `kafkas` | Kafkas | 10 | 22 | 1,3 | 3,0 | 1,7 |
| `ozel` | Özel (+ isteğe bağlı `customTypeLabel`) | — | elle | Ayarlar’dan | Ayarlar’dan | — |
| `custom_*` | Ayarlar › tek özel katalog girişi | değişken | değişken | değişken | değişken | — |

Ballı çerçeve **3 kg** değeri `bakim-plan.js` içindeki kış/hasat çerçeve notu ile uyumludur (`KG_PER_HONEY_FRAME = 3`).

Eski kayıtlar tipi olmadan gelirse bir kez **`langstroth_10`** atanır (`superari.hiveType.migrated.v1`).

## Formüller

```
netBal = tartıToplam − emptyHiveKg − malzemeDara − [arıKitlesi]

tahminHasat = ballıÇerçeve × (frameHoneyKg − frameEmptyKg) × kısmiDoluluk

tartıHasat ≈ (tartıÖnce − daraÖnce) − (tartıSonra − daraSonra)
```

**Yöntem (`method`):** `cerceve` · `tarti` · `karma`

## Nereden girilir?

1. **Koloni düzenleyici / kovan detay:** Kovan tipi + boş ağırlık (tare); tip değişince önerilen dara güncellenir (elle girilmişse korunur).
2. **Ayarlar › Araçlar:** «Özel» tip için çerçeve kg ince ayarı; **Gelişmiş · standart kovan ekle** ile tek özel katalog (`superari.hiveTypes.custom.v1`).
3. **Hasat / tartı:** `superari.hasat.v2` → `honeyKg`, `netKg`, `method`; koloni olayı `Sağım: X kg bal`.

## Depo

- `superari.balAgirlik.v1` — global ince ayar
- Kovan (`superari.kovanlar.v1`): `hiveType`, `emptyHiveKg`, `emptyHiveSource`, `lastTareAt`
- Modül: `apps/web/bal-agirlik.js` (`SuperAriBalAgirlik`)

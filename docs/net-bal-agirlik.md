# Net bal ağırlığı — kısa rehber

## Kovan tipi (Türkiye varsayılanları)

Pazar ve TAŞ tarzı ekipman için **varsayılan tip:** `langstroth_10` — 10 çerçeveli Langstroth derin gövde.

| Kod | Etiket | Kapasite | Boş kovan (kg) | Boş çerçeve | Ballı çerçeve | Bal farkı |
|-----|--------|----------|----------------|-------------|---------------|-----------|
| `langstroth_10` | Langstroth 10 çerçeve (standart) | 10 | 18,5 | 1,2 | **3,0** | 1,8 |
| `dadant_11` | Dadant 11 çerçeve | 11 | 20 | 1,25 | 3,1 | 1,85 |
| `langstroth_8` | Langstroth 8 çerçeve (küçük) | 8 | 15,5 | 1,1 | 2,8 | 1,7 |
| `kafkas` | Kafkas / bölgesel yüksek gövde | 10 | 22 | 1,3 | 3,0 | 1,7 |
| `ozel` | Özel — elle kg | — | elle | Ayarlar’dan | Ayarlar’dan | — |

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
2. **Ayarlar › Araçlar:** «Özel» tip için çerçeve kg ince ayarı.
3. **Hasat / tartı:** `superari.hasat.v2` → `honeyKg`, `netKg`, `method`; koloni olayı `Sağım: X kg bal`.

## Depo

- `superari.balAgirlik.v1` — global ince ayar
- Kovan (`superari.kovanlar.v1`): `hiveType`, `emptyHiveKg`, `emptyHiveSource`, `lastTareAt`
- Modül: `apps/web/bal-agirlik.js` (`SuperAriBalAgirlik`)

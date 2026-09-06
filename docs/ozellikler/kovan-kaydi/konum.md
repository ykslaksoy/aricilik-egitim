# Konum (kovan bazında)

**Durum:** calisiyor (etiket + değiştirme + hava) / plan (harita UI)

Kovanlar **sabit değil**: bazen **ev**, bazen **yayla**, bazen **başka yayla**.  
Konum **kovan kaydında** tutulur; taşınınca güncellenir.

---

## Ne kaydedilir?

| Alan | Örnek |
|------|--------|
| `konumId` | `ev` · `yayla-tortum` · `yayla-2` |
| `konumEtiket` | Ev · Yayla Tortum · Yayla 2 |
| `konumTipi` | ev / yayla / gecici |
| `lat` / `lon` | Hava için (konum kaydından) |
| `tasindiAt` | Son konum değişikliği |

İşletme adı kimliktir; konum **yer bilgisidir** (kimlik değil).

---

## Nasıl değişir?

1. Gezginci → taşıma bitir → hedef konum seç  
2. Kovan detayında konum select (`PATCH /api/hives/:id/konum`)  
3. Toplu: “Kovan 10–20 → Yayla Tortum” (plan)

---

## Ne işe yarar?

- Hava durumu (o konum)  
- Liste süzgeci: Ev / Yayla Tortum / Yayla 2  
- Gezginci geçmişi  
- Ana kamera hangi arılıkta  

**Bağlı:** `gezginci/hava-durumu.md` · `gezginci/tasima-baslat-bitir.md` · `yuz-kovan-kayit.md`

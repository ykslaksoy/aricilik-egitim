# SüperArı Ana (LOCKED-FINAL)

Kaynak: Grok/SüperArı static demo (`ana.html` + bee tour). Repo yolu **`apps/web/`** — kökte ayrı static yok. Express `apps/web` klasörünü `http://localhost:3847/ana.html` olarak sunar.

## Kilit

- Hardal **solda** + **üst şerit** (`.hardal-rail` + `#brand-strip`). Kartlarda işletme adı yok.
- Yakma simgeler (multiply damga), kovan kart içinde ortalı.
- Koloni = 3 arı (`bees-3`); Oğul = 1 arı.
- 3×3 sıra: Tartı · Sağlık · Oğul / Kovanlar · Koloni · Arılıklar / Görevler · Uyarılar · Raporlar
- Bee mascot turu IA kabuğunu değiştirmez (`#bee-tour`).

Kontrol: `npm run check:ana`

## Vercel `superari`

Önceki draft PR (`cursor/ana-hive-visual-32f5`) Vercel projesine bağlıydı:

- Proje: `superari` (takım `yuksel2`)
- Önizleme örneği: `https://superari-git-cursor-ana-hive-visual-32f5-yuksel2.vercel.app/ana.html`

Bu ortamda Vercel MCP takım listesi boş / 403 döndü; Git bağlantısını dashboard’dan doğrulayın. Root Directory **`apps/web`** olmalı (veya Express build). Production branch `main` ise bu PR merge edilmeden canlı Ana güncellenmez.

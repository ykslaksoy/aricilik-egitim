# Agent instructions (all work in this repo)

## Genel model kuralı

Tüm otomatik ve yardımcı çalışmalar — **Cursor Agent**, **Cloud Agent**, **subagent / worker**, Grok bot veya başka kanaldan gelen delegasyonlar dahil — varsayılan olarak **Composer 2.5** (`composer-2.5`) ile yapılır.

- **Kullan:** `composer-2.5` (Composer 2.5, Fast değil).
- **Kullanma:** Composer 2.5 **Fast**, Auto / Auto Intelligence, Max Mode ve kullanıcı açıkça istemedikçe premium modeller (Claude Opus/Sonnet, GPT high/thinking, vb.).
- Alt görev veya worker başlatırken model alanına `composer-2.5` yaz.
- Rutin kod, HTML, CSS, fix ve ürün istekleri bu modelde kalsın; mimari veya model değişikliği yalnızca kullanıcı net istediğinde.

Detay ve gerekçe: `.cursor/rules/composer-model.mdc`.

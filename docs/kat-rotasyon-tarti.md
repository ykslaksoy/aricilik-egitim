# Kat rotasyonu ve tartım (oyun kitabı)

## Ne zaman?

İkinci bal katı dolduğunda üçüncü katı verirken bazı arıcılar yalnızca **üste istiflemek** yerine:

1. **2. katı** (genelde dolu kutu) kaldırır,
2. **3. katı 2. sıraya** koyar,
3. Dolu 2. katı üste veya kenara alır (hasat / yönetim).

SüperArı’da bu seçim **Genişleme stratejisi** adımında **«2. katı aldım, 3. katı 2. sıraya koydum (rotasyon)»** olarak kaydedilir.

## Tartım neden gerekli?

Kutu sırası değişince toplam ağırlık bazen az değişir; ayrı tartılan kutu veya önce/sonra farkı bal stok takibini doğrular. Bakım otomatik revizesi rotasyon olayında **otomatik kg yazmaz** — tartım sihirbazı veya elle kayıt kullanın.

## Sihirbaz adımları (`tarti-rotasyon.js`)

1. **Yapı:** gövde / kat sayısı, hangi kutu kaldırıldı, «üst kat ayrı tartıldı» işareti.
2. **Tartı A:** rotasyon öncesi (tam istif veya kutu ayrı).
3. **Rotasyon:** arıcı işi bitti onayı.
4. **Tartı B:** rotasyon sonrası.
5. **Özet:** Δ kg; ~8 kg varsayımı (`tarti-bakim-delta`) ile uyum kontrolü.

### Otomatik tartı

- **Tek kovan:** Muayeneden veya kovan sayfasından sihirbaz; **«Tarttır»** sensör anlık okuma ister (`SuperAriSensorPolling.requestTartiWeigh`).
- **Tüm kovanlar:** Kovanlar › Tartı görünümü veya Cihazlar › Tartı › **«Tümünü tarttır»** — otomatik cihazlar 7 sn arayla sıraya alınır; el kantarı olanlar için kontrol listesi açılır.

Kayıtlar `source: talep` ve `requestedAt` ile işaretlenir.

### Elle tartı

Cihaz yoksa veya okuma gelmezse kg alanına girin; son tartım + önerilen delta (`tarti-bakim-delta` / bekleyen revize) elle formda önerilir.

## Bakım bağlantısı

Muayene **Kat rotasyonu (2→3 sıra)** olayı kaydedildiğinde tartım sihirbazı otomatik açılır. Klasik **1 kat eklendi** akışı ve bakım revizesi (#41) aynen çalışmaya devam eder.

## İpuçları

- Tam istif tartımında rotasyon sonrası Δ genelde **±1,5 kg** içinde kalır.
- Kaldırılan kat **ayrı tartıldı** işaretliysa Δ’nın **~8 kg** bandında olması beklenir (kutu + çerçeve varsayımı).
- Hasat öncesi dolu kutuyu üste almak için rotasyon + tartım, bal stok raporlarını güncel tutar.

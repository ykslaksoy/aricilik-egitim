# Kamera politikası

**Karar:** İki kamera da **var gibi** kurgulanır; **takılmazsa** o katman kapanır, skorlar çalışır.

## Alt alta

1. Tartı, sıcaklık/nem, IR, mikrofon, titreşim — **zorunlu**  
2. Kovan üzeri giriş kamerası — **opsiyonel**  
3. Ana kamera (arılık) — **opsiyonel**  
4. WiFi ağ kutusu — kamera varken  

| Bayrak | Anlam |
|--------|--------|
| `cameraPresent` | kovan üzeri giriş kamerası |
| `mainCameraPresent` | arılık ana kamerası |

İkisi de yok → **standart paket** gibi tam çalışır.

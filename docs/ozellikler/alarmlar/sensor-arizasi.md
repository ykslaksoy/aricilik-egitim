# Sensör arızası uyarıları

**Durum:** calisiyor (demo)

Saçma / imkânsız / eksik ölçüm → **ARIZA** (değer düşük/yüksek uyarısından ayrı).

| Arıza | Tetik | Öncelik |
|-------|--------|:-------:|
| Offline | son veri &gt; 2 saat | Öncelik 1 |
| Tartı | kg ≤ 0 veya &gt; 80 | Öncelik 1 |
| Sıcaklık | &lt; −10°C veya &gt; 50°C | Öncelik 1 |
| Nem | &lt; 0 veya &gt; 100 | Öncelik 1 |
| IR sayaç | sürekli 0 (arıza bayrağı) | Öncelik 2 |
| Mikrofon | RMS &lt; 0 | Öncelik 2 |
| Titreşim | değer &lt; 0 | Öncelik 2 |

Tip: `sensor_fault` · görev: “Sensör arızası — …”  
Liste süzgeci: **Arıza**

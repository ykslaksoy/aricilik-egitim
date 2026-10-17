# T-Weigh pin bağlantı (taslak)

| sensör | bağlantı |
|--------|----------|
| HX711 ×4 | kart üzerinde |
| SHT41 (kovan içi) | I²C SDA/SCL (adres 0x44), 3,3 V — pull-up kart üzerinde değilse 4,7k |
| DS18B20 (giriş) | 1-Wire GPIO + 4,7k pull-up |
| IR ×2 | GPIO interrupt |
| ADXL345 | I2C (SDA/SCL) |
| mic | ADC veya dijital modül |

kesin pinler T-Weigh şemasına göre doldurulacak.

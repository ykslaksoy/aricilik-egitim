// koloni-243: SHT41 sürücüsü (taslak — cihazda test edilecek). Kütüphanesiz, yalnız Wire.
// Datasheet (Sensirion SHT4x): I²C adres 0x44 (SHT41-AD1B), komut 0xFD = yüksek hassasiyet ölçüm,
// 0x94 = yumuşak sıfırlama; yanıt 6 bayt: T(2) CRC  RH(2) CRC; CRC-8 polinom 0x31, başlangıç 0xFF.
// T [°C] = -45 + 175 · S_T / 65535 ; RH [%] = -6 + 125 · S_RH / 65535 (0–100'e kırpılır).
#include "sht41.h"

static TwoWire *s_bus = nullptr;
static uint8_t s_addr = 0x44;

static uint8_t crc8(const uint8_t *d, int n) {
  uint8_t c = 0xFF;
  for (int i = 0; i < n; i++) {
    c ^= d[i];
    for (int b = 0; b < 8; b++) c = (c & 0x80) ? (uint8_t)((c << 1) ^ 0x31) : (uint8_t)(c << 1);
  }
  return c;
}

static bool cmd(uint8_t c) {
  s_bus->beginTransmission(s_addr);
  s_bus->write(c);
  return s_bus->endTransmission() == 0;
}

bool sht41Begin(TwoWire &bus, uint8_t addr) {
  s_bus = &bus; s_addr = addr;
  if (!cmd(0x94)) return false; // yumuşak sıfırlama
  delay(2);
  return true;
}

bool sht41Read(float *tempC, float *humidity) {
  if (!s_bus || !cmd(0xFD)) return false;
  delay(10); // yüksek hassasiyet ölçüm süresi en çok ~8,3 ms
  uint8_t b[6];
  if (s_bus->requestFrom((int)s_addr, 6) != 6) return false;
  for (int i = 0; i < 6; i++) b[i] = s_bus->read();
  if (crc8(b, 2) != b[2] || crc8(b + 3, 2) != b[5]) return false;
  uint16_t st = (uint16_t)(b[0] << 8 | b[1]), srh = (uint16_t)(b[3] << 8 | b[4]);
  float t = -45.0f + 175.0f * st / 65535.0f;
  float rh = -6.0f + 125.0f * srh / 65535.0f;
  if (rh < 0) rh = 0; if (rh > 100) rh = 100;
  if (tempC) *tempC = t;
  if (humidity) *humidity = rh;
  return true;
}

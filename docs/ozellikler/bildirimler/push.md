# Push bildirim

**Durum:** calisiyor (demo mod · web inbox + tarayıcı bildirimi)

Mobil (iOS/Android) ve web push. Tüm paketlerde.

## Nasıl çalışır

1. Cihaz kaydı: `POST /api/push/register` — platform: `ios` | `android` | `web`
2. Yeni alarmlar oluşunca `pushService.dispatchAlerts()` tüm kayıtlı cihazlara gönderir
3. Web panel: **Push aç** → tarayıcı izni → inbox + `Notification` API (15 sn poll)
4. Demo mod: FCM/APNs anahtarı yoksa inbox + log; üretimde env ile gerçek gönderim

## API

| Endpoint | Açıklama |
|----------|----------|
| `GET /api/push/config` | Mod, kanallar, cihaz sayısı |
| `POST /api/push/register` | Cihaz kaydı |
| `DELETE /api/push/register/:deviceId` | Kayıt sil |
| `GET /api/push/inbox?deviceId=` | Cihaz inbox |
| `PATCH /api/push/inbox/:pushId/read` | Okundu işaretle |
| `POST /api/push/test` | Test bildirimi |
| `PATCH /api/push/preferences` | minPriority, kanallar |

## Üretim ortamı

| Env | Kanal |
|-----|-------|
| `FCM_SERVER_KEY` | Android (Firebase Cloud Messaging) |
| `APNS_KEY_ID` (+ team/key dosyaları) | iOS (Apple Push Notification service) |

## Kod

- `apps/api/src/services/pushService.js`
- Web istemci: `apps/web/app.js` (`enablePush`, `pollPush`)
- Alarm tetikleyici: `syncAllAlerts()` → `pushService.dispatchAlerts(newAlerts)`

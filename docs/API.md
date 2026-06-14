# API Reference

All routes are served from the API root, for example `http://localhost:3000`.

Protected routes use the global auth guard. Send either:

- `Authorization: Bearer <accessToken>` plus `X-Refresh-Token: <refreshToken>`
- `X-API-Key: <apiKey>` for routes that support server-to-server access

## Auth

### Request OTP

`POST /auth/request-code`

```json
{
  "phoneNumber": "+989121234567"
}
```

### Verify OTP

`POST /auth/verify-code`

```json
{
  "phoneNumber": "+989121234567",
  "code": "123456"
}
```

Returns the user, access token, refresh token, and expiry.

### Logout

`GET /auth/logout`

Blacklists the current access token and revokes the refresh token.

## API Keys

### Create API Key

`POST /api-keys`

```json
{
  "name": "Production transcription client",
  "expiresInDays": 90
}
```

The raw `apiKey` is returned only once.

### List API Keys

`GET /api-keys`

Returns non-revoked keys owned by the authenticated user.

### Revoke API Key

`DELETE /api-keys/:uniqueId`

Soft-deletes a key and invalidates its Redis cache entry.

## Wallet

### Total Credit

`GET /wallet/total-credit`

Returns total credit information for the authenticated user.

### Credit Logs

`GET /wallet/log-credit`

Returns wallet transaction log entries.

### Increase Wallet

`POST /wallet/increase-wallet`

```json
{
  "value": 500000
}
```

The minimum accepted value is `500000`.

## Dashboard

### Today Info

`GET /dashbord/today-info`

Returns today's cost, transcription time, and request count for the authenticated user.

## Transcriptions

### Upload Audio

`POST /transcriptions`

Multipart form data:

| Field   | Type | Required |
| ------- | ---- | -------- |
| `audio` | file | yes      |

Accepted extensions are defined in `src/Transcription/transcription.multer.ts`.

### List My Transcriptions

`GET /transcriptions`

Returns the authenticated user's transcription records.

### Get One Transcription

`GET /transcriptions/:id`

Returns one transcription record if it belongs to the authenticated user.

## ID Card

`src/idcard` currently exposes the generated NestJS CRUD routes:

- `POST /idcard`
- `GET /idcard`
- `GET /idcard/:id`
- `PATCH /idcard/:id`
- `DELETE /idcard/:id`

Review and harden this module before exposing it in production.

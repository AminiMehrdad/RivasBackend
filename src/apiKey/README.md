# API Key Service

This module provides API key generation, validation, and management for user authentication.

## Features

- Generate secure API keys with SHA-256 hashing.
- Store only the hashed API key in MySQL.
- Cache valid keys in Redis for 60 seconds.
- Rate-limit API-key requests per key.
- Soft-delete revoked keys.
- Expose only safe key fields when listing keys.

## Endpoints

### Generate API Key

`POST /api-keys`

Headers:

```http
Authorization: Bearer <accessToken>
X-Refresh-Token: <refreshToken>
```

Body:

```json
{
  "name": "My Production Key",
  "expiresInDays": 90
}
```

Response:

```json
{
  "apiKey": "sk_live_abc123...",
  "id": "uuid-123",
  "hint": "xyz9",
  "expiresAt": null,
  "createdAt": "2026-06-11T00:00:00.000Z"
}
```

The raw `apiKey` is returned only once. Store it on the client or server that will call the API.

### List API Keys

`GET /api-keys`

Headers:

```http
Authorization: Bearer <accessToken>
X-Refresh-Token: <refreshToken>
```

### Revoke API Key

`DELETE /api-keys/:uniqueId`

Headers:

```http
Authorization: Bearer <accessToken>
X-Refresh-Token: <refreshToken>
```

## Using API Keys

API keys are handled by the global `AuthGuard`. Protected routes do not need a separate API-key guard.

When a request includes `X-API-Key`, the guard:

1. Hashes and validates the raw key.
2. Checks the Redis rate limit.
3. Loads the key from Redis cache or MySQL.
4. Rejects revoked keys.
5. Sets `req.user` and `req.apiKey`.

Controllers can keep using `req.user.userId` for both JWT and API-key requests:

```typescript
import { Controller, Get, Req } from '@nestjs/common';
import { AuthenticatedRequest } from '../common/guards/auth.guard';

@Controller('protected')
export class ProtectedController {
  @Get('data')
  getData(@Req() req: AuthenticatedRequest) {
    return {
      userId: req.user?.userId,
      authType: req.user?.authType,
      keyId: req.apiKey?.uniqueId,
    };
  }
}
```

Send the key in the `X-API-Key` header:

```bash
curl -H "X-API-Key: sk_live_abc123..." \
  http://localhost:3000/protected/data
```

## Transcription Upload Example

`POST /transcriptions` accepts API-key auth for server-to-server uploads:

```bash
curl -X POST http://localhost:3000/transcriptions \
  -H "X-API-Key: sk_live_abc123..." \
  -F "audio=@./voice.mp3"
```

The form field name must be `audio`.

## Configuration

Add these values to `.env`:

```env
RATE_LIMIT_MAX=60
REDIS_HOST=localhost
REDIS_PORT=6379
```

## Database Schema

The `api_keys` table stores:

| Column | Description |
|--------|-------------|
| `id` | Internal auto-increment id |
| `unique_id` | Public UUID for key management |
| `user_id` | Owner user unique id |
| `name` | User-provided key name |
| `api_key_preview` | Last 4 characters of the raw key |
| `api_key_hash` | SHA-256 hash of the raw key |
| `deleted_at` | Soft-delete timestamp |
| `created_at` | Creation timestamp |

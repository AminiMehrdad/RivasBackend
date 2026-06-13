# Rivas Authentication Service

Production-ready authentication service using NestJS, TypeScript, MySQL, Redis, phone OTP, JWT, Swagger, Jest, and Supertest.

## Features

- Clean module boundaries: controller → service → repository.
- MySQL persistence via TypeORM.
- Redis refresh token storage and access token blacklist.
- SMS one-time-code login/register flow.
- JWT access tokens with opaque rotating refresh tokens.
- `POST /auth/request-code` and `POST /auth/verify-code` phone authentication.
- Rate limiting, validation, sanitized error responses, httpOnly refresh cookie support.
- Swagger docs at `/docs`.

## Setup

```bash
npm install
cp .env.example .env
```

Create the MySQL schema with `src/database/schema.sql`, or set `DB_SYNCHRONIZE=true` for local development only.

```bash
npm run start:dev
```

## Docker

Run the API with MySQL and Redis:

```bash
# optional: customize secrets in .env.docker first
docker compose up --build
```

The API is available at `http://localhost:3000` and Swagger docs at `http://localhost:3000/docs`.
MySQL and Redis are exposed on `localhost:3306` and `localhost:6379`.
If you already created an older database schema, reset local Docker data with `docker compose down -v`.

## Endpoints

- `POST /auth/request-code` sends a verification code to a phone number.
- `POST /auth/verify-code` verifies the code, creates the user if needed, and logs in.
- `POST /auth/refresh` validates and rotates refresh tokens.
- `POST /auth/logout` blacklists the current access token and revokes the refresh token.
- `POST /api-keys` creates an API key for the authenticated user.
- `POST /transcriptions` uploads an audio file for transcription. It accepts either JWT auth or `X-API-Key`.

## API Key Transcription Flow

Create an API key with a logged-in user:

```bash
curl -X POST http://localhost:3000/api-keys \
  -H "Authorization: Bearer <accessToken>" \
  -H "X-Refresh-Token: <refreshToken>" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Transcription client\"}"
```

Use the returned `apiKey` to upload audio:

```bash
curl -X POST http://localhost:3000/transcriptions \
  -H "X-API-Key: <apiKey>" \
  -F "audio=@./voice.mp3"
```

The upload field must be named `audio`. Supported audio types are configured in `src/Transcription/transcription.multer.ts`.

In protected controllers, use `req.user.userId`. The global auth guard fills this value for both JWT and API-key requests. If you need API-key metadata, read `req.apiKey`.

## Protecting Future Routes

Use the `Auth` decorator on controllers or handlers that require an authenticated request:

```ts
import { Auth } from './common/decorators/auth.decorator';
import { UserRole } from './database/entities/user.entity';

@Auth()
// any logged-in user

@Auth(UserRole.ADMIN)
// admin users only
```

## Tests

```bash
npm test
npm run test:e2e
npm run test:cov
```

Use `.env.test.example` for a dedicated test database when running integration tests against real infrastructure.

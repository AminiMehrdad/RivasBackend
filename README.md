# Rivas API Service

Rivas is a NestJS API for phone OTP authentication, wallet credit, API keys, and audio transcription. It uses TypeScript, MySQL, Redis, TypeORM, Swagger/OpenAPI, Jest, and Docker Compose.

## Features

- Phone-number OTP login and registration.
- JWT access tokens with opaque refresh tokens stored in Redis.
- Global authentication guard for JWT, refresh-token rotation, and `X-API-Key`.
- API key generation, hashing, Redis caching, rate limiting, and revocation.
- Wallet balance, wallet top-up records, and transaction history.
- Audio upload and synchronous transcription workflow with wallet debit.
- MySQL persistence through TypeORM repositories.
- Redoc documentation at `/docs` and OpenAPI JSON at `/swagger-json`.

## Project Structure

```text
src/
  auth/            Phone OTP auth, JWT issue/refresh/logout
  apiKey/          API key generation, validation, and docs
  wallet/          Wallet balance and transaction endpoints
  dashbord/        Dashboard summary endpoints
  Transcription/   Audio upload and transcription workflow
  database/        TypeORM entities, repositories, and schema
  redis/           Redis provider module
  common/          Guards, filters, pipes, errors, decorators, utilities
  config/          Environment schema and configuration
```

## Requirements

- Node.js 20 or newer
- npm
- MySQL 8
- Redis 7
- Optional: Docker and Docker Compose
- Optional for accurate transcription duration: `ffprobe`

## Local Setup

```bash
npm install
cp .env.example .env
npm run start:dev
```

Create the database from [src/database/schema.sql](src/database/schema.sql) or set `DB_SYNCHRONIZE=true` for local development only. Keep `DB_SYNCHRONIZE=false` in production.

The API defaults to `http://localhost:3000`.

## Docker

```bash
docker compose up --build
```

Docker Compose starts the API, MySQL, Redis, and RabbitMQ. The API is available at `http://localhost:3000`, Redoc at `http://localhost:3000/docs`, and OpenAPI JSON at `http://localhost:3000/swagger-json`.

If local schema state is stale, reset Docker volumes:

```bash
docker compose down -v
docker compose up --build
```

## Common Commands

```bash
npm run build
npm run lint
npm test
npm run test:e2e
npm run test:cov
```

## Documentation

- [API Reference](docs/API.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Development Guide](docs/DEVELOPMENT.md)
- [API Key Module](src/apiKey/README.md)
- [Transcription Module](src/Transcription/README.md)

## Authentication Quick Start

Request an OTP:

```bash
curl -X POST http://localhost:3000/auth/request-code \
  -H "Content-Type: application/json" \
  -d "{\"phoneNumber\":\"+989121234567\"}"
```

Verify the OTP:

```bash
curl -X POST http://localhost:3000/auth/verify-code \
  -H "Content-Type: application/json" \
  -d "{\"phoneNumber\":\"+989121234567\",\"code\":\"123456\"}"
```

Use the returned access token on protected endpoints:

```bash
curl http://localhost:3000/wallet/total-credit \
  -H "Authorization: Bearer <accessToken>" \
  -H "X-Refresh-Token: <refreshToken>"
```

## Transcription Quick Start

Create an API key:

```bash
curl -X POST http://localhost:3000/api-keys \
  -H "Authorization: Bearer <accessToken>" \
  -H "X-Refresh-Token: <refreshToken>" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Transcription client\"}"
```

Upload audio with that key:

```bash
curl -X POST http://localhost:3000/transcriptions \
  -H "X-API-Key: <apiKey>" \
  -F "audio=@./voice.mp3"
```

The multipart field name must be `audio`.

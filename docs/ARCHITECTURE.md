# Architecture

The service follows standard NestJS module boundaries:

```text
controller -> service -> repository -> database
```

Controllers validate and map HTTP requests. Services own business rules. Repositories isolate TypeORM calls behind interfaces and injection tokens.

## Runtime Components

- NestJS API: HTTP routes, guards, validation, Swagger/OpenAPI.
- MySQL: durable data for users, requests, API keys, wallets, transactions, and transcriptions.
- Redis: OTP sessions, refresh-token sessions, access-token blacklist, API-key cache, and API-key rate limits.
- File storage: uploaded audio files and generated transcript text files under `uploads/`.

## Authentication Flow

1. Public auth routes are marked with `@Public()`.
2. All other routes pass through the global `AuthGuard`.
3. If `X-API-Key` is present, the guard validates the key and sets `req.user`.
4. Otherwise, the guard validates the access token.
5. If the access token is expired but the refresh token is valid, new tokens are written to response headers.

Use `getAuthenticatedUserId(request)` from `src/common/utils/request-user.util.ts` when a controller needs the current user ID.

## Persistence

`DatabaseModule` registers TypeORM with entities from `src/database/entities`. Repository implementations live in `src/database/Repos` and are injected by tokens from `src/common/constants/injection-tokens.ts`.

`DB_SYNCHRONIZE` controls TypeORM schema synchronization. Use `false` outside local development.

## Transcription Workflow

1. Validate and store an uploaded audio file.
2. Estimate duration with `ffprobe`; fall back to a size estimate if unavailable.
3. Calculate wallet cost.
4. Create a request row and transcription row.
5. Run `SpeechToTextService`.
6. Save transcript text under `uploads/text`.
7. Debit wallet and create a wallet transaction.
8. Mark request and transcription status as succeeded or failed.

The current implementation is synchronous. For large files or production load, move speech-to-text processing and wallet mutation into a queued worker and database transaction.

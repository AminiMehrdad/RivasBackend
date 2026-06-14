# Development Guide

## Environment

Start from `.env.example`:

```bash
cp .env.example .env
```

Important variables:

| Variable                    | Purpose                                       |
| --------------------------- | --------------------------------------------- |
| `PORT`                      | HTTP server port                              |
| `DB_*`                      | MySQL connection                              |
| `DB_SYNCHRONIZE`            | TypeORM schema sync; local only               |
| `REDIS_*`                   | Redis connection                              |
| `JWT_ACCESS_SECRET`         | Access-token signing secret, minimum 32 chars |
| `ACCESS_TOKEN_TTL_SECONDS`  | Access-token lifetime                         |
| `REFRESH_TOKEN_TTL_SECONDS` | Refresh-token lifetime                        |
| `COOKIE_*`                  | Refresh-token cookie settings                 |
| `SMS_*`                     | SMS provider settings                         |

## Code Style

Run formatting and linting before committing:

```bash
npm run format
npm run lint
```

The codebase currently contains some legacy formatting and test lint issues. Keep new changes formatted and scoped.

## Tests

```bash
npm test
npm run test:e2e
```

Use `.env.test.example` when running integration tests against a dedicated test database.

## Adding Protected Routes

Protected routes do not need a per-route guard because `AuthGuard` is registered globally. Use `@Public()` only for routes that must bypass authentication.

For authenticated user access:

```ts
import { Req } from '@nestjs/common';
import { AuthenticatedRequest } from 'src/common/guards/auth.guard';
import { getAuthenticatedUserId } from 'src/common/utils/request-user.util';

function handler(@Req() request: AuthenticatedRequest) {
  const userId = getAuthenticatedUserId(request);
  return userId;
}
```

## File Uploads

Transcription upload settings live in `src/Transcription/transcription.multer.ts`. Keep accepted extensions, MIME handling, upload limits, and documentation in sync.

## Production Notes

- Keep `DB_SYNCHRONIZE=false`.
- Use strong JWT secrets and rotate compromised refresh tokens by clearing Redis sessions.
- Put upload storage on durable disk or object storage.
- Run `ffprobe` in the runtime image if accurate audio duration is required.
- Move multi-step wallet mutations into a database transaction before high-volume use.

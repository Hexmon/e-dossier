# API Testing Guide

This project uses **Vitest** for API route testing. Tests are written directly against Next.js route handlers (functions in `src/app/api/v1/**/route.ts`) without starting a HTTP server.

---

## 1. Dependencies

To enable the test suite, install the following dev dependencies (do this once):

```bash
npm install --save-dev vitest @vitest/coverage-v8
```

> **Note**: I have not run this command for you, in line with the project guidelines. Please execute it locally or in CI.

---

## 2. Test Layout

- All tests live under `tests/`.
- API tests are grouped by feature under `tests/api/**`. Examples:
  - `tests/api/health.test.ts`
  - `tests/api/auth.logout.test.ts`
- Shared helpers live under `tests/utils/**`.

Key files introduced:

- `vitest.config.ts`  Vitest configuration (Node environment, path aliases, coverage).
- `tests/setup/env.ts`  global test setup (loads `.env`, sets `NODE_ENV=test`).
- `tests/utils/next.ts`  helper for constructing minimal `NextRequest`-like objects.

---

## 3. Running Tests

Once dependencies are installed, the following npm scripts are available:

```bash
npm test            # Run the whole test suite once
npm run test:watch  # Run tests in watch mode (TDD)
npm run test:coverage  # Run tests with coverage reporting
```

Vitest configuration (in `vitest.config.ts`) enables coverage reports in `./coverage` with `text`, `html`, and `json-summary` outputs.

---

## 4. Writing API Tests

### 4.1. Basic pattern

Each route handler is an exported async function (`GET`, `POST`, `PATCH`, etc.). In tests, you:

1. Import the handler.
2. Create a mock request using `makeJsonRequest`.
3. Call the handler directly.
4. Assert on `res.status` and `await res.json()`.

Example:

```ts
import { describe, it, expect } from 'vitest';
import { GET as getHealth } from '@/app/api/v1/health/route';
import { makeJsonRequest } from '../utils/next';

describe('GET /api/v1/health', () => {
  it('returns ok', async () => {
    const req = makeJsonRequest({ path: '/api/v1/health' });
    const res = await getHealth(req as any);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
  });
});
```

### 4.2. Authenticated endpoints

For endpoints that require authentication (`requireAuth` / `requireAdmin`):

- In **integration-style** tests, provide a real `Authorization: Bearer <token>` header and configure JWT secrets for test.
- In **unit-style** tests, you can mock the JWT verifier:

```ts
import { vi } from 'vitest';

vi.mock('@/app/lib/jwt', () => ({
  verifyAccessJWT: vi.fn(async () => ({
    sub: 'test-user-id',
    roles: ['ADMIN'],
    apt: { position: 'ADMIN' },
  })),
}));
```

This lets you test authorization logic and downstream behaviour without needing a real token.

### 4.3. Validation and negative tests

Many endpoints validate input using Zod schemas (e.g. `signupSchema`, `personalUpsertSchema`). For each endpoint, you should:

- Add **happy-path tests** with a valid payload.
- Add **negative tests** where required fields are missing or invalid, asserting:
  - HTTP 400 status
  - `ok: false`
  - Presence of `issues` / validation details in the response.

---

## 5. Test Database Strategy (Optional)

For full integration tests against the database:

1. Provision a separate test database (e.g. `DATABASE_URL_TEST`).
2. Point your test process at it via environment variables.
3. Run migrations before tests:

```bash
npm run db:migrate
```

4. Seed minimal data for common scenarios (admin user, basic courses, platoons, etc.).

For large suites, consider:

- Database transactions per test with rollback.
- Truncating tables between test files.

---

## 6. CI/CD Integration (Example)

### 6.1. GitHub Actions

Below is a minimal workflow you can adapt:

```yaml
name: API Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm test
      - run: npm run test:coverage
```

You can upload the `coverage/` directory as an artifact or feed `coverage/coverage-summary.json` into other tools.

---

## 7. Rate Limiting Configuration (Configurable)

### 7.1. Overview

Rate limiting is now **fully configurable via environment variables**. By default, it is **disabled in development** but **enabled in production**.

#### Environment Variables

All rate limit settings are controlled via `.env` files:

```dotenv
# Master switch for rate limiting
RATE_LIMIT_ENABLED=true|false

# API rate limiting (general endpoints)
RATE_LIMIT_API_MAX_REQUESTS=100           # max requests per window
RATE_LIMIT_API_WINDOW_SECONDS=60          # time window in seconds

# Login rate limiting
RATE_LIMIT_LOGIN_MAX_REQUESTS=5
RATE_LIMIT_LOGIN_WINDOW_SECONDS=900       # 15 minutes

# Signup rate limiting
RATE_LIMIT_SIGNUP_MAX_REQUESTS=3
RATE_LIMIT_SIGNUP_WINDOW_SECONDS=3600     # 1 hour

# Password reset rate limiting
RATE_LIMIT_PASSWORD_RESET_MAX_REQUESTS=3
RATE_LIMIT_PASSWORD_RESET_WINDOW_SECONDS=3600

# Optional: Redis key prefix
RATE_LIMIT_REDIS_KEY_PREFIX=ratelimit

# Optional: Exclude health check from rate limiting
RATE_LIMIT_EXCLUDE_HEALTH_CHECK=true
```

### 7.2. Environment-Specific Defaults

| Environment | RATE_LIMIT_ENABLED | Notes |
|------------|-------------------|-------|
| Development | `false` | Disabled for easier testing |
| QA | `true` | Enabled for behavior testing |
| Production | `true` | **MUST be enabled for security** |

See `.env.development.example`, `.env.qa.example`, and `.env.production.example` for complete examples.

### 7.3. How It Works

1. **When disabled** (`RATE_LIMIT_ENABLED=false`):
   - All requests are allowed regardless of frequency.
   - Rate limit checks return success with configured limits but don't enforce.
   - No Redis calls are made.

2. **When enabled** (`RATE_LIMIT_ENABLED=true`):
   - Requests are tracked by client IP (via `X-Forwarded-For`, `X-Real-IP`, or fallback).
   - Once `MAX_REQUESTS` is exceeded within `WINDOW_SECONDS`, subsequent requests are rejected with HTTP 429.
   - Response includes rate limit headers:
     - `X-RateLimit-Limit`: Max allowed requests
     - `X-RateLimit-Remaining`: Requests remaining
     - `X-RateLimit-Reset`: Unix timestamp when window resets
     - `Retry-After`: Seconds until retry is safe

3. **Storage**:
   - **With Redis**: Uses Upstash Redis (configured via `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`).
   - **Without Redis**: Falls back to in-memory store (development only, not persistent).

### 7.4. Testing Rate Limiting

#### 7.4.1. Unit Tests

Tests are located in `tests/lib/ratelimit.config.test.ts` and verify:

```bash
npm test -- tests/lib/ratelimit.config.test.ts
```

Key scenarios:
- Rate limiting disabled globally → all requests allowed.
- Rate limiting enabled → enforces configured limits.
- In-memory fallback works without Redis.
- Client IP extraction from headers.

#### 7.4.2. Manual Testing

To **manually test rate limiting** locally:

1. Enable it:
   ```dotenv
   # .env or .env.development.example
   RATE_LIMIT_ENABLED=true
   ```

2. Set tight limits for quick testing:
   ```dotenv
   RATE_LIMIT_API_MAX_REQUESTS=3
   RATE_LIMIT_API_WINDOW_SECONDS=10
   ```

3. Make repeated requests to any API endpoint (except health check):
   ```bash
   # First 3 requests will succeed
   curl http://localhost:3000/api/v1/admin/appointments
   
   # 4th request should return 429
   curl http://localhost:3000/api/v1/admin/appointments
   # Response: {"status": 429, "ok": false, "error": "too_many_requests", "message": "..."}
   ```

4. Check response headers:
   ```bash
   curl -i http://localhost:3000/api/v1/admin/appointments
   # X-RateLimit-Limit: 3
   # X-RateLimit-Remaining: 0
   # Retry-After: 8
   ```

#### 7.4.3. Excluding Endpoints

The health check endpoint (`/api/v1/health`) is **excluded by default** when `RATE_LIMIT_EXCLUDE_HEALTH_CHECK=true`, allowing monitoring systems to poll without being rate limited.

### 7.5. Deployment & Production

For production deployments:

1. **Always set `RATE_LIMIT_ENABLED=true`** in your production `.env`.
2. **Provision an Upstash Redis instance**:
   - Set `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`.
   - Without Redis, the in-memory store will not survive pod restarts (not suitable for production).
3. **Adjust limits based on expected traffic**:
   - API limit: `100/60s` is a baseline; adjust upward for high-traffic APIs.
   - Login limit: `5/15m` prevents brute-force attacks.
4. **Monitor**:
   - Watch for excess 429 responses in logs.
   - Set alerts if legitimate traffic is being rate limited.

### 7.6. Troubleshooting

| Issue | Solution |
|-------|----------|
| All requests get 429 | Check `RATE_LIMIT_ENABLED` and verify limits are not too strict. |
| Rate limiting not working despite `ENABLED=true` | Verify Redis credentials if using Redis, or fall back to in-memory. |
| Health check is rate limited | Set `RATE_LIMIT_EXCLUDE_HEALTH_CHECK=true`. |
| Different rate limits per endpoint? | Not yet supported; all API endpoints share one limit. Future enhancement: per-endpoint configs. |

---

## 8. Adding New Tests

When new APIs are added under `src/app/api/v1/**`:

1. Create a matching test file under `tests/api/` (e.g. `tests/api/oc.personal.test.ts`).
2. Import the relevant handler(s) and exercise:
   - Success responses (200/201/204)
   - Auth/permission failures (401/403)
   - Validation failures (400)
   - Not found (404) / conflict (409) where applicable.

This keeps the suite scalable as the API surface grows.


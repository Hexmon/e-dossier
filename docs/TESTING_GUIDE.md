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

## 7. Adding New Tests

When new APIs are added under `src/app/api/v1/**`:

1. Create a matching test file under `tests/api/` (e.g. `tests/api/oc.personal.test.ts`).
2. Import the relevant handler(s) and exercise:
   - Success responses (200/201/204)
   - Auth/permission failures (401/403)
   - Validation failures (400)
   - Not found (404) / conflict (409) where applicable.

This keeps the suite scalable as the API surface grows.


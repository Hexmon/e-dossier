# Repo Instructions

- Any new or changed API route under `src/app/api/**/route.ts` must ship with matching coverage in `tests/api/**` and an updated entry in `tests/api/coverage.manifest.ts` in the same change.
- Run `pnpm run validate:api-tests` after adding, removing, or renaming API routes or API tests.
- Run `pnpm test` before pushing API route changes.
- Do not add uncovered API route handlers and defer tests to a later change.

# New Developer Onboarding (Repo-Specific)

This guide is for a developer who knows JS/TS and web basics, but is new to this repository.

Related references:
- `../explanation/project-overview.md`
- `../explanation/key-flows.md`
- `../explanation/auth-and-security.md`
- `../explanation/db-model-guide.md`

## 1. What this project is (high-level purpose)
`e-dossier-v2` is a Next.js 15 full-stack app for MCEME Cadets Training Wing workflows.
It has:
- Public website pages (landing and public platoon pages).
- Auth pages (`/login`, `/signup`).
- Protected dashboard pages under `/dashboard/**` for admin and staff operations.
- Versioned backend APIs under `/api/v1/**`.
- PostgreSQL persistence with Drizzle ORM.

Good starting files:
- Landing page composition: `src/app/page.tsx`
- Dashboard shell: `src/app/dashboard/page.tsx`
- API routes root pattern: `src/app/api/v1/**/route.ts`

## 2. Tech stack and why each matters here
- Next.js App Router:
  Used for both UI and server routes in one repo. Core entrypoints are `src/app/layout.tsx` and `src/app/dashboard/layout.tsx`.
- PostgreSQL + Drizzle ORM:
  Data model is in `src/app/db/schema/**`, DB calls in `src/app/db/queries/**`, config in `src/app/db/drizzle.config.ts`.
- React Query:
  Primary client data-fetch/caching layer. Provider is `src/components/providers/QueryProvider.tsx`; hooks live in `src/hooks/**`.
- Redux Toolkit + Persist:
  Used mainly for dossier-style multi-step form state. Store setup is `src/store/index.ts`.
- Tailwind + shadcn/radix UI:
  Reusable primitives are in `src/components/ui/**`; feature components compose these.

## 3. How to run locally
1. Install dependencies:
```bash
pnpm install
```
2. Start dev server:
```bash
pnpm dev
```
3. Run lint:
```bash
pnpm run lint
```
4. Run typecheck:
```bash
pnpm run typecheck
```
5. Run production build:
```bash
pnpm run build
```

Important note:
This repo includes `.next/types/**/*.ts` in `tsconfig.json`. On a fresh clone, `pnpm run typecheck` can fail before Next types are generated. If that happens, run `pnpm run build` once, then rerun `pnpm run typecheck`.

## 4. Folder-by-folder map
- `src/app`
  App Router pages/layouts and API routes.
- `src/app/api/v1`
  Versioned backend route handlers (`route.ts` files).
- `src/app/db`
  Drizzle config/client, schemas, query modules, seeds.
- `src/app/lib`
  Server-side libs and shared app utilities (auth, validators, API wrappers).
- `src/components`
  Reusable UI and feature components.
- `src/hooks`
  Feature and shared hooks for data fetching/state orchestration.
- `src/store`
  Redux slices and persisted store configuration.
- `src/types`
  Shared domain/front-end type definitions.
- `src/lib`
  Cross-cutting utilities (logout flow, sidebar visibility, CSRF/rate-limit helpers, audit wrappers).
- `tests`
  API, unit, and library-level tests.
- `scripts`
  Repo tooling (validation scripts, DB docs export, action-map checks).

## 5. Day-1 reading order with time estimates
1. Step 1 (20-30 min): scripts and runtime model
   Read `package.json`, `README.md`, and `scripts/validate-action-map.ts`.
2. Step 2 (20-40 min): app routing and layout structure
   Read `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/dashboard/layout.tsx`.
3. Step 3 (30-45 min): auth/middleware and protected pages
   Read `src/middleware.ts`, `src/app/lib/authz.ts`, `src/app/lib/guard.ts`, `src/components/auth/DashboardSessionGuard.tsx`.
4. Step 4 (25-40 min): trace one simple protected read flow
   Trace sidebar data: `src/components/AppSidebar.tsx` -> `src/hooks/useMe.ts`/`src/hooks/useNavigation.ts` -> `/api/v1/me` and `/api/v1/me/navigation`.
5. Step 5 (35-50 min): trace one CRUD form flow
   Trace platoons: `src/app/dashboard/genmgmt/platoon-management/page.tsx` -> `src/hooks/usePlatoons.ts` -> `src/app/lib/api/platoonApi.ts` -> `src/app/api/v1/platoons/**`.
6. Step 6 (30-50 min): DB schema/query/migrations
   Read `src/app/db/schema/auth/platoons.ts`, `src/app/db/queries/platoon-commanders.ts`, and `drizzle/**`.
7. Step 7 (20-35 min): state and caching
   Read `src/components/providers/QueryProvider.tsx`, `src/store/index.ts`, and one Redux slice.
8. Step 8 (20-30 min): conventions and verification
   Read `src/app/lib/http.ts`, `src/app/lib/validators.ts`, `src/app/lib/acx/action-map.ts`, then run lint/typecheck/build.

## 6. Request/feature flow explained step-by-step
Typical lifecycle in this repo:
1. UI event occurs in component/page (`src/components/**` or `src/app/**/page.tsx`).
2. Hook or API module call is made (`src/hooks/**` -> `src/app/lib/api/**` or `src/app/lib/apiClient.ts`).
3. Request reaches route handler (`src/app/api/v1/**/route.ts`).
4. Input is validated with Zod (`src/app/lib/validators*.ts` or route-local schema).
5. Auth/authz checks run (`requireAuth`, `requireAdmin`, optional `withAuthz`).
6. DB query module executes (`src/app/db/queries/**`) against schema (`src/app/db/schema/**`).
7. Response is returned with standard envelope via `json.ok/json.created/...` in `src/app/lib/http.ts`.
8. UI handles success/error/loading with state and toasts.

## 7. Auth and protected route flow (`/dashboard`)
- Middleware gate:
  `src/middleware.ts` redirects unauthenticated `/dashboard` requests to `/login` and protects non-public API routes.
- Server dashboard guard:
  `src/app/dashboard/layout.tsx` calls `requireDashboardAccess()` from `src/app/lib/server-page-auth.ts`.
- Client session guard:
  `src/components/auth/DashboardSessionGuard.tsx` periodically checks `/api/v1/me`; if 401, it triggers logout redirect flow.
- 401 handling:
  `src/app/lib/apiClient.ts` detects unauthorized responses and delegates redirect/logout to `src/lib/auth/logout.ts`.

## 8. How data moves from UI to DB and back
Pattern A (React Query, most common in admin pages):
1. Component uses hook (`src/hooks/useAdminSiteSettings.ts`, `src/hooks/useUsers.ts`).
2. Hook uses React Query query/mutation and calls typed API module (`src/app/lib/api/siteSettingsAdminApi.ts`, `src/app/lib/api/userApi.ts`).
3. API client sends request through `src/app/lib/apiClient.ts`.
4. Route validates/authenticates and calls DB queries.
5. Response updates query cache and UI rerenders.

Pattern B (imperative fetch in client component):
1. Component `useEffect` calls `api.get(...)` directly.
2. Loading/error local state is managed in component.
Example: `src/components/Dashboard/Platoons.tsx`.

## 9. How to trace an existing feature in this repo
Trace recipe A (Platoon management):
1. Start UI page: `src/app/dashboard/genmgmt/platoon-management/page.tsx`.
2. Move to hook: `src/hooks/usePlatoons.ts`.
3. Move to API module: `src/app/lib/api/platoonApi.ts`.
4. Move to handlers: `src/app/api/v1/platoons/route.ts` and `src/app/api/v1/platoons/[idOrKey]/route.ts`.
5. Move to DB schema/query: `src/app/db/schema/auth/platoons.ts` and `src/app/db/queries/platoon-commanders.ts`.

Trace recipe B (Site settings):
1. UI page: `src/app/dashboard/genmgmt/settings/site/page.tsx`.
2. Hook: `src/hooks/useAdminSiteSettings.ts`.
3. API module: `src/app/lib/api/siteSettingsAdminApi.ts`.
4. Routes: `src/app/api/v1/admin/site-settings/**/route.ts`.
5. Queries/schema: `src/app/db/queries/site-settings.ts`, `src/app/db/schema/auth/siteSettings.ts`.

## 10. How to add a new API safely
Checklist:
- Add route under `src/app/api/v1/.../route.ts` (or nested dynamic route).
- Add/update request/param validation in `src/app/lib/validators*.ts`.
- Add auth/authz:
  - `requireAuth` for authenticated access.
  - `requireAdmin` for admin-only.
  - `withAuthz` where action-map policy enforcement is needed.
- Return envelopes through `src/app/lib/http.ts` helpers.
- Wrap with audit route tooling (`withAuditRoute`) and include meaningful metadata.
- Add action-map entry in `src/app/lib/acx/action-map.ts` so `pnpm run validate:action-map` passes.
- Add tests in `tests/api/**` (happy path + auth + validation + failure cases).

## 11. How to add a new UI feature safely
Checklist:
- Reuse primitives in `src/components/ui/**` before creating new UI atoms.
- Search existing feature hooks in `src/hooks/**` to avoid duplicate fetch/mutation logic.
- Put API calls in `src/app/lib/api/**` instead of embedding fetch logic everywhere.
- Handle loading, empty, and error states explicitly.
- Use existing toast/error patterns (`sonner`, helper functions where available).
- Keep data contracts typed and aligned with route payloads.

## 12. Common reusable patterns in this repo
- Admin settings query/mutation orchestration:
  `src/hooks/useAdminSiteSettings.ts`.
- Policy-based authorization wrapper:
  `src/app/lib/acx/withAuthz.ts` + action definitions in `src/app/lib/acx/action-map.ts`.
- Public server-side data helper pattern:
  `src/app/lib/public-site-settings.ts` and `src/app/lib/public-platoons.ts`.
- Standard JSON error/success envelopes:
  `src/app/lib/http.ts`.

## 13. Common mistakes to avoid
- Forgetting `action-map` updates for new API/page actions.
- Adding route logic without audit wrapping (`withAuditRoute`).
- Endpoint constant mismatch with actual route path (`src/constants/endpoints.ts` vs `src/app/api/v1/**`).
- Missing CSRF expectations for mutating requests (middleware enforces this for protected API paths).
- Assuming admin protection is automatic everywhere. Confirm guard usage (`requireAdmin` or policy gate) in each route.

## 14. Final checklist before committing changes
1. Verify impacted flow end-to-end in browser (happy path + error path).
2. Verify API auth/validation behavior for changed routes.
3. Run checks:
```bash
pnpm run lint
pnpm run typecheck
pnpm run build
```
4. If typecheck fails on fresh branch due `.next/types`, run:
```bash
pnpm run build
pnpm run typecheck
```
5. Ensure docs/tests/action-map updates are included where required.

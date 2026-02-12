# Project Overview

## System Snapshot
`e-dossier-v2` is a Next.js 15 App Router application that serves:
- Public pages (`/`, `/login`, `/signup`)
- A large authenticated dashboard UI (`/dashboard/...`)
- Versioned APIs under `/api/v1/...`
- PostgreSQL persistence via Drizzle ORM
- MinIO-backed object storage for OC images
- Dual audit pipelines (Hexmon v2 `audit_events` + legacy `audit_logs`)

## Architecture Diagram (Text)
```text
Browser / Server Components
    |
    |  (fetch, cookies, React Query, Redux state)
    v
Next.js App Router (src/app)
    |
    +-- Middleware (src/middleware.ts)
    |      - request id
    |      - rate limit
    |      - CSRF gate
    |      - public/protected path gate
    |
    +-- API route handlers (src/app/api/v1/**/route.ts)
    |      - auth/role/scope checks
    |      - zod validation
    |      - domain queries/services
    |      - audit events
    |
    +-- Shared app libs (src/app/lib/**)
    |      - jwt/cookies/authz/http/apiClient/validators/storage
    |
    +-- Domain queries/services
    |      - src/app/db/queries/**
    |      - src/app/services/**
    |
    v
Data layer
    +-- PostgreSQL (Drizzle schema + queries)
    +-- MinIO / S3 API (presign + object verification)
    +-- Upstash Redis (optional; in-memory fallback for rate limiting)

Observability
    +-- Hexmon audit v2 -> audit_events
    +-- Legacy audit helper -> audit_logs
    +-- request/access logs via route wrappers
```

## Runtime Assumptions
- Node: `>=20` (`package.json`)
- pnpm: `>=9` (`package.json`, `packageManager: pnpm@9`)
- Next.js: `15.4.8`
- React: `19.1.0`
- TypeScript + Tailwind v4
- DB: PostgreSQL (`DATABASE_URL`)
- ORM/migrations: `drizzle-orm` + `drizzle-kit`
- Object storage: MinIO / S3-compatible (`src/app/lib/storage.ts`)
- Rate limiting: Upstash Redis if configured, otherwise in-memory (`src/lib/ratelimit.ts`)

## Core Modules
- Auth (token issuance/verification):
  - `src/app/api/v1/auth/login/route.ts`
  - `src/app/lib/jwt.ts`
  - `src/app/lib/cookies.ts`
  - `src/app/lib/authz.ts`
- Route guards and authorization helpers:
  - `src/middleware.ts`
  - `src/app/lib/guard.ts`
  - `src/lib/authorization.ts`
- RBAC data model and seed:
  - `src/app/db/schema/auth/rbac.ts`
  - `src/app/db/seeds/seedRolesAndPermissions.ts`
- Audit:
  - Hexmon v2 wrapper: `src/lib/audit.ts`
  - Legacy audit utilities: `src/lib/audit-log.ts`, `src/lib/withRouteLogging.ts`

## Common Request Flow
1. `src/middleware.ts` runs for `/api/v1/*`.
2. Request gets `x-request-id`; rate limit and CSRF checks are applied.
3. Public-path matcher decides bypass vs token-required path.
4. Route handler executes (`src/app/api/v1/**/route.ts`).
5. Route validates input via Zod (`src/app/lib/validators*.ts` or route-local schemas).
6. Route performs authz checks (`requireAuth`, `authorizeOcAccess`, etc.).
7. Route calls query/service layer (`src/app/db/queries/**`, `src/app/services/**`).
8. Route emits audit event (`req.audit.log(...)` and in a few paths `createAuditLog(...)`).
9. Standard JSON envelope is returned via `json.ok/json.created/...` from `src/app/lib/http.ts`.

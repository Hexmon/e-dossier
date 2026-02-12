# Integration Playbook

## Reusable Template

### 1) Requirements + Scope
- Define:
  - feature goal
  - impacted routes/pages
  - data model changes
  - authz/audit requirements
  - rollout constraints (backward compatibility, migration windows)
- Output artifact:
  - short RFC in PR description with success metrics and rollback plan.

### 2) Find Integration Points

#### Core seams in this codebase
- Request gate: `src/middleware.ts`
- Principal extraction: `src/app/lib/authz.ts`, `src/app/lib/guard.ts`
- Scope authorization: `src/lib/authorization.ts`
- Route wrapping: `src/lib/audit.ts` (`withAuditRoute`)
- Permission tables: `src/app/db/schema/auth/rbac.ts`
- Role/permission seed: `src/app/db/seeds/seedRolesAndPermissions.ts`
- Existing permission helper: `src/app/db/queries/authz.ts` (currently not route-integrated)
- Audit emission: `req.audit.log(...)` and legacy `createAuditLog(...)`

#### Access-control library insertion plan (exact files)
1. Principal extraction:
   - add `src/app/lib/principal.ts`
   - use `requireAuth` + optional DB enrichment (permissions/scope)
2. Route authorization wrapper:
   - add `src/app/lib/withAuthz.ts`
   - compose `withAuditRoute` + policy check before handler body
3. Policy mapping layer:
   - add `src/app/lib/policies.ts`
   - map route action -> required permission/policy
4. Role/permission resolution:
   - extend `src/app/db/queries/authz.ts` to return effective permissions from position + optional role grants
5. Decision audit:
   - add `src/app/lib/authz-audit.ts` (or inline in `withAuthz.ts`) to log allow/deny decisions through `req.audit.log`
6. Route adoption (incremental):
   - start with admin routes in `src/app/api/v1/admin/*`
   - then high-risk OC write routes in `src/app/api/v1/oc/[ocId]/*`

### 3) Add Dependencies + Env
- Install library packages.
- Add required env vars in `.env*.example`.
- Add runtime validation for new env vars in a single config module.
- Update deployment env docs (`README.md` / `docs/*`).

### 4) Implement Server Glue Layer
- Build adapter module(s) under `src/app/lib/*`.
- Keep third-party SDK calls centralized; routes should import internal wrappers only.
- Add strict error mapping to `ApiError`/`handleApiError` shape.

### 5) Implement API Wrappers
- Add or update `src/app/lib/api/<feature>.ts`.
- Keep transport concerns in `apiClient.ts` wrappers (headers, CSRF, envelope handling).

### 6) Implement UI Hooks/Components
- Add `src/hooks/use<Feature>.ts` with query keys + invalidation rules.
- Add UI components in `src/components/<feature>/`.
- Keep mutations in hooks, not components.

### 7) Tests
- Route tests: `tests/api/<feature>.test.ts`
- Library tests: `tests/lib/<feature>.test.ts`
- Include:
  - success path
  - validation failure
  - unauthorized/forbidden
  - conflict/not-found
  - audit decision emitted (when relevant)

### 8) Migration / Rollout Plan
- DB changes:
  - schema updates + migration scripts
  - seed updates where needed
- Rollout:
  - dark launch / disabled-by-default flag (if risky)
  - incremental route adoption
  - rollback steps documented in PR

### 9) Observability + Logging
- Emit domain audit events on both success and denial paths.
- Ensure request id propagation is preserved.
- Add operational logs for integration failure modes only (avoid noisy logs).

### 10) Verification Checklist
Run in order:
1. `pnpm install`
2. `pnpm run validate:action-map`
3. `pnpm lint`
4. `pnpm typecheck`
5. `pnpm test`
6. `pnpm build`
7. `pnpm check`
8. `pnpm db:migrate` or `pnpm db:push` (if schema changed)
9. `pnpm seed:permissions` (or `pnpm import:permissions [parsed-json-path]`) when permission matrix changes
10. `pnpm seed:admins` (when relevant)

Expected outcomes:
- lint/typecheck/build complete with exit code 0.
- tests pass with no failing suite.
- `pnpm check` reports PostgreSQL and MinIO reachable.

Common failures:
- Missing env vars (JWT keys, DB URL, MinIO config, rate-limit vars).
- DB unreachable or bad credentials.
- MinIO endpoint/protocol mismatch.
- CSRF failures for mutating requests when token bootstrap is broken.
- Auth failures from expired/invalid `access_token`.

## Definition Of Done (Enterprise Readiness)
- Functional:
  - behavior meets scope and acceptance criteria.
- Security:
  - explicit authn/authz checks added for all new routes.
  - audit events include actor, action, target, outcome.
- Reliability:
  - failures mapped to consistent API envelopes.
  - rollback plan documented.
- Data:
  - migrations reversible or safely forward-only with mitigation.
  - seed/idempotency concerns handled.
- Quality:
  - tests cover happy + unhappy paths.
  - lint/typecheck/build/test/check all pass.
- Operations:
  - env/docs updated.
  - monitoring/logging implications documented.

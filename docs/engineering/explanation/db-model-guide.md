# DB Model Guide

## Drizzle Layout

### Config and client
- Drizzle config: `src/app/db/drizzle.config.ts`
  - dialect: PostgreSQL
  - schema glob: `src/app/db/schema/**/*.ts`
  - output migrations: `drizzle/`
- DB client: `src/app/db/client.ts` (`drizzle-orm/node-postgres` + `pg` pool)

### Schema modules
- Auth domain: `src/app/db/schema/auth/*`
  - users, credentials, positions, appointments, delegations, RBAC, signup requests, login attempts/lockouts, audit tables
- Training domain: `src/app/db/schema/training/*`
  - OC core tables, academics marks, interviews, PT templates + OC PT marks, courses/subjects/offerings
- Admin domain: `src/app/db/schema/admin/*`
  - appointment transfer audit, punishments

### Query style
- Query modules in `src/app/db/queries/*` are organized by domain.
- Typical pattern:
  - parse/validate in route layer
  - call one query helper per operation
  - return typed row projections
- Domain orchestration is in services where needed (`src/app/services/oc-academics.ts`, `src/app/services/oc-performance-records.ts`).

## Key Auth/RBAC/Audit Tables

### Auth core
- `users` (`src/app/db/schema/auth/users.ts`)
  - account identity and status flags (`isActive`, `deletedAt`, etc.)
- `credentials_local` (`src/app/db/schema/auth/credentials.ts`)
  - password hash + update timestamp
- `positions` (`src/app/db/schema/auth/positions.ts`)
  - authority roles like `ADMIN`, `SUPER_ADMIN`, `PLATOON_COMMANDER`
- `appointments` (`src/app/db/schema/auth/appointments.ts`)
  - principal assignment with scope (`GLOBAL`/`PLATOON`) and time window

### RBAC model
- `roles`, `permissions`, `role_permissions`, `position_permissions` (`src/app/db/schema/auth/rbac.ts`)
- Runtime currently relies mostly on appointment/position claims, while permissions tables are present for future enforcement.

### Signup & lockout
- `signup_requests` (`src/app/db/schema/auth/signupRequests.ts`)
- `login_attempts`, `account_lockouts` (`src/app/db/schema/auth/login_attempts.ts`)

### Audit
- Legacy: `audit_logs` (`src/app/db/schema/auth/audit.ts`)
- Hexmon v2: `audit_events` (`src/app/db/schema/auth/audit-events.ts`)

## Important Relations
- `credentials_local.user_id -> users.id`
- `appointments.user_id -> users.id`
- `appointments.position_id -> positions.id`
- `delegations.grantor_user_id/grantee_user_id -> users.id`
- `position_permissions.position_id -> positions.id`
- `position_permissions.permission_id -> permissions.id`
- `signup_requests.user_id -> users.id`
- `audit_logs.actor_user_id -> users.id`
- OC domain joins back to auth domain for manager/inspector references and scope checks.

## Migrations And Seeds

### Drizzle-managed migrations
- Generated/applied through scripts in `package.json`:
  - `pnpm db:generate`
  - `pnpm db:migrate`
  - `pnpm db:push`
  - `pnpm db:studio`
- Migration files are in `drizzle/*.sql` with ordering tracked in `drizzle/meta/_journal.json`.

### Additional SQL migrations
- Manual SQL files exist in `src/app/db/migrations/*` (e.g., lockout tables, sports field changes).

### Seed scripts
- `pnpm seed:rbac` -> `src/app/db/seeds/seedRolesAndPermissions.ts`
- `pnpm seed:admins` -> `src/app/db/seeds/seedAdminUser.ts`

## Query Design Guidance
- Keep route handlers thin; place DB logic in `src/app/db/queries/*`.
- Put multi-table business workflows in `src/app/services/*` or transaction helpers.
- For auditable mutations, include:
  - actor id
  - resource id/type
  - diff or changed field list

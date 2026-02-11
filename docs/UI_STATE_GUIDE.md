# UI State Guide

## State Architecture

### React Query (server state)
- Provider: `src/components/providers/QueryProvider.tsx`.
- Used for API-backed async data, caching, retries, invalidation.
- Default query policy:
  - no refetch on focus/mount/reconnect
  - `staleTime` 5 min, `gcTime` 10 min, retry 1

### Redux Toolkit + redux-persist (client form state)
- Store: `src/store/index.ts`.
- Many OC form slices persisted to browser storage via `redux-persist`.
- Suitable for long multi-form editing sessions and local draft retention.

### Ownership boundary (current)
- React Query: canonical state for server resources (users, appointments, OCs, etc.).
- Redux: local/editing state for large form workflows.
- Some screens blend both (React Query fetch + Redux form draft updates).

## Data Fetching Patterns

### API client
- Core fetch client: `src/app/lib/apiClient.ts`.
- Handles:
  - base URL resolution
  - JSON/form payloads
  - cookie credentials
  - CSRF header injection for mutating calls
  - normalized API error handling via `ApiClientError`

### API wrappers
- Feature wrappers in `src/app/lib/api/*` (e.g., `appointmentApi.ts`, `ocApi.ts`, `authApi.ts`, `me.ts`).
- Hooks call wrappers, wrappers call `apiClient`.

### Hooks
- Feature hooks in `src/hooks/*` encapsulate query keys, mutation invalidations, and toasts.
- Examples:
  - `src/hooks/useMe.ts`
  - `src/hooks/useAppointments.ts`
  - `src/hooks/useOCs.ts`
  - `src/hooks/useApproval.ts`

## Form Validation and Submission

### Client-side forms
- Many forms use `react-hook-form` (e.g., login/signup pages).
- Additional inline/manual checks are common (password strength, cross-field checks, field presence).

### Server-side validation
- Routes enforce Zod validation regardless of client behavior.
- This is the source of truth for input constraints.

### Submission flow
1. UI form builds payload.
2. API wrapper sends request via `apiClient`.
3. Route validates/authorizes/processes.
4. Hook mutation handles success/error toast + cache invalidation.

## Practical Guidance For New Integrations
- If data is server-owned and shareable across views, use React Query.
- If state is a long-lived local draft, use Redux slice.
- Keep submission DTO validation mirrored server-side with Zod.
- Add a dedicated `src/app/lib/api/<feature>.ts` wrapper and a `src/hooks/use<Feature>.ts` hook.

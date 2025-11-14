# API Documentation – v1

This document summarizes the public backend API exposed by the Next.js app under `/api/v1`. It is written from the perspective of frontend and integration consumers.

> Base URL: `http://localhost:3000`
>
> All JSON responses follow the envelope: `{ status: <number>, ok: boolean, ... }`.
> Errors use `{ status, ok: false, error: string, message: string, ...extras }`.

---

## Authentication & Headers

Most endpoints require a logged‑in user. Authentication is JWT‑based:

- Access token is issued by `POST /api/v1/auth/login`.
- The server sets a `HttpOnly` cookie named `access_token`.
- In dev, the token is also returned in the response body.
- For non‑browser clients you may also send an `Authorization: Bearer <token>` header.

**Common headers**

- `Content-Type: application/json` for all JSON bodies
- `Authorization: Bearer <access_token>` (optional when `access_token` cookie is present)

---

## Health

### GET `/api/v1/health`

**Description**: Basic liveness probe.

- **Auth**: Not required
- **Query params**: none
- **Request body**: none

**cURL**

```bash
curl -X GET "http://localhost:3000/api/v1/health"
```

**Response 200**

```json
{
  "status": 200,
  "ok": true,
  "service": "api",
  "uptime_sec": 123.45,
  "ts": "2025-01-01T12:34:56.789Z"
}
```

---

## Auth

### POST `/api/v1/auth/login`

**Description**: Authenticate a user against a specific appointment and issue an access token.

- **Auth**: Not required
- **Rate limit**: ~5 attempts / 15 minutes per IP
- **Request body (JSON)**

```json
{
  "appointmentId": "<appointment-uuid>",
  "username": "jdoe",
  "password": "Secret123",
  "platoonId": "<optional-platoon-uuid>"
}
```

- `appointmentId` (string, UUID) – the appointment context the user is logging into.
- `username` (string) – login username.
- `password` (string) – password (min 8 chars, must contain letters and digits).
- `platoonId` (string, UUID, optional) – required only for certain positions (e.g. PLATOON_COMMANDER).

**cURL**

```bash
curl -X POST "http://localhost:3000/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "appointmentId": "<appointment-uuid>",
    "username": "jdoe",
    "password": "Secret123"
  }' \
  -c cookies.txt
```

- The `-c cookies.txt` flag persists the `access_token` cookie for subsequent calls.

**Success 200** (shape simplified)

```json
{
  "status": 200,
  "ok": true,
  "token_type": "Bearer",
  "expires_in": 900,
  "user": { "id": "...", "username": "jdoe", "name": "John Doe", "rank": "Lt" },
  "active_appointment": { "id": "...", "positionKey": "PLATOON_COMMANDER" },
  "roles": ["ADMIN"],
  "access_token": "<only in development>"
}
```

**Common error responses**

- 400 – validation failure (missing/invalid fields)
- 401 – invalid credentials or locked account
- 429 – too many attempts


### POST `/api/v1/auth/signup`

**Description**: Public endpoint to request a new user account. Creates an inactive user and a signup request for admin approval.

- **Auth**: Not required
- **Rate limit**: ~3 requests / hour per IP

**Request body (JSON, outline)**

```json
{
  "username": "jdoe",
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+91-9000000000",
  "rank": "Lt",
  "password": "Secret123"
}
```

**cURL**

```bash
curl -X POST "http://localhost:3000/api/v1/auth/signup" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "jdoe",
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+91-9000000000",
    "rank": "Lt",
    "password": "Secret123"
  }'
```

**Success 201**

```json
{
  "status": 201,
  "ok": true,
  "message": "Signup request created",
  "user": {
    "id": "...",
    "username": "jdoe",
    "isActive": false
  }
}
```


### POST `/api/v1/auth/logout`

**Description**: Log out current user and clear auth cookies.

- **Auth**: Required
- **Method**: POST only (OPTIONS supported for CORS)
- **Body**: none

**cURL (cookie‑based)**

```bash
curl -X POST "http://localhost:3000/api/v1/auth/logout" \
  -b cookies.txt -c cookies.txt
```

**Response 204** – empty body, `access_token` cookie cleared.


### POST `/api/v1/auth/change-password`

**Description**: Change or reset a user password.

- **Auth**: Required
- **Modes**:
  - Self‑service: caller changes own password (requires `currentPassword`).
  - Admin reset: admin provides `userId` and `newPassword` (no `currentPassword`).

**Request body (self‑service)**

```json
{
  "currentPassword": "OldSecret123",
  "newPassword": "NewSecret123"
}
```

**Request body (admin reset)**

```json
{
  "userId": "<target-user-uuid>",
  "newPassword": "NewSecret123"
}
```

**cURL (self‑service)**

```bash
curl -X POST "http://localhost:3000/api/v1/auth/change-password" \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "currentPassword": "OldSecret123",
    "newPassword": "NewSecret123"
  }'
```

**On success**: 200 with `{ status: 200, ok: true, message: "Password updated" }` (exact shape may include additional fields).

---

## Me

### GET `/api/v1/me`

**Description**: Return the currently authenticated user's profile plus active appointment.

- **Auth**: Required
- **Query params**: none

**cURL**

```bash
curl -X GET "http://localhost:3000/api/v1/me" \
  -b cookies.txt
```

**Response 200 (simplified)**

```json
{
  "status": 200,
  "ok": true,
  "user": {
    "id": "...",
    "username": "jdoe",
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+91-9000000000",
    "rank": "Lt",
    "currentAppointmentId": "..."
  },
  "roles": ["ADMIN"],
  "appointment": { "id": "...", "positionKey": "PLATOON_COMMANDER" }
}
```

---

## Courses & Subjects (outline)

These endpoints manage courses, subjects, offerings, instructors. Full details, including validation rules, are in the source under `src/app/api/v1/courses*`, `subjects*`, and `instructors*`.

- `GET /api/v1/courses` – list courses (search, pagination, includeDeleted)
- `POST /api/v1/courses` – create course (ADMIN)
- `GET /api/v1/courses/:courseId` – get course, optional `expand=subjects`
- `PATCH /api/v1/courses/:courseId` – update (ADMIN)
- `DELETE /api/v1/courses/:courseId` – soft delete (ADMIN)
- `GET /api/v1/courses/:courseId/offerings` – list offerings by semester
- `POST /api/v1/courses/:courseId/offerings` – create offering (ADMIN)
- `GET /api/v1/subjects` / `POST /api/v1/subjects` – list/create subjects
- `GET /api/v1/subjects/:id` / `PATCH` / `DELETE` – subject CRUD
- `GET /api/v1/instructors` / `POST /api/v1/instructors` – list/create instructors
- `GET /api/v1/instructors/:id` / `PATCH` / `DELETE` – instructor CRUD

Each of these endpoints:

- **Auth**: `GET` requires `requireAuth`, mutations require `requireAdmin`.
- **Query parameters** (lists):
  - `q` (string, optional) – search term
  - `limit` (number, optional) – max rows (default 50–100, capped)
  - `offset` (number, optional) – pagination offset
  - `includeDeleted` ("true"|"false") – whether to include soft‑deleted records
- **Common responses**: `{ items: [...], count: number }` for lists, `{ course|subject|instructor: {...} }` for single resources.

---

## Platoons (outline)

- `GET /api/v1/platoons` – list platoons (search, includeDeleted)
- `POST /api/v1/platoons` – create platoon (ADMIN)
- `PATCH /api/v1/platoons/:idOrKey` – update (ADMIN). `idOrKey` may be the UUID, platoon key, or case‑insensitive name.
- `DELETE /api/v1/platoons/:idOrKey` – soft or hard delete (ADMIN) with `?hard=true`.

List responses return `{ items, count }`. Soft‑deleted rows have `deletedAt` set.

---

## OCs (Officer Cadets) – High‑level

OC data is spread across many nested resources. The main collection endpoint supports rich filtering and selective expansion.

### GET `/api/v1/oc`

**Description**: List OCs with optional inclusion of related sections.

**Query parameters (selected)**

- `q` – search by name/OC number.
- `courseId` – filter by course UUID.
- `active` – filter active cadets.
- `limit`, `offset` – pagination (limit up to ~1000).
- `include` – one or more of:
  - `personal`, `preCommission`, `commissioning`, `autobiography`,
  - `familyMembers`, `education`, `achievements`, `ssbReports`,
  - `medicals`, `medicalCategory`, `discipline`, `parentComms`, `delegations`.
- `full` – if `true`, load all sections (overridden by explicit `include` list).

**cURL example (with personal + education)**

```bash
curl -X GET "http://localhost:3000/api/v1/oc?limit=50&include=personal&include=education" \
  -b cookies.txt
```

**Response 200 (simplified)**

```json
{
  "status": 200,
  "ok": true,
  "items": [
    {
      "id": "...",
      "uid": "UID-XXXXXX",
      "name": "Cadet A",
      "ocNo": "TES-123",
      "courseId": "...",
      "personal": { "email": "cadet@example.com", "pan": "..." },
      "education": [ { "degree": "B.Tech", "year": 2023 } ]
    }
  ],
  "count": 1
}
```

### Nested OC resources (outline)

For each OC, nested resources follow the pattern `/api/v1/oc/:ocId/<section>`:

- `/personal` – single upserted personal particulars
- `/family` – list of family members
- `/education` – list of educational records
- `/achievements` – list of achievements
- `/autobiography` – single record
- `/ssb` – single SSB report (positives/negatives arrays)
- `/medical` – list of medical records
- `/medical-category` – list
- `/discipline` – list
- `/parent-comms` – list

All nested routes:

- Require authentication; IDOR is prevented via internal `authorizeOcAccess` checks.
- Use Zod validators defined in `src/app/lib/oc-validators.ts` for request bodies.
- Return either `{ items, count }` (for lists) or `{ <resource>: {...} }` structures.

---

## Admin – Overview

Admin endpoints are under `/api/v1/admin/*` and generally require an admin role (checked via `requireAdmin`). Key groups:

- `/signup-requests` – list, approve, reject, and delete signup requests
- `/appointments` – view and manage appointments
- `/positions` – manage positions and compute slots/holders
- `/users` – manage users

Because there are many admin operations, see source for the full set of fields. In short:

- All list endpoints support pagination and filtering via query params.
- Mutating endpoints accept JSON bodies validated by the schemas in `src/app/lib/validators.ts`.
- Soft delete is modelled via a `deletedAt` timestamp in most tables, with `includeDeleted` flags on list endpoints.

---

## Error Format & Conventions

All endpoints share the following conventions:

- **Success**: `200`/`201`/`204` with `ok: true`.
- **Validation errors**: `400` with `ok: false` and `error: 'bad_request'` plus Zod issue details under `issues`.
- **Auth**: `401` for unauthenticated, `403` for forbidden.
- **Not found**: `404` with `error: 'not_found'`.
- **Conflict**: `409` with `error: 'conflict'` or more specific codes.
- **Server errors**: `500` with a generic message.

When integrating from the frontend, always:

1. Check `ok` before using the payload.
2. Use `status` to branch on HTTP status semantics.
3. For forms, surface `issues` (validation) and any `fields/messages` arrays provided by conflict handlers.


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

## OC Training & Performance

These endpoints manage OC training, sports, weapon training, obstacles and speed march records under `/api/v1/oc/:ocId/*`.

General rules:

- **Auth**: all endpoints require a valid JWT (HttpOnly `access_token` cookie or `Authorization: Bearer` header).
- **Authorization**:
  - `GET` and `POST` use `mustBeAuthed` (any authenticated user with access to the OC).
  - `PATCH`/`DELETE` use `mustBeAdmin` and are restricted to admins.
- **Common errors**: `400` (validation), `401` (unauthenticated), `403` (forbidden), `404` (OC or record not found).

### Motivation Awards

Each record represents a motivation award for an OC in a given semester.

Fields:

- `semester` – integer 1–6.
- `fieldName` – short name of the award/field.
- `maxMarks` – maximum marks available (decimal allowed, e.g. `100`, `50.5`).
- `marksObtained` – marks obtained (decimal).

#### GET `/api/v1/oc/:ocId/motivation-awards`

- **Description**: List motivation awards for an OC.
- **Auth**: Required.
- **Path params**: `ocId` (UUID).
- **Query params**:
  - `limit` – optional, 1–200 (default ~100).
  - `offset` – optional, 0–5000 (default 0).
- **Response 200**: `{ status, ok, items: MotivationAward[], count }`.
- **cURL example**:

```bash
curl -X GET "http://localhost:3000/api/v1/oc/<oc-id>/motivation-awards?limit=20&offset=0" \
  -b cookies.txt
```

#### POST `/api/v1/oc/:ocId/motivation-awards`

- **Description**: Create a motivation award record.
- **Auth**: Required.
- **Path params**: `ocId` (UUID).
- **Request body (JSON)**:

```json
{
  "semester": 3,
  "fieldName": "Motivation Card",
  "motivationTitle": "Best Cadet",
  "maxMarks": 100,
  "marksObtained": 85.5
}
```

- **Response 201**: `{ status, ok, data: MotivationAward }`.
- **Errors**: `400` for invalid fields; `404` if `ocId` does not exist.
- **cURL example**:

```bash
curl --location 'http://localhost:3000/api/v1/oc/c96a98e6-7d2d-41f9-bb4b-6d4f1797ac5d/motivation-awards' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer bearer token' \
--header 'X-CSRF-Token: B0Z3nuBwKN7nL_XOiVHzNuVFO5FjFmBmY8v6djUUgeg.16e9371be46f8a8f4e902cede82a8ce7931d9e9f96f0ea9ee5c44bf8f2b6a89d' \
--header 'Cookie: access_token=access_token; csrf-token=csrf_token; access_token=access_token' \
--data '{
    "semester": 3,
    "fieldName": "Motivation Card",
    "motivationTitle": "Best Cadet",
    "maxMarks": 100,
    "marksObtained": 85.5
  }'
```

#### GET `/api/v1/oc/:ocId/motivation-awards/:id`

- **Description**: Fetch a single motivation award.
- **Auth**: Required.
- **Path params**: `ocId` (UUID), `id` (UUID).
- **Response 200**: `{ status, ok, data: MotivationAward }`.
- **Errors**: `404` if the record does not exist for the given OC.

#### PATCH `/api/v1/oc/:ocId/motivation-awards/:id`

- **Description**: Update a motivation award (partial update).
- **Auth**: Admin only.
- **Path params**: `ocId` (UUID), `id` (UUID).
- **Request body (JSON)**: any subset of the create fields.
- **Response 200**: `{ status, ok, data: MotivationAward }`.

#### DELETE `/api/v1/oc/:ocId/motivation-awards/:id`

- **Description**: Soft or hard delete a motivation award.
- **Auth**: Admin only.
- **Path params**: `ocId` (UUID), `id` (UUID).
- **Query params**: `hard=true` to hard‑delete; otherwise performs soft delete (sets `deletedAt`).
- **Response 200**: `{ status, ok, id, message }`.
- **cURL example (soft delete)**:

```bash
curl -X DELETE "http://localhost:3000/api/v1/oc/<oc-id>/motivation-awards/<award-id>" \
  -b cookies.txt
```

---

### Sports & Games

Each record captures marks in sports/games for a specific term and semester.

Fields:

- `semester` – integer 1–6.
- `term` – enum, one of `SPRING`, `AUTUMN`.
- `sport` – sport or game name.
- `maxMarks` – maximum marks available (decimal).
- `marksObtained` – marks obtained (decimal).

#### GET `/api/v1/oc/:ocId/sports-and-games`

- **Description**: List sports and games records for an OC.
- **Auth**: Required.
- **Path params**: `ocId` (UUID).
- **Query params**: `limit`, `offset` as above.
- **Response 200**: `{ status, ok, items: SportsAndGamesRecord[], count }`.

#### POST `/api/v1/oc/:ocId/sports-and-games`

- **Description**: Create a sports/games record.
- **Auth**: Required.
- **Path params**: `ocId` (UUID).
- **Request body (JSON)**:

```json
{
  "semester": 2,
  "term": "SPRING",
  "sport": "Football",
  "maxMarks": 50,
  "marksObtained": 42.5
}
```

- **Response 201**: `{ status, ok, data: SportsAndGamesRecord }`.

#### GET `/api/v1/oc/:ocId/sports-and-games/:id`

- **Description**: Fetch a single sports/games record.
- **Auth**: Required.
- **Path params**: `ocId` (UUID), `id` (UUID).

#### PATCH `/api/v1/oc/:ocId/sports-and-games/:id`

- **Description**: Update a sports/games record (partial update).
- **Auth**: Admin only.
- **Path params**: `ocId` (UUID), `id` (UUID).

#### DELETE `/api/v1/oc/:ocId/sports-and-games/:id`

- **Description**: Soft or hard delete a sports/games record.
- **Auth**: Admin only.
- **Path params**: `ocId` (UUID), `id` (UUID).
- **Query params**: `hard=true` to hard‑delete.

---

### Weapon Training

Weapon training records link an OC to a course subject and capture marks in that subject.

Fields:

- `subjectId` – UUID of the related subject.
- `semester` – integer 1–6.
- `maxMarks` – maximum marks available (decimal).
- `marksObtained` – marks obtained (decimal).

#### GET `/api/v1/oc/:ocId/weapon-training`

- **Description**: List weapon training records for an OC.
- **Auth**: Required.
- **Path params**: `ocId` (UUID).
- **Query params**: `limit`, `offset` as above.

#### POST `/api/v1/oc/:ocId/weapon-training`

- **Description**: Create a weapon training record.
- **Auth**: Required.
- **Path params**: `ocId` (UUID).
- **Request body (JSON)**:

```json
{
  "subjectId": "<subject-uuid>",
  "semester": 4,
  "maxMarks": 100,
  "marksObtained": 92.75
}
```

- **Response 201**: `{ status, ok, data: WeaponTrainingRecord }`.

#### GET `/api/v1/oc/:ocId/weapon-training/:id`

- **Description**: Fetch a single weapon training record.
- **Auth**: Required.
- **Path params**: `ocId` (UUID), `id` (UUID).

#### PATCH `/api/v1/oc/:ocId/weapon-training/:id`

- **Description**: Update a weapon training record (partial update).
- **Auth**: Admin only.
- **Path params**: `ocId` (UUID), `id` (UUID).

#### DELETE `/api/v1/oc/:ocId/weapon-training/:id`

- **Description**: Soft or hard delete a weapon training record.
- **Auth**: Admin only.
- **Path params**: `ocId` (UUID), `id` (UUID).
- **Query params**: `hard=true` to hard‑delete.

---

### Special Achievement in Firing

Free‑text descriptions of special achievements in firing for an OC.

Fields:

- `achievement` – non‑empty description of the achievement.

#### GET `/api/v1/oc/:ocId/special-achievement-in-firing`

- **Description**: List special achievement in firing records for an OC.
- **Auth**: Required.
- **Path params**: `ocId` (UUID).
- **Query params**: `limit`, `offset` as above.

#### POST `/api/v1/oc/:ocId/special-achievement-in-firing`

- **Description**: Create a special achievement in firing record.
- **Auth**: Required.
- **Path params**: `ocId` (UUID).
- **Request body (JSON)**:

```json
{
  "achievement": "Winner of inter‑battalion firing competition"
}
```

- **Response 201**: `{ status, ok, data: SpecialAchievementInFiringRecord }`.

#### GET `/api/v1/oc/:ocId/special-achievement-in-firing/:id`

- **Description**: Fetch a single achievement in firing.
- **Auth**: Required.
- **Path params**: `ocId` (UUID), `id` (UUID).

#### PATCH `/api/v1/oc/:ocId/special-achievement-in-firing/:id`

- **Description**: Update an achievement in firing (partial update).
- **Auth**: Admin only.
- **Path params**: `ocId` (UUID), `id` (UUID).

#### DELETE `/api/v1/oc/:ocId/special-achievement-in-firing/:id`

- **Description**: Soft or hard delete an achievement in firing record.
- **Auth**: Admin only.
- **Path params**: `ocId` (UUID), `id` (UUID).
- **Query params**: `hard=true` to hard‑delete.

---

### Obstacle Training

Obstacle training records capture performance in obstacle courses in senior semesters.

Fields:

- `semester` – integer 4–6.
- `obstacle` – name/description of the obstacle.
- `marksObtained` – marks obtained (decimal).
- `remark` – optional remark.

#### GET `/api/v1/oc/:ocId/obstacle-training`

- **Description**: List obstacle training records for an OC.
- **Auth**: Required.
- **Path params**: `ocId` (UUID).
- **Query params**: `limit`, `offset` as above.

#### POST `/api/v1/oc/:ocId/obstacle-training`

- **Description**: Create an obstacle training record.
- **Auth**: Required.
- **Path params**: `ocId` (UUID).
- **Request body (JSON)**:

```json
{
  "semester": 5,
  "obstacle": "Tarzan swing",
  "marksObtained": 38.5,
  "remark": "Completed within time limit"
}
```

- **Response 201**: `{ status, ok, data: ObstacleTrainingRecord }`.

#### GET `/api/v1/oc/:ocId/obstacle-training/:id`

- **Description**: Fetch a single obstacle training record.
- **Auth**: Required.
- **Path params**: `ocId` (UUID), `id` (UUID).

#### PATCH `/api/v1/oc/:ocId/obstacle-training/:id`

- **Description**: Update an obstacle training record (partial update).
- **Auth**: Admin only.
- **Path params**: `ocId` (UUID), `id` (UUID).

#### DELETE `/api/v1/oc/:ocId/obstacle-training/:id`

- **Description**: Soft or hard delete an obstacle training record.
- **Auth**: Admin only.
- **Path params**: `ocId` (UUID), `id` (UUID).
- **Query params**: `hard=true` to hard‑delete.

---

### Speed March

Speed march records capture timings and marks for speed march tests in senior semesters.

Fields:

- `semester` – integer 4–6.
- `test` – test name/description.
- `timings` – timing string (e.g. `"45 min"`, `"00:42:30"`).
- `marks` – marks obtained (decimal).
- `remark` – optional remark.

#### GET `/api/v1/oc/:ocId/speed-march`

- **Description**: List speed march records for an OC.
- **Auth**: Required.
- **Path params**: `ocId` (UUID).
- **Query params**: `limit`, `offset` as above.

#### POST `/api/v1/oc/:ocId/speed-march`

- **Description**: Create a speed march record.
- **Auth**: Required.
- **Path params**: `ocId` (UUID).
- **Request body (JSON)**:

```json
{
  "semester": 4,
  "test": "10 km competitive march",
  "timings": "00:48:30",
  "marks": 40.0,
  "remark": "Good pace"
}
```

- **Response 201**: `{ status, ok, data: SpeedMarchRecord }`.

#### GET `/api/v1/oc/:ocId/speed-march/:id`

- **Description**: Fetch a single speed march record.
- **Auth**: Required.
- **Path params**: `ocId` (UUID), `id` (UUID).

#### PATCH `/api/v1/oc/:ocId/speed-march/:id`

- **Description**: Update a speed march record (partial update).
- **Auth**: Admin only.
- **Path params**: `ocId` (UUID), `id` (UUID).

#### DELETE `/api/v1/oc/:ocId/speed-march/:id`

- **Description**: Soft or hard delete a speed march record.
- **Auth**: Admin only.
- **Path params**: `ocId` (UUID), `id` (UUID).
- **Query params**: `hard=true` to hard‑delete.

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


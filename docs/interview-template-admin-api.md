# Interview Template Admin APIs (Frontend Flow)

This doc explains how the frontend should create and manage interview templates for all semesters. Templates are global and used to render interview forms for OCs later.

## Base variables (Postman/curl)
- `{{baseURL}}` = `http://localhost:3000`
- `{{auth_token}}`
- `{{CSRF_TOKEN}}`

## Auth rules
- All endpoints require `Authorization: Bearer {{auth_token}}`.
- POST/PATCH/DELETE require `X-CSRF-Token: {{CSRF_TOKEN}}`.

## Data model (what frontend renders)
- Template -> Sections -> Fields
- Template -> Groups (repeatable tables) -> Group Fields (columns)
- Template -> Semesters (many-to-many)

Notes:
- `allowMultiple` defaults to true (can store many entries per OC later).
- Each field can capture `filedAt` and signature; `captureFiledAt` defaults to true (admin can disable).
- Special interview sheet uses a Group with per-row fields (date, details, interviewed-by structured fields).
- Soft delete is used for templates/sections/groups/fields/options (`deletedAt`). Use `includeDeleted=true` only for admin cleanup screens.

## Suggested frontend build flow (admin)
1) Create Template
2) Add Semesters
3) Create Sections
4) Add Fields into Sections
5) Create Groups (repeatable tables)
6) Add Group Fields (columns)
7) Add Options for select fields (only if `fieldType = select`)

---

## 1) Create Template
Endpoint:
- `POST /api/v1/admin/interview/templates`

Example:
```bash
curl -s -X POST "{{baseURL}}/api/v1/admin/interview/templates" \
  -H "Authorization: Bearer {{auth_token}}" \
  -H "X-CSRF-Token: {{CSRF_TOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "INIT_PL_CDR",
    "title": "Initial Interview by PL Cdr",
    "description": "PL Cdr initial interview template",
    "allowMultiple": true,
    "sortOrder": 0,
    "isActive": true
  }'
```

Response:
```json
{
  "status": 201,
  "ok": true,
  "message": "Interview template created successfully.",
  "template": {
    "id": "...",
    "code": "INIT_PL_CDR",
    "title": "Initial Interview by PL Cdr",
    "allowMultiple": true,
    "sortOrder": 0,
    "isActive": true
  }
}
```

---

## 2) Attach Semesters to Template
Endpoint:
- `POST /api/v1/admin/interview/templates/:templateId/semesters`

Example:
```bash
curl -s -X POST "{{baseURL}}/api/v1/admin/interview/templates/{{templateId}}/semesters" \
  -H "Authorization: Bearer {{auth_token}}" \
  -H "X-CSRF-Token: {{CSRF_TOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{ "semester": 1 }'
```

Use multiple calls to add semesters 1..6 as needed.

---

## 3) Create Sections
Endpoint:
- `POST /api/v1/admin/interview/templates/:templateId/sections`

Example:
```bash
curl -s -X POST "{{baseURL}}/api/v1/admin/interview/templates/{{templateId}}/sections" \
  -H "Authorization: Bearer {{auth_token}}" \
  -H "X-CSRF-Token: {{CSRF_TOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Background",
    "description": "Background-related items",
    "sortOrder": 0,
    "isActive": true
  }'
```

---

## 4) Add Fields to Sections
Endpoint:
- `POST /api/v1/admin/interview/templates/:templateId/sections/:sectionId/fields`

Example:
```bash
curl -s -X POST "{{baseURL}}/api/v1/admin/interview/templates/{{templateId}}/sections/{{sectionId}}/fields" \
  -H "Authorization: Bearer {{auth_token}}" \
  -H "X-CSRF-Token: {{CSRF_TOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{
    "key": "appearance_bg_comm",
    "label": "Appearance, Bg and Comm Skills",
    "fieldType": "textarea",
    "required": true,
    "sortOrder": 1,
    "captureFiledAt": true,
    "captureSignature": false
  }'
```

Tip: Use `captureSignature=true` for statements like “I have explained the trg curriculum...” so the UI collects name/rank/appointment + date.

---

## 5) Create Groups (repeatable tables)
Use a group for tables like “Interview Sheet: Special” where rows repeat.

Endpoint:
- `POST /api/v1/admin/interview/templates/:templateId/groups`

Example:
```bash
curl -s -X POST "{{baseURL}}/api/v1/admin/interview/templates/{{templateId}}/groups" \
  -H "Authorization: Bearer {{auth_token}}" \
  -H "X-CSRF-Token: {{CSRF_TOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{
    "sectionId": "{{sectionId}}",
    "title": "Interview Sheet: Special",
    "minRows": 0,
    "maxRows": 50,
    "sortOrder": 5,
    "isActive": true
  }'
```

---

## 6) Add Fields to Groups (columns)
Endpoint:
- `POST /api/v1/admin/interview/templates/:templateId/groups/:groupId/fields`

Example (Special sheet row columns):
```bash
curl -s -X POST "{{baseURL}}/api/v1/admin/interview/templates/{{templateId}}/groups/{{groupId}}/fields" \
  -H "Authorization: Bearer {{auth_token}}" \
  -H "X-CSRF-Token: {{CSRF_TOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{
    "key": "interview_dt",
    "label": "Dt",
    "fieldType": "date",
    "required": true,
    "sortOrder": 1
  }'
```

Repeat for:
- `details` (textarea)
- `interviewed_by_name` (text)
- `interviewed_by_rank` (text)
- `interviewed_by_appt` (text)

These are per-row fields, as requested.

---

## 7) Add Options for select fields
Endpoint:
- `POST /api/v1/admin/interview/templates/:templateId/fields/:fieldId/options`

Example:
```bash
curl -s -X POST "{{baseURL}}/api/v1/admin/interview/templates/{{templateId}}/fields/{{fieldId}}/options" \
  -H "Authorization: Bearer {{auth_token}}" \
  -H "X-CSRF-Token: {{CSRF_TOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{ "code": "EXCELLENT", "label": "Excellent", "sortOrder": 1 }'
```

---

## Template loading (admin UI)
To render/edit templates:
```bash
curl -s "{{baseURL}}/api/v1/admin/interview/templates?semester=1&includeDeleted=false" \
  -H "Authorization: Bearer {{auth_token}}"
```

Then load:
- Sections: `/templates/:templateId/sections`
- Groups: `/templates/:templateId/groups`
- Fields: `/templates/:templateId/sections/:sectionId/fields`
- Group Fields: `/templates/:templateId/groups/:groupId/fields`
- Options: `/templates/:templateId/fields/:fieldId/options`

---

## Common errors
- `404 not_found`: wrong template/section/group/field id, or mismatched parent.
- `400 bad_request`: missing required fields, invalid payload, or `maxRows < minRows`.
- `409 conflict`: unique violation on codes (template code, field key, option code).

---

## Field types supported
`text`, `textarea`, `date`, `number`, `checkbox`, `select`, `signature`

Use `signature` if you want the UI to capture name/rank/appointment along with `filedAt`.

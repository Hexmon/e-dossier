# Physical Training (PT) Admin Template APIs

## Executive Overview
These APIs allow admins to configure **semester-wise Physical Training templates** (global for all OCs). Templates define PT Types (e.g., PPT, IPET, Swimming, Higher Tests), attempts, grades, tasks, and the score matrix for each task. Motivation award fields are also configurable per semester. This setup enables frontend screens to render the term sheet layout accurately without storing OC-specific marks yet.

**Key behaviors:**
- Templates are **global** (no OC data in this phase).
- **Compensatory 40%** is **not hard-coded**; admin sets max marks via the score matrix.
- **Non-PPT types** can use a **single grade** (e.g., `SCORE`) or any custom grade scheme.
- Some PT types can **omit M2** or any attempt (soft delete or deactivate).
- Soft delete supported for types/attempts/grades/tasks/motivation fields; scores are hard-delete only.

---

## Base URL / Auth / CSRF
- `{{baseURL}}` = `http://localhost:3000`
- `{{auth_token}}` = access token (Bearer)
- `{{CSRF_TOKEN}}` = CSRF token (required for POST/PATCH/DELETE)

**Headers:**
- All endpoints require `Authorization: Bearer {{auth_token}}`.
- POST/PATCH/DELETE require `X-CSRF-Token: {{CSRF_TOKEN}}`.

---

## Data Model (Template Only)

### 1) PT Types (`pt_types`)
Per semester PT type (e.g., PPT, IPET). Contains total marks and display order.

### 2) PT Attempts (`pt_type_attempts`)
Attempts under a PT type (e.g., M1, M2, A1/C1). Each attempt has:
- `code`, `label`
- `isCompensatory` (use for A1/C1, A2/C2, A3/C3)
- `isActive` for temporary hide

### 3) Attempt Grades (`pt_attempt_grades`)
Grades under a single attempt:
- PPT uses E/G/S
- Non‑PPT can use a single grade like `SCORE`

### 4) PT Tasks (`pt_tasks`)
Tasks inside a PT type (e.g., 2.4 Km Run, Sprint 100m). Each task has `maxMarks` as a **task-level max** (not attempt-specific).

### 5) Task Score Matrix (`pt_task_scores`)
Defines **attempt+grade specific max marks** for a task:
```
pt_task_scores: (taskId + attemptId + gradeId) -> maxMarks
```
Use this to control compensatory marks or any custom scheme.

### 6) Motivation Award Fields (`pt_motivation_award_fields`)
Configurable labels per semester (e.g., Merit Card, Half Blue, Blue, Blazer). Admin can add/delete/reorder.

---

## Template Setup Flow (From Scratch)

1) **Create PT Type** (e.g., PPT)
2) **Create Attempts** (M1, M2, A1/C1...) with `isCompensatory`
3) **Create Grades** for each attempt (E/G/S or SCORE)
4) **Create Tasks** (e.g., 2.4 Km Run)
5) **Populate Task Scores Matrix** for each (task x attempt x grade)
6) **Create Motivation Award Fields** for the semester

---

## Example: PPT (Semester 2)

### Type
```
PPT (150 MKS)
```

### Attempts
- M1 (mandatory)
- M2 (mandatory)
- A1/C1 (compensatory)
- A2/C2 (compensatory)
- A3/C3 (compensatory)

### Grades (for M1/M2)
- E (Excellent)
- G (Good)
- S (Satisfactory)

### Tasks
- 2.4 Km Run
- Chin Up
- Toe Touch
- Sprint 100m
- 5 M Shuttle
- Sit Ups

### Score Matrix (example)
For each task, define:
- M1:E, M1:G, M1:S
- M2:E, M2:G, M2:S
- (Optional) A1/C1, A2/C2, A3/C3 if needed (can also have grades or a SCORE grade)

**Compensatory marks:** set max marks directly in `pt_task_scores` (no fixed 40%).

---

## Example: IPET (Semester 3)

### Type
```
IPET (35 MKS)
```

### Attempts
- M1
- M2

### Grades
- SCORE (single grade)

### Tasks
- T/A Vault
- Rope
- Chest Touch/Heaving

### Score Matrix
For each task, define `maxMarks` for:
- M1 + SCORE
- M2 + SCORE

---

## Frontend Rendering Guidance

### Template Endpoint → UI Layout
Use `/templates?semester=#` to render all PT Types and Motivation Fields for a term.

- `data.types[]` in display order
- For each type, render its tasks table
- For each task, render attempt/grade columns based on `attempts[].grades[]`

### Compensatory
Use `attempt.isCompensatory === true` to group/label compensatory columns (A1/C1, A2/C2, A3/C3).

### Non‑PPT Types
If there is only one grade (e.g., `SCORE`), render a single column for that attempt.

### Soft Delete
Default lists exclude `deletedAt`. Only include deleted when `includeDeleted=true` is set.

### Missing Score Matrix
If a task+attempt+grade has no score entry, the template response sets `maxMarks: null` for that grade. This indicates a **missing score definition**.

---

# API Reference (Postman-Friendly)

## 1) GET Template by Semester
**Purpose:** Fetch the full PT template for a semester (types + attempts + grades + tasks + score matrix + motivation fields).

**URL**
```
GET {{baseURL}}/api/v1/admin/physical-training/templates?semester=2
```

**Headers**
- Authorization: Bearer {{auth_token}}

**Response (200)**
```json
{
  "status": 200,
  "ok": true,
  "message": "PT template retrieved successfully.",
  "data": {
    "semester": 2,
    "types": [
      {
        "id": "...",
        "semester": 2,
        "code": "PPT",
        "title": "PPT (150 MKS)",
        "maxTotalMarks": 150,
        "sortOrder": 1,
        "isActive": true,
        "attempts": [
          {
            "id": "...",
            "code": "M1",
            "label": "Mandatory 1",
            "isCompensatory": false,
            "grades": [
              { "id": "...", "code": "E", "label": "Excellent", "maxMarks": 53, "scoreId": "..." }
            ]
          }
        ],
        "tasks": [
          {
            "id": "...",
            "title": "2.4 Km Run",
            "maxMarks": 53,
            "attempts": [
              {
                "id": "...",
                "code": "M1",
                "grades": [
                  { "code": "E", "maxMarks": 53, "scoreId": "..." }
                ]
              }
            ]
          }
        ]
      }
    ],
    "motivationFields": [
      { "id": "...", "semester": 2, "label": "Merit Card", "sortOrder": 1, "isActive": true }
    ]
  }
}
```

**Common Errors**
- 401 Unauthorized

**curl**
```bash
curl -s "{{baseURL}}/api/v1/admin/physical-training/templates?semester=2" \
  -H "Authorization: Bearer {{auth_token}}"
```

---

## 2) PT Types

### 2.1 GET List
**URL**
```
GET {{baseURL}}/api/v1/admin/physical-training/types?semester=2
```

**Response (200)**
```json
{ "status": 200, "ok": true, "message": "PT types retrieved successfully.", "items": [], "count": 0 }
```

**curl**
```bash
curl -s "{{baseURL}}/api/v1/admin/physical-training/types?semester=2" \
  -H "Authorization: Bearer {{auth_token}}"
```

### 2.2 POST Create
**Request JSON**
```json
{ "semester": 2, "code": "PPT", "title": "PPT (150 MKS)", "maxTotalMarks": 150, "sortOrder": 1, "isActive": true }
```

**Response (201)**
```json
{ "status": 201, "ok": true, "message": "PT type created successfully.", "ptType": { "id": "..." } }
```

**curl**
```bash
curl -s -X POST "{{baseURL}}/api/v1/admin/physical-training/types" \
  -H "Authorization: Bearer {{auth_token}}" \
  -H "X-CSRF-Token: {{CSRF_TOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{"semester":2,"code":"PPT","title":"PPT (150 MKS)","maxTotalMarks":150,"sortOrder":1,"isActive":true}'
```

---

## 3) PT Type by ID

### 3.1 GET
```
GET {{baseURL}}/api/v1/admin/physical-training/types/{{typeId}}
```

### 3.2 PATCH
**Request JSON**
```json
{ "title": "PPT (150 Marks)", "maxTotalMarks": 150 }
```

### 3.3 DELETE
**Request JSON**
```json
{ "hard": true }
```

**curl (PATCH)**
```bash
curl -s -X PATCH "{{baseURL}}/api/v1/admin/physical-training/types/{{typeId}}" \
  -H "Authorization: Bearer {{auth_token}}" \
  -H "X-CSRF-Token: {{CSRF_TOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{"title":"PPT (150 Marks)"}'
```

**curl (DELETE)**
```bash
curl -s -X DELETE "{{baseURL}}/api/v1/admin/physical-training/types/{{typeId}}" \
  -H "Authorization: Bearer {{auth_token}}" \
  -H "X-CSRF-Token: {{CSRF_TOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{"hard":true}'
```

---

## 4) Attempts

### 4.1 GET List
```
GET {{baseURL}}/api/v1/admin/physical-training/types/{{typeId}}/attempts
```

### 4.2 POST Create
**Request JSON**
```json
{ "code": "M1", "label": "Mandatory 1", "isCompensatory": false, "sortOrder": 1, "isActive": true }
```

**curl**
```bash
curl -s -X POST "{{baseURL}}/api/v1/admin/physical-training/types/{{typeId}}/attempts" \
  -H "Authorization: Bearer {{auth_token}}" \
  -H "X-CSRF-Token: {{CSRF_TOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{"code":"M1","label":"Mandatory 1","isCompensatory":false,"sortOrder":1,"isActive":true}'
```

---

## 5) Attempt by ID

### 5.1 GET
```
GET {{baseURL}}/api/v1/admin/physical-training/types/{{typeId}}/attempts/{{attemptId}}
```

### 5.2 PATCH
```json
{ "label": "Mandatory Attempt 1" }
```

### 5.3 DELETE
```json
{ "hard": true }
```

---

## 6) Grades

### 6.1 GET List
```
GET {{baseURL}}/api/v1/admin/physical-training/types/{{typeId}}/attempts/{{attemptId}}/grades
```

### 6.2 POST Create
```json
{ "code": "E", "label": "Excellent", "sortOrder": 1, "isActive": true }
```

**curl**
```bash
curl -s -X POST "{{baseURL}}/api/v1/admin/physical-training/types/{{typeId}}/attempts/{{attemptId}}/grades" \
  -H "Authorization: Bearer {{auth_token}}" \
  -H "X-CSRF-Token: {{CSRF_TOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{"code":"E","label":"Excellent","sortOrder":1,"isActive":true}'
```

---

## 7) Grade by ID

### 7.1 GET
```
GET {{baseURL}}/api/v1/admin/physical-training/types/{{typeId}}/attempts/{{attemptId}}/grades/{{gradeId}}
```

### 7.2 PATCH
```json
{ "label": "Excellent (E)" }
```

### 7.3 DELETE
```json
{ "hard": true }
```

---

## 8) Tasks

### 8.1 GET List
```
GET {{baseURL}}/api/v1/admin/physical-training/types/{{typeId}}/tasks
```

### 8.2 POST Create
```json
{ "title": "2.4 Km Run", "maxMarks": 53, "sortOrder": 1 }
```

---

## 9) Task by ID

### 9.1 GET
```
GET {{baseURL}}/api/v1/admin/physical-training/types/{{typeId}}/tasks/{{taskId}}
```

### 9.2 PATCH
```json
{ "maxMarks": 55 }
```

### 9.3 DELETE
```json
{ "hard": true }
```

---

## 10) Task Scores (Matrix)

### 10.1 GET List
```
GET {{baseURL}}/api/v1/admin/physical-training/types/{{typeId}}/tasks/{{taskId}}/scores
```

### 10.2 POST Create
```json
{ "ptAttemptId": "{{attemptId}}", "ptAttemptGradeId": "{{gradeId}}", "maxMarks": 53 }
```

**curl**
```bash
curl -s -X POST "{{baseURL}}/api/v1/admin/physical-training/types/{{typeId}}/tasks/{{taskId}}/scores" \
  -H "Authorization: Bearer {{auth_token}}" \
  -H "X-CSRF-Token: {{CSRF_TOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{"ptAttemptId":"{{attemptId}}","ptAttemptGradeId":"{{gradeId}}","maxMarks":53}'
```

---

## 11) Task Score by ID

### 11.1 GET
```
GET {{baseURL}}/api/v1/admin/physical-training/types/{{typeId}}/tasks/{{taskId}}/scores/{{scoreId}}
```

### 11.2 PATCH
```json
{ "maxMarks": 50 }
```

### 11.3 DELETE (hard only)
```
DELETE {{baseURL}}/api/v1/admin/physical-training/types/{{typeId}}/tasks/{{taskId}}/scores/{{scoreId}}
```

---

## 12) Motivation Fields

### 12.1 GET List
```
GET {{baseURL}}/api/v1/admin/physical-training/motivation-fields?semester=2
```

### 12.2 POST Create
```json
{ "semester": 2, "label": "Merit Card", "sortOrder": 1, "isActive": true }
```

---

## 13) Motivation Field by ID

### 13.1 GET
```
GET {{baseURL}}/api/v1/admin/physical-training/motivation-fields/{{id}}
```

### 13.2 PATCH
```json
{ "label": "Merit Card (Updated)" }
```

### 13.3 DELETE
```json
{ "hard": true }
```

---

## Common Errors
- **401 Unauthorized**: missing/invalid token
- **403 Forbidden**: not admin for POST/PATCH/DELETE
- **404 Not Found**: invalid type/attempt/grade/task/score id
- **400 invalid_attempt**: attempt does not belong to type
- **400 invalid_grade**: grade does not belong to attempt

---

## Troubleshooting
- **Grade not belonging to attempt**: Ensure `grade.ptAttemptId` matches `attemptId`.
- **Attempt not belonging to type**: Ensure `attempt.ptTypeId` matches `typeId`.
- **Missing score matrix**: Template response shows `maxMarks: null` for missing attempt+grade+task.
- **Soft deletes not visible**: Use `includeDeleted=true` on list endpoints when auditing.

---

## Validator Summary
- `semester`: 1..6
- `ptType`: `code` max 32, `title` max 160, `maxTotalMarks` >= 0
- `attempt`: `code` max 16, `label` max 64
- `grade`: `code` max 8
- `task`: `title` max 160, `maxMarks` >= 0
- `score`: `maxMarks` >= 0, requires `ptAttemptId` + `ptAttemptGradeId`
- `motivation field`: `label` max 160

---

# OC Physical Training Marks APIs

## OC PT Overview (Marks Entry)
These endpoints store **OC marks** against the **template matrix** (`pt_task_scores`) so each attempt/grade can be saved **separately** (M1 and M2 are distinct rows). Motivation awards are stored as per-OC text values mapped to template fields.

**Validation rules enforced by API:**
- `marksScored` must be `<= template maxMarks`.
- `ptTaskScoreId` must exist and belong to the same semester.
- Template items must be active and not deleted.
- If a template score entry is missing, the API rejects the request.

**Auth rules:**
- Any authenticated user can read/write.
- POST/PATCH/DELETE require `X-CSRF-Token`.

---

## OC PT Scores

### GET /api/v1/oc/:ocId/physical-training?semester=#
**Purpose:** Fetch OC PT scores for a semester.

**Response (200)**
```json
{
  "status": 200,
  "ok": true,
  "message": "PT scores retrieved successfully.",
  "data": {
    "semester": 2,
    "scores": [
      {
        "id": "oc_score_id",
        "ocId": "oc_id",
        "semester": 2,
        "ptTaskScoreId": "template_score_id",
        "marksScored": 53,
        "remark": "Good run",
        "templateMaxMarks": 53,
        "ptTypeCode": "PPT",
        "taskTitle": "2.4 Km Run",
        "attemptCode": "M1",
        "gradeCode": "E"
      }
    ]
  }
}
```

**curl**
```bash
curl -s "{{baseURL}}/api/v1/oc/{{ocId}}/physical-training?semester=2" \
  -H "Authorization: Bearer {{auth_token}}"
```

---

### POST /api/v1/oc/:ocId/physical-training
**Purpose:** Upsert multiple OC PT scores (multiple attempts per task supported).

**Request JSON**
```json
{
  "semester": 2,
  "scores": [
    { "ptTaskScoreId": "{{ptTaskScoreId_M1_E}}", "marksScored": 53, "remark": "Good run" },
    { "ptTaskScoreId": "{{ptTaskScoreId_M2_E}}", "marksScored": 45 }
  ]
}
```

**curl**
```bash
curl -s -X POST "{{baseURL}}/api/v1/oc/{{ocId}}/physical-training" \
  -H "Authorization: Bearer {{auth_token}}" \
  -H "X-CSRF-Token: {{CSRF_TOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{
    "semester": 2,
    "scores": [
      { "ptTaskScoreId": "{{ptTaskScoreId_M1_E}}", "marksScored": 53, "remark": "Good run" },
      { "ptTaskScoreId": "{{ptTaskScoreId_M2_E}}", "marksScored": 45 }
    ]
  }'
```

---

### PATCH /api/v1/oc/:ocId/physical-training
**Purpose:** Update scores and/or delete specific OC score rows.

**Request JSON**
```json
{
  "semester": 2,
  "scores": [
    { "ptTaskScoreId": "{{ptTaskScoreId_M1_E}}", "marksScored": 52, "remark": "Adjusted" }
  ],
  "deleteScoreIds": ["{{ocPtScoreIdToDelete}}"]
}
```

**curl**
```bash
curl -s -X PATCH "{{baseURL}}/api/v1/oc/{{ocId}}/physical-training" \
  -H "Authorization: Bearer {{auth_token}}" \
  -H "X-CSRF-Token: {{CSRF_TOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{
    "semester": 2,
    "scores": [
      { "ptTaskScoreId": "{{ptTaskScoreId_M1_E}}", "marksScored": 52, "remark": "Adjusted" }
    ],
    "deleteScoreIds": ["{{ocPtScoreIdToDelete}}"]
  }'
```

---

### DELETE /api/v1/oc/:ocId/physical-training
**Purpose:** Delete specific scores or all scores for a semester.

**Delete by IDs**
```bash
curl -s -X DELETE "{{baseURL}}/api/v1/oc/{{ocId}}/physical-training" \
  -H "Authorization: Bearer {{auth_token}}" \
  -H "X-CSRF-Token: {{CSRF_TOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{ "semester": 2, "scoreIds": ["{{ocPtScoreId1}}","{{ocPtScoreId2}}"] }'
```

**Delete all scores for semester**
```bash
curl -s -X DELETE "{{baseURL}}/api/v1/oc/{{ocId}}/physical-training" \
  -H "Authorization: Bearer {{auth_token}}" \
  -H "X-CSRF-Token: {{CSRF_TOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{ "semester": 2 }'
```

---

## OC PT Motivation Awards (Text Values)

### GET /api/v1/oc/:ocId/physical-training/motivation-awards?semester=#
**Purpose:** Fetch OC motivation values for a semester.

**curl**
```bash
curl -s "{{baseURL}}/api/v1/oc/{{ocId}}/physical-training/motivation-awards?semester=2" \
  -H "Authorization: Bearer {{auth_token}}"
```

---

### POST /api/v1/oc/:ocId/physical-training/motivation-awards
**Purpose:** Upsert multiple motivation values.

**Request JSON**
```json
{
  "semester": 2,
  "values": [
    { "fieldId": "{{motivationFieldId_MeritCard}}", "value": "Awarded" },
    { "fieldId": "{{motivationFieldId_Blue}}", "value": "—" }
  ]
}
```

**curl**
```bash
curl -s -X POST "{{baseURL}}/api/v1/oc/{{ocId}}/physical-training/motivation-awards" \
  -H "Authorization: Bearer {{auth_token}}" \
  -H "X-CSRF-Token: {{CSRF_TOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{
    "semester": 2,
    "values": [
      { "fieldId": "{{motivationFieldId_MeritCard}}", "value": "Awarded" },
      { "fieldId": "{{motivationFieldId_Blue}}", "value": "—" }
    ]
  }'
```

---

### PATCH /api/v1/oc/:ocId/physical-training/motivation-awards
**Purpose:** Update values and/or delete specific rows.

**Request JSON**
```json
{
  "semester": 2,
  "values": [
    { "fieldId": "{{motivationFieldId_MeritCard}}", "value": "Updated text" }
  ],
  "deleteFieldIds": ["{{ocMotivationAwardIdToDelete}}"]
}
```

**curl**
```bash
curl -s -X PATCH "{{baseURL}}/api/v1/oc/{{ocId}}/physical-training/motivation-awards" \
  -H "Authorization: Bearer {{auth_token}}" \
  -H "X-CSRF-Token: {{CSRF_TOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{
    "semester": 2,
    "values": [
      { "fieldId": "{{motivationFieldId_MeritCard}}", "value": "Updated text" }
    ],
    "deleteFieldIds": ["{{ocMotivationAwardIdToDelete}}"]
  }'
```

---

### DELETE /api/v1/oc/:ocId/physical-training/motivation-awards
**Purpose:** Delete specific values or all values for a semester.

**Delete by IDs**
```bash
curl -s -X DELETE "{{baseURL}}/api/v1/oc/{{ocId}}/physical-training/motivation-awards" \
  -H "Authorization: Bearer {{auth_token}}" \
  -H "X-CSRF-Token: {{CSRF_TOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{ "semester": 2, "fieldIds": ["{{ocMotivationAwardId1}}","{{ocMotivationAwardId2}}"] }'
```

**Delete all values for semester**
```bash
curl -s -X DELETE "{{baseURL}}/api/v1/oc/{{ocId}}/physical-training/motivation-awards" \
  -H "Authorization: Bearer {{auth_token}}" \
  -H "X-CSRF-Token: {{CSRF_TOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{ "semester": 2 }'
```

---

## OC PT Common Errors
- **400 invalid_score**: `ptTaskScoreId` missing or does not match semester/type/attempt/grade.\n- **400 marks_exceed_max**: `marksScored` exceeds template max.\n- **400 invalid_field**: motivation `fieldId` missing, deleted, inactive, or wrong semester.\n- **401 Unauthorized**: missing/invalid token.\n- **404 Not Found**: OC not found.

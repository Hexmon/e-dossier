# OC Image Uploads (Civil Dress + Uniform)

## Overview
Each OC has exactly two images:
- `CIVIL_DRESS`
- `UNIFORM`

Images are stored in MinIO (S3-compatible) and tracked in Postgres.

## Workflow (Recommended)
1. **Presign**: request a signed upload URL.
2. **Upload**: PUT the image directly to MinIO using the signed URL.
3. **Complete**: tell the API to verify and save metadata.

## API Endpoints
### 1) Presign
`POST /api/v1/oc/{ocId}/images/presign`

Body:
```json
{
  "kind": "CIVIL_DRESS",
  "contentType": "image/jpeg",
  "sizeBytes": 84512
}
```

Response includes:
- `uploadUrl`
- `objectKey`
- `bucket`
- `publicUrl`

### 2) Complete
`POST /api/v1/oc/{ocId}/images/complete`

Body:
```json
{
  "kind": "CIVIL_DRESS",
  "objectKey": "oc/{ocId}/civil_dress/....jpg"
}
```

The server validates:
- content type in `image/jpeg|image/png|image/webp`
- size between 20 KB and 200 KB

### 3) List
`GET /api/v1/oc/{ocId}/images?includeDeleted=false`

Returns both images (if present) plus `publicUrl`.

### 4) Delete
`DELETE /api/v1/oc/{ocId}/images?kind=CIVIL_DRESS&hard=false`

- `hard=true` deletes the object from MinIO and the DB row.
- `hard=false` only soft-deletes the DB row.

## MinIO Keys
Generated keys follow:
```
oc/{ocId}/{kind}/<uuid>.<ext>
```

## Notes
- `sessionalMarks`/`totalMarks` are not relevant here.
- Images are size‑restricted to keep storage small and predictable.
- If images are served from a different domain, update CSP `img-src` in `next.config.ts`.

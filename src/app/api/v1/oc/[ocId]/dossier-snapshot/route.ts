import { z } from 'zod';
import { db } from '@/app/db/client';
import { json, handleApiError, ApiError } from '@/app/lib/http';
import { parseParam, ensureOcExists, mustHaveOcAccess } from '../../_checks';
import { ocCadets, ocCommissioning, ocImages } from '@/app/db/schema/training/oc';
import { courses } from '@/app/db/schema/training/courses';
import { eq, or } from 'drizzle-orm';
import { withAuditRoute, AuditEventType, AuditResourceType } from '@/lib/audit';
import type { AuditNextRequest } from '@/lib/audit';
import { buildImageKey, createPresignedUploadUrl, headObject, createPresignedGetUrl } from '@/app/lib/storage';
import { getDossierSnapshotView, getOcImage, upsertOcImage, upsertPersonal } from '@/app/db/queries/oc';
import { syncOcLifecycleFromCadet } from '@/app/db/queries/oc-lifecycle';

const OcIdParam = z.object({ ocId: z.string().uuid() });

const optionalText = z.preprocess((v) => {
  if (v === undefined) return undefined;
  if (v === null) return null;
  return String(v);
}, z.string().nullable().optional());

const dossierSnapshotSchema = z.object({
  tesNo: optionalText,
  name: optionalText,
  course: optionalText,
  pi: optionalText,
  dtOfArr: optionalText,
  relegated: optionalText,
  withdrawnOn: optionalText,
  dtOfPassingOut: optionalText,
  icNo: optionalText,
  orderOfMerit: optionalText,
  regtArm: optionalText,
  postedAtt: optionalText,
});

type DossierSnapshotDto = z.infer<typeof dossierSnapshotSchema>;

function normalizeFormValue(value: FormDataEntryValue | null) {
  return typeof value === 'string' ? value : undefined;
}

function readSnapshotFormData(formData: FormData) {
  return {
    tesNo: normalizeFormValue(formData.get('tesNo')),
    name: normalizeFormValue(formData.get('name')),
    course: normalizeFormValue(formData.get('course')),
    pi: normalizeFormValue(formData.get('pi')),
    dtOfArr: normalizeFormValue(formData.get('dtOfArr')),
    relegated: normalizeFormValue(formData.get('relegated')),
    withdrawnOn: normalizeFormValue(formData.get('withdrawnOn')),
    dtOfPassingOut: normalizeFormValue(formData.get('dtOfPassingOut')),
    icNo: normalizeFormValue(formData.get('icNo')),
    orderOfMerit: normalizeFormValue(formData.get('orderOfMerit')),
    regtArm: normalizeFormValue(formData.get('regtArm')),
    postedAtt: normalizeFormValue(formData.get('postedAtt')),
  } satisfies DossierSnapshotDto;
}

function toDbText(value: string | null | undefined) {
  if (value === undefined) return undefined;
  return value ?? null;
}

function toOptionalDate(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toOptionalInt(value: string | null | undefined) {
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

async function resolveCourseIdByLabel(label: string, fieldName: string) {
  const normalized = label.trim();
  if (!normalized) return null;

  const [course] = await db
    .select({ id: courses.id })
    .from(courses)
    .where(or(eq(courses.code, normalized), eq(courses.title, normalized)))
    .limit(1);

  if (!course) {
    throw new ApiError(400, `${fieldName} must match an existing course code or title.`, 'bad_request');
  }

  return course.id;
}

async function buildOcCadetSnapshotPatch(dto: DossierSnapshotDto) {
  const patch: Partial<typeof ocCadets.$inferInsert> = {};

  if (dto.tesNo !== undefined && dto.tesNo !== null) patch.ocNo = dto.tesNo;
  if (dto.name !== undefined && dto.name !== null) patch.name = dto.name;
  if (dto.dtOfArr !== undefined && dto.dtOfArr) patch.arrivalAtUniversity = toOptionalDate(dto.dtOfArr) ?? undefined;
  if (dto.withdrawnOn !== undefined) patch.withdrawnOn = toOptionalDate(dto.withdrawnOn);

  if (dto.course !== undefined && dto.course) {
    const courseId = await resolveCourseIdByLabel(dto.course, 'course');
    if (courseId) patch.courseId = courseId;
  }

  if (dto.relegated !== undefined) {
    const value = (dto.relegated ?? '').trim();
    if (!value) {
      patch.relegatedToCourseId = null;
      patch.relegatedOn = null;
    } else {
      const match = /^Relegated to (.+) on (\d{4}-\d{2}-\d{2})$/i.exec(value);
      if (!match) {
        throw new ApiError(
          400,
          'relegated must be blank or in the format "Relegated to <course code> on YYYY-MM-DD".',
          'bad_request',
        );
      }

      patch.relegatedToCourseId = await resolveCourseIdByLabel(match[1], 'relegated course');
      patch.relegatedOn = toOptionalDate(match[2]);
    }
  }

  if (Object.keys(patch).length > 0) {
    patch.updatedAt = new Date();
  }

  return patch;
}

async function applySnapshotCoreFields(ocId: string, dto: DossierSnapshotDto, actorUserId?: string | null) {
  const ocPatch = await buildOcCadetSnapshotPatch(dto);
  if (Object.keys(ocPatch).length > 0) {
    await db.update(ocCadets).set(ocPatch).where(eq(ocCadets.id, ocId));
    await syncOcLifecycleFromCadet(ocId, {
      actorUserId,
      reason: 'dossier_snapshot_canonical_sync',
    });
  }

  if (dto.pi !== undefined) {
    await upsertPersonal(ocId, { pi: toDbText(dto.pi) });
  }
}

async function GETHandler(req: AuditNextRequest, { params }: { params: Promise<{ ocId: string }> }) {
  try {
    const { ocId } = await parseParam({ params }, OcIdParam);
    await ensureOcExists(ocId);
    const authCtx = await mustHaveOcAccess(req, ocId);

    const data = await getDossierSnapshotView(ocId);
    if (!data) throw new ApiError(404, 'OC not found', 'not_found');

    // Fetch images
    const imagesRows = await db
      .select({
        kind: ocImages.kind,
        objectKey: ocImages.objectKey,
        deletedAt: ocImages.deletedAt,
      })
      .from(ocImages)
      .where(eq(ocImages.ocId, ocId));

    const images: Record<string, any> = { CIVIL_DRESS: null, UNIFORM: null };
    for (const row of imagesRows) {
      if (!row.deletedAt) {
        images[row.kind] = await createPresignedGetUrl({ key: row.objectKey });
      }
    }

    await req.audit.log({
      action: AuditEventType.API_REQUEST,
      outcome: 'SUCCESS',
      actor: { type: 'user', id: authCtx.userId },
      target: { type: AuditResourceType.OC, id: ocId },
      metadata: {
        description: `Dossier snapshot retrieved successfully for OC ${ocId}`,
        ocId,
        module: 'dossier_snapshot',
      },
    });

    return json.ok({
      message: 'Dossier snapshot retrieved successfully.',
      data: {
        ...data,
        arrivalPhoto: images.CIVIL_DRESS,
        departurePhoto: images.UNIFORM,
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}

async function uploadImage(ocId: string, file: File, kind: 'CIVIL_DRESS' | 'UNIFORM') {
  const objectKey = buildImageKey({ ocId, kind, contentType: file.type });
  const uploadUrl = await createPresignedUploadUrl({
    key: objectKey,
    contentType: file.type,
    expiresInSeconds: 300,
  });

  // Upload the file to MinIO
  const uploadResponse = await fetch(uploadUrl, {
    method: 'PUT',
    body: file,
    headers: {
      'Content-Type': file.type,
    },
  });

  if (!uploadResponse.ok) {
    throw new ApiError(500, 'Failed to upload image', 'server_error');
  }

  // Verify the upload
  const head = await headObject(objectKey);
  const sizeBytes = Number(head.ContentLength ?? 0);
  const contentType = head.ContentType || '';
  const etag = (head.ETag || '').replace(/"/g, '') || null;

  if (sizeBytes > 200 * 1024) {
    throw new ApiError(400, 'Image size out of allowed range.', 'bad_request');
  }
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(contentType)) {
    throw new ApiError(400, 'Unsupported image content type.', 'bad_request');
  }

  // Save to DB
  const config = await import('@/app/lib/storage').then(m => m.getStorageConfig());
  const existing = await getOcImage(ocId, kind);
  const saved = await upsertOcImage(ocId, kind, {
    bucket: config.bucket,
    objectKey,
    contentType,
    sizeBytes,
    etag,
    uploadedAt: new Date(),
  });

  if (existing && existing.objectKey !== objectKey) {
    try {
      await import('@/app/lib/storage').then(m => m.deleteObject(existing.objectKey));
    } catch {
      // best effort cleanup
    }
  }

  return saved;
}

async function POSTHandler(req: AuditNextRequest, { params }: { params: Promise<{ ocId: string }> }) {
  try {
    const { ocId } = await parseParam({ params }, OcIdParam);
    await ensureOcExists(ocId);
    const adminCtx = await mustHaveOcAccess(req, ocId);

    let dto: any;
    let arrivalPhoto: File | null = null;
    let departurePhoto: File | null = null;

    const contentType = req.headers.get('content-type') || '';
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      dto = readSnapshotFormData(formData);
      arrivalPhoto = formData.get('arrivalPhoto') as File | null;
      departurePhoto = formData.get('departurePhoto') as File | null;
    } else {
      dto = dossierSnapshotSchema.parse(await req.json());
    }

    // Check if commissioning exists
    const [existing] = await db
      .select()
      .from(ocCommissioning)
      .where(eq(ocCommissioning.ocId, ocId))
      .limit(1);

    if (existing) {
      throw new ApiError(409, 'Dossier snapshot already exists.', 'conflict');
    }

    // Upload images if provided
    if (arrivalPhoto) {
      await uploadImage(ocId, arrivalPhoto, 'CIVIL_DRESS');
    }
    if (departurePhoto) {
      await uploadImage(ocId, departurePhoto, 'UNIFORM');
    }
    await applySnapshotCoreFields(ocId, dto, adminCtx.userId);

    const insertData: any = {
      ocId,
      passOutDate: toOptionalDate(dto.dtOfPassingOut),
      icNo: toDbText(dto.icNo),
      orderOfMerit: toOptionalInt(dto.orderOfMerit),
      regimentOrArm: toDbText(dto.regtArm),
      postedUnit: toDbText(dto.postedAtt),
    };

    const [row] = await db.insert(ocCommissioning).values(insertData).returning();

    await req.audit.log({
      action: AuditEventType.OC_RECORD_CREATED,
      outcome: 'SUCCESS',
      actor: { type: 'user', id: adminCtx.userId },
      target: { type: AuditResourceType.OC, id: ocId },
      metadata: {
        description: `Created dossier snapshot for ${ocId}`,
        ocId,
        module: 'dossier-snapshot',
      },
    });

    return json.ok({ message: 'Dossier snapshot created successfully.', data: row });
  } catch (err) {
    return handleApiError(err);
  }
}

async function PUTHandler(req: AuditNextRequest, { params }: { params: Promise<{ ocId: string }> }) {
  try {
    const { ocId } = await parseParam({ params }, OcIdParam);
    await ensureOcExists(ocId);
    const adminCtx = await mustHaveOcAccess(req, ocId);

    let dto: any;
    let arrivalPhoto: File | null = null;
    let departurePhoto: File | null = null;

    const contentType = req.headers.get('content-type') || '';
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      dto = readSnapshotFormData(formData);
      arrivalPhoto = formData.get('arrivalPhoto') as File | null;
      departurePhoto = formData.get('departurePhoto') as File | null;
    } else {
      dto = dossierSnapshotSchema.parse(await req.json());
    }

    // Check if commissioning exists
    const [existing] = await db
      .select()
      .from(ocCommissioning)
      .where(eq(ocCommissioning.ocId, ocId))
      .limit(1);

    // Upload images if provided
    if (arrivalPhoto) {
      await uploadImage(ocId, arrivalPhoto, 'CIVIL_DRESS');
    }
    if (departurePhoto) {
      await uploadImage(ocId, departurePhoto, 'UNIFORM');
    }
    await applySnapshotCoreFields(ocId, dto, adminCtx.userId);

    if (!existing) {
      const insertData: any = {
        ocId,
        passOutDate: toOptionalDate(dto.dtOfPassingOut),
        icNo: toDbText(dto.icNo),
        orderOfMerit: toOptionalInt(dto.orderOfMerit),
        regimentOrArm: toDbText(dto.regtArm),
        postedUnit: toDbText(dto.postedAtt),
      };

      const [row] = await db.insert(ocCommissioning).values(insertData).returning();

      await req.audit.log({
        action: AuditEventType.OC_RECORD_CREATED,
        outcome: 'SUCCESS',
        actor: { type: 'user', id: adminCtx.userId },
        target: { type: AuditResourceType.OC, id: ocId },
        metadata: {
          description: `Created dossier snapshot for ${ocId}`,
          ocId,
          module: 'dossier-snapshot',
        },
      });

      return json.ok({ message: 'Dossier snapshot created successfully.', data: row });
    }

    const updateData: any = {};
    if (dto.dtOfPassingOut !== undefined) updateData.passOutDate = toOptionalDate(dto.dtOfPassingOut);
    if (dto.icNo !== undefined) updateData.icNo = toDbText(dto.icNo);
    if (dto.orderOfMerit !== undefined) updateData.orderOfMerit = toOptionalInt(dto.orderOfMerit);
    if (dto.regtArm !== undefined) updateData.regimentOrArm = toDbText(dto.regtArm);
    if (dto.postedAtt !== undefined) updateData.postedUnit = toDbText(dto.postedAtt);

    const [row] = Object.keys(updateData).length > 0
      ? await db.update(ocCommissioning).set(updateData).where(eq(ocCommissioning.ocId, ocId)).returning()
      : [existing];

    await req.audit.log({
      action: AuditEventType.OC_RECORD_UPDATED,
      outcome: 'SUCCESS',
      actor: { type: 'user', id: adminCtx.userId },
      target: { type: AuditResourceType.OC, id: ocId },
      metadata: {
        description: `Updated dossier snapshot for ${ocId}`,
        ocId,
        module: 'dossier-snapshot',
        changes: Object.keys(dto),
      },
    });

    return json.ok({ message: 'Dossier snapshot updated successfully.', data: row });
  } catch (err) {
    return handleApiError(err);
  }
}

export const GET = withAuditRoute('GET', GETHandler);
export const POST = withAuditRoute('POST', POSTHandler);
export const PUT = withAuditRoute('PUT', PUTHandler);
export const PATCH = withAuditRoute('PATCH', PUTHandler);

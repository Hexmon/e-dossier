import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/app/db/client';
import { json, handleApiError, ApiError } from '@/app/lib/http';
import { parseParam, ensureOcExists } from '../../_checks';
import { authorizeOcAccess } from '@/lib/authorization';
import { requireAuth } from '@/app/lib/authz';
import { ocCadets, ocCommissioning, ocImages } from '@/app/db/schema/training/oc';
import { courses } from '@/app/db/schema/training/courses';
import { platoons } from '@/app/db/schema/auth/platoons';
import { eq } from 'drizzle-orm';
import { createAuditLog, AuditEventType, AuditResourceType } from '@/lib/audit-log';
import { withRouteLogging } from '@/lib/withRouteLogging';
import { getPublicObjectUrl, buildImageKey, createPresignedUploadUrl, headObject, createPresignedGetUrl } from '@/app/lib/storage';
import { getOcImage, upsertOcImage } from '@/app/db/queries/oc';

const OcIdParam = z.object({ ocId: z.string().uuid() });

const dossierSnapshotSchema = z.object({
  dtOfPassingOut: z.string().optional(),
  icNo: z.string().nullable().optional(),
  orderOfMerit: z.string().nullable().optional(),
  regtArm: z.string().nullable().optional(),
  postedAtt: z.string().nullable().optional(),
});

async function GETHandler(req: NextRequest, { params }: { params: Promise<{ ocId: string }> }) {
  try {
    const { ocId } = await parseParam({ params }, OcIdParam);
    await ensureOcExists(ocId);
    // Allow any authenticated user to read dossier snapshots (read-only summary data)
    await requireAuth(req);

    // Fetch OC data
    const [ocRow] = await db
      .select({
        id: ocCadets.id,
        name: ocCadets.name,
        arrivalAtUniversity: ocCadets.arrivalAtUniversity,
        relegatedToCourseId: ocCadets.relegatedToCourseId,
        relegatedOn: ocCadets.relegatedOn,
        withdrawnOn: ocCadets.withdrawnOn,
        courseId: ocCadets.courseId,
        platoonId: ocCadets.platoonId,
        courseCode: courses.code,
        courseTitle: courses.title,
      })
      .from(ocCadets)
      .leftJoin(courses, eq(courses.id, ocCadets.courseId))
      .where(eq(ocCadets.id, ocId))
      .limit(1);

    if (!ocRow) throw new ApiError(404, 'OC not found', 'not_found');

    // Fetch commissioning data
    const [commissioning] = await db
      .select()
      .from(ocCommissioning)
      .where(eq(ocCommissioning.ocId, ocId))
      .limit(1);

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

    // Fetch platoon name
    let platoonName = null;
    if (ocRow.platoonId) {
      const [platoon] = await db
        .select({ name: platoons.name })
        .from(platoons)
        .where(eq(platoons.id, ocRow.platoonId))
        .limit(1);
      platoonName = platoon?.name || null;
    }

    // Fetch relegated course title
    let relegatedStr = null;
    if (ocRow.relegatedToCourseId && ocRow.relegatedOn) {
      const [relCourse] = await db
        .select({ title: courses.title })
        .from(courses)
        .where(eq(courses.id, ocRow.relegatedToCourseId))
        .limit(1);
      relegatedStr = `Relegated to ${relCourse?.title || 'Unknown'} on ${ocRow.relegatedOn.toISOString().split('T')[0]}`;
    }

    const data = {
      arrivalPhoto: images.CIVIL_DRESS,
      departurePhoto: images.UNIFORM,
      tesNo: ocRow.courseCode,
      name: ocRow.name,
      course: ocRow.courseTitle,
      pi: platoonName,
      dtOfArr: ocRow.arrivalAtUniversity.toISOString().split('T')[0],
      relegated: relegatedStr,
      withdrawnOn: ocRow.withdrawnOn ? ocRow.withdrawnOn.toISOString().split('T')[0] : null,
      dtOfPassingOut: commissioning?.passOutDate ? commissioning.passOutDate.toISOString().split('T')[0] : null,
      icNo: commissioning?.icNo || null,
      orderOfMerit: commissioning?.orderOfMerit ? commissioning.orderOfMerit.toString() : null,
      regtArm: commissioning?.regimentOrArm || null,
      postedAtt: commissioning?.postedUnit || null,
    };

    return json.ok({ message: 'Dossier snapshot retrieved successfully.', data });
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

  if (sizeBytes < 20 * 1024 || sizeBytes > 200 * 1024) {
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

async function POSTHandler(req: NextRequest, { params }: { params: Promise<{ ocId: string }> }) {
  try {
    const adminCtx = await requireAuth(req);
    const { ocId } = await parseParam({ params }, OcIdParam);
    await ensureOcExists(ocId);

    let dto: any;
    let arrivalPhoto: File | null = null;
    let departurePhoto: File | null = null;

    const contentType = req.headers.get('content-type') || '';
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      dto = {
        tesNo: formData.get('tesNo') as string,
        name: formData.get('name') as string,
        course: formData.get('course') as string,
        pi: formData.get('pi') as string,
        dtOfArr: formData.get('dtOfArr') as string,
        relegated: formData.get('relegated') as string,
        withdrawnOn: formData.get('withdrawnOn') as string,
        dtOfPassingOut: formData.get('dtOfPassingOut') as string,
        icNo: formData.get('icNo') as string,
        orderOfMerit: formData.get('orderOfMerit') as string,
        regtArm: formData.get('regtArm') as string,
        postedAtt: formData.get('postedAtt') as string,
      };
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

    const insertData: any = {
      ocId,
      passOutDate: dto.dtOfPassingOut ? new Date(dto.dtOfPassingOut) : null,
      icNo: dto.icNo,
      orderOfMerit: dto.orderOfMerit ? parseInt(dto.orderOfMerit) : null,
      regimentOrArm: dto.regtArm,
      postedUnit: dto.postedAtt,
    };

    const [row] = await db.insert(ocCommissioning).values(insertData).returning();

    await createAuditLog({
      actorUserId: adminCtx.userId,
      eventType: AuditEventType.OC_RECORD_CREATED,
      resourceType: AuditResourceType.OC,
      resourceId: ocId,
      description: `Created dossier snapshot for ${ocId}`,
      metadata: { ocId, module: 'dossier-snapshot' },
      before: null,
      after: row,
      request: req,
      required: true,
    });

    return json.ok({ message: 'Dossier snapshot created successfully.', data: row });
  } catch (err) {
    return handleApiError(err);
  }
}

async function PUTHandler(req: NextRequest, { params }: { params: Promise<{ ocId: string }> }) {
  try {
    const adminCtx = await requireAuth(req);
    const { ocId } = await parseParam({ params }, OcIdParam);
    await ensureOcExists(ocId);

    let dto: any;
    let arrivalPhoto: File | null = null;
    let departurePhoto: File | null = null;

    const contentType = req.headers.get('content-type') || '';
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      dto = {
        tesNo: formData.get('tesNo') as string,
        name: formData.get('name') as string,
        course: formData.get('course') as string,
        pi: formData.get('pi') as string,
        dtOfArr: formData.get('dtOfArr') as string,
        relegated: formData.get('relegated') as string,
        withdrawnOn: formData.get('withdrawnOn') as string,
        dtOfPassingOut: formData.get('dtOfPassingOut') as string,
        icNo: formData.get('icNo') as string,
        orderOfMerit: formData.get('orderOfMerit') as string,
        regtArm: formData.get('regtArm') as string,
        postedAtt: formData.get('postedAtt') as string,
      };
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

    if (!existing) {
      throw new ApiError(404, 'Dossier snapshot not found.', 'not_found');
    }

    // Upload images if provided
    if (arrivalPhoto) {
      await uploadImage(ocId, arrivalPhoto, 'CIVIL_DRESS');
    }
    if (departurePhoto) {
      await uploadImage(ocId, departurePhoto, 'UNIFORM');
    }

    const updateData: any = {};
    if (dto.dtOfPassingOut !== undefined) updateData.passOutDate = dto.dtOfPassingOut ? new Date(dto.dtOfPassingOut) : null;
    if (dto.icNo !== undefined) updateData.icNo = dto.icNo;
    if (dto.orderOfMerit !== undefined) updateData.orderOfMerit = dto.orderOfMerit ? parseInt(dto.orderOfMerit) : null;
    if (dto.regtArm !== undefined) updateData.regimentOrArm = dto.regtArm;
    if (dto.postedAtt !== undefined) updateData.postedUnit = dto.postedAtt;

    const [row] = await db.update(ocCommissioning).set(updateData).where(eq(ocCommissioning.ocId, ocId)).returning();

    await createAuditLog({
      actorUserId: adminCtx.userId,
      eventType: AuditEventType.OC_RECORD_UPDATED,
      resourceType: AuditResourceType.OC,
      resourceId: ocId,
      description: `Updated dossier snapshot for ${ocId}`,
      metadata: { ocId, module: 'dossier-snapshot', changes: Object.keys(updateData) },
      before: existing,
      after: row,
      changedFields: Object.keys(updateData),
      request: req,
      required: true,
    });

    return json.ok({ message: 'Dossier snapshot updated successfully.', data: row });
  } catch (err) {
    return handleApiError(err);
  }
}

export const GET = withRouteLogging('GET', GETHandler);
export const POST = withRouteLogging('POST', POSTHandler);
export const PUT = withRouteLogging('PUT', PUTHandler);
export const PATCH = withRouteLogging('PATCH', PUTHandler);

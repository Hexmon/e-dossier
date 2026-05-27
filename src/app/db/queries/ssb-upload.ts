import { and, asc, eq, isNull, sql } from 'drizzle-orm';
import { db } from '@/app/db/client';
import { ocCadets, ocSsbReports } from '@/app/db/schema/training/oc';
import { courses } from '@/app/db/schema/training/courses';

export type SsbUploadRow = {
  ocId: string;
  ocNo: string;
  name: string;
  courseId: string;
  courseCode: string | null;
  courseTitle: string | null;
  fileName: string | null;
  sizeBytes: number | null;
  uploadedAt: Date | null;
};

const uploadSelect = {
  objectKey: ocSsbReports.ssbPdfObjectKey,
  fileName: ocSsbReports.ssbPdfFileName,
  contentType: ocSsbReports.ssbPdfContentType,
  sizeBytes: ocSsbReports.ssbPdfSizeBytes,
  passwordHash: ocSsbReports.ssbPdfPasswordHash,
  salt: ocSsbReports.ssbPdfSalt,
  iv: ocSsbReports.ssbPdfIv,
  authTag: ocSsbReports.ssbPdfAuthTag,
  uploadedAt: ocSsbReports.ssbPdfUploadedAt,
};

function isMissingSsbUploadColumn(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const current = error as { code?: unknown; cause?: unknown; message?: unknown };
  if (current.code === '42703') return true;
  if (current.cause && isMissingSsbUploadColumn(current.cause)) return true;
  const message = typeof current.message === 'string' ? current.message.toLowerCase() : '';
  return message.includes('ssb_pdf_') && message.includes('does not exist');
}

async function listCourseSsbUploadRowsWithoutUploadColumns(courseId: string): Promise<SsbUploadRow[]> {
  return db
    .select({
      ocId: ocCadets.id,
      ocNo: ocCadets.ocNo,
      name: ocCadets.name,
      courseId: ocCadets.courseId,
      courseCode: courses.code,
      courseTitle: courses.title,
      fileName: sql<null>`null`,
      sizeBytes: sql<null>`null`,
      uploadedAt: sql<null>`null`,
    })
    .from(ocCadets)
    .innerJoin(courses, eq(courses.id, ocCadets.courseId))
    .where(and(eq(ocCadets.courseId, courseId), isNull(ocCadets.deletedAt)))
    .orderBy(asc(ocCadets.ocNo), asc(ocCadets.name));
}

export async function listCourseSsbUploadRows(courseId: string): Promise<SsbUploadRow[]> {
  let rows: SsbUploadRow[];
  try {
    rows = await db
      .select({
        ocId: ocCadets.id,
        ocNo: ocCadets.ocNo,
        name: ocCadets.name,
        courseId: ocCadets.courseId,
        courseCode: courses.code,
        courseTitle: courses.title,
        fileName: ocSsbReports.ssbPdfFileName,
        sizeBytes: ocSsbReports.ssbPdfSizeBytes,
        uploadedAt: ocSsbReports.ssbPdfUploadedAt,
      })
      .from(ocCadets)
      .innerJoin(courses, eq(courses.id, ocCadets.courseId))
      .leftJoin(ocSsbReports, and(eq(ocSsbReports.ocId, ocCadets.id), isNull(ocSsbReports.deletedAt)))
      .where(and(eq(ocCadets.courseId, courseId), isNull(ocCadets.deletedAt)))
      .orderBy(asc(ocCadets.ocNo), asc(ocCadets.name));
  } catch (error) {
    if (!isMissingSsbUploadColumn(error)) throw error;
    rows = await listCourseSsbUploadRowsWithoutUploadColumns(courseId);
  }

  const byOc = new Map<string, SsbUploadRow>();
  for (const row of rows) {
    const current = byOc.get(row.ocId);
    if (!current || (!current.fileName && row.fileName)) byOc.set(row.ocId, row);
  }
  return Array.from(byOc.values());
}

export async function getOcSsbUploadSummary(ocId: string) {
  let row;
  try {
    [row] = await db
      .select({
        ocId: ocCadets.id,
        ocNo: ocCadets.ocNo,
        name: ocCadets.name,
        courseId: ocCadets.courseId,
        fileName: ocSsbReports.ssbPdfFileName,
        sizeBytes: ocSsbReports.ssbPdfSizeBytes,
        uploadedAt: ocSsbReports.ssbPdfUploadedAt,
      })
      .from(ocCadets)
      .leftJoin(ocSsbReports, and(eq(ocSsbReports.ocId, ocCadets.id), isNull(ocSsbReports.deletedAt)))
      .where(and(eq(ocCadets.id, ocId), isNull(ocCadets.deletedAt)))
      .limit(1);
  } catch (error) {
    if (!isMissingSsbUploadColumn(error)) throw error;
    [row] = await db
      .select({
        ocId: ocCadets.id,
        ocNo: ocCadets.ocNo,
        name: ocCadets.name,
        courseId: ocCadets.courseId,
        fileName: sql<null>`null`,
        sizeBytes: sql<null>`null`,
        uploadedAt: sql<null>`null`,
      })
      .from(ocCadets)
      .where(and(eq(ocCadets.id, ocId), isNull(ocCadets.deletedAt)))
      .limit(1);
  }
  return row ?? null;
}

export async function getOcSsbUpload(ocId: string) {
  const [row] = await db
    .select(uploadSelect)
    .from(ocSsbReports)
    .where(and(eq(ocSsbReports.ocId, ocId), isNull(ocSsbReports.deletedAt)))
    .limit(1);
  return row ?? null;
}

export async function saveOcSsbUpload(input: {
  ocId: string;
  objectKey: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  passwordHash: string;
  salt: string;
  iv: string;
  authTag: string;
  uploadedByUserId: string;
}) {
  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select({ id: ocSsbReports.id, oldObjectKey: ocSsbReports.ssbPdfObjectKey })
      .from(ocSsbReports)
      .where(and(eq(ocSsbReports.ocId, input.ocId), isNull(ocSsbReports.deletedAt)))
      .limit(1);

    const values = {
      ssbPdfObjectKey: input.objectKey,
      ssbPdfFileName: input.fileName,
      ssbPdfContentType: input.contentType,
      ssbPdfSizeBytes: input.sizeBytes,
      ssbPdfPasswordHash: input.passwordHash,
      ssbPdfPasswordAlgo: 'argon2id',
      ssbPdfSalt: input.salt,
      ssbPdfIv: input.iv,
      ssbPdfAuthTag: input.authTag,
      ssbPdfUploadedAt: new Date(),
      ssbPdfUploadedByUserId: input.uploadedByUserId,
    };

    if (existing) {
      const [saved] = await tx
        .update(ocSsbReports)
        .set(values)
        .where(eq(ocSsbReports.id, existing.id))
        .returning();
      return { saved, oldObjectKey: existing.oldObjectKey };
    }

    const [saved] = await tx
      .insert(ocSsbReports)
      .values({ ocId: input.ocId, ...values })
      .returning();
    return { saved, oldObjectKey: null };
  });
}

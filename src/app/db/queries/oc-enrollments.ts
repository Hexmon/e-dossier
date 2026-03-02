import { and, desc, eq, isNull, ne } from "drizzle-orm";
import { db } from "@/app/db/client";
import { ocCadets, ocCourseEnrollments, ocPreCommission } from "@/app/db/schema/training/oc";
import { ApiError } from "@/app/lib/http";

type DbLike = Pick<typeof db, "select" | "insert" | "update">;

export type OcEnrollmentStatus = "ACTIVE" | "ARCHIVED" | "VOIDED";
export type OcEnrollmentOrigin = "PROMOTION" | "TRANSFER" | "MANUAL" | "BASELINE";

export async function getEnrollmentById(id: string, tx: DbLike = db) {
  const [row] = await tx
    .select()
    .from(ocCourseEnrollments)
    .where(eq(ocCourseEnrollments.id, id))
    .limit(1);
  return row ?? null;
}

export async function getActiveEnrollment(ocId: string, tx: DbLike = db) {
  const [row] = await tx
    .select()
    .from(ocCourseEnrollments)
    .where(and(eq(ocCourseEnrollments.ocId, ocId), eq(ocCourseEnrollments.status, "ACTIVE")))
    .limit(1);
  return row ?? null;
}

export async function createBaselineEnrollmentForOc(
  ocId: string,
  tx: DbLike = db,
  actorUserId?: string | null,
) {
  const [ocRow] = await tx
    .select({
      ocId: ocCadets.id,
      courseId: ocCadets.courseId,
      createdAt: ocCadets.createdAt,
    })
    .from(ocCadets)
    .where(eq(ocCadets.id, ocId))
    .limit(1);

  if (!ocRow) throw new ApiError(404, "OC not found", "not_found");

  const now = new Date();
  const [created] = await tx
    .insert(ocCourseEnrollments)
    .values({
      ocId: ocRow.ocId,
      courseId: ocRow.courseId,
      status: "ACTIVE",
      origin: "BASELINE",
      startedOn: ocRow.createdAt ?? now,
      createdByUserId: actorUserId ?? null,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return created;
}

export async function getOrCreateActiveEnrollment(
  ocId: string,
  tx: DbLike = db,
  actorUserId?: string | null,
) {
  const existing = await getActiveEnrollment(ocId, tx);
  if (existing) return existing;
  return createBaselineEnrollmentForOc(ocId, tx, actorUserId);
}

export async function listEnrollmentsForOc(ocId: string, tx: DbLike = db) {
  return tx
    .select()
    .from(ocCourseEnrollments)
    .where(eq(ocCourseEnrollments.ocId, ocId))
    .orderBy(desc(ocCourseEnrollments.startedOn), desc(ocCourseEnrollments.createdAt));
}

export async function getPreviousArchivedEnrollment(
  ocId: string,
  excludedEnrollmentId?: string | null,
  tx: DbLike = db,
) {
  const wh = [eq(ocCourseEnrollments.ocId, ocId), eq(ocCourseEnrollments.status, "ARCHIVED")];
  if (excludedEnrollmentId) {
    wh.push(ne(ocCourseEnrollments.id, excludedEnrollmentId));
  }

  const [row] = await tx
    .select()
    .from(ocCourseEnrollments)
    .where(and(...wh))
    .orderBy(desc(ocCourseEnrollments.endedOn), desc(ocCourseEnrollments.updatedAt))
    .limit(1);

  return row ?? null;
}

export async function setEnrollmentStatus(
  enrollmentId: string,
  status: OcEnrollmentStatus,
  tx: DbLike = db,
  opts: {
    endedOn?: Date | null;
    reason?: string | null;
    note?: string | null;
    closedByUserId?: string | null;
  } = {},
) {
  const [row] = await tx
    .update(ocCourseEnrollments)
    .set({
      status,
      endedOn: opts.endedOn ?? null,
      reason: opts.reason ?? null,
      note: opts.note ?? null,
      closedByUserId: opts.closedByUserId ?? null,
      updatedAt: new Date(),
    })
    .where(eq(ocCourseEnrollments.id, enrollmentId))
    .returning();
  return row ?? null;
}

export async function createEnrollment(
  input: {
    ocId: string;
    courseId: string;
    status?: OcEnrollmentStatus;
    origin: OcEnrollmentOrigin;
    startedOn?: Date | null;
    reason?: string | null;
    note?: string | null;
    createdByUserId?: string | null;
  },
  tx: DbLike = db,
) {
  const now = new Date();
  const [row] = await tx
    .insert(ocCourseEnrollments)
    .values({
      ocId: input.ocId,
      courseId: input.courseId,
      status: input.status ?? "ACTIVE",
      origin: input.origin,
      startedOn: input.startedOn ?? now,
      reason: input.reason ?? null,
      note: input.note ?? null,
      createdByUserId: input.createdByUserId ?? null,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return row;
}

export async function syncOcCourseFromEnrollment(
  ocId: string,
  enrollmentCourseId: string,
  tx: DbLike = db,
  opts: {
    relegatedOn?: Date | null;
  } = {},
) {
  const now = new Date();
  const relegatedOn = opts.relegatedOn ?? now;

  await tx
    .update(ocCadets)
    .set({
      courseId: enrollmentCourseId,
      relegatedToCourseId: enrollmentCourseId,
      relegatedOn,
      updatedAt: now,
    })
    .where(eq(ocCadets.id, ocId));

  await tx
    .update(ocPreCommission)
    .set({
      courseId: enrollmentCourseId,
      relegatedToCourseId: enrollmentCourseId,
      relegatedOn,
    })
    .where(eq(ocPreCommission.ocId, ocId));
}

export async function getActiveEnrollmentCourse(ocId: string, tx: DbLike = db) {
  const active = await getOrCreateActiveEnrollment(ocId, tx);
  return {
    enrollmentId: active.id,
    courseId: active.courseId,
  };
}

export async function ensureEnrollmentVisibleToOc(
  enrollmentId: string,
  ocId: string,
  tx: DbLike = db,
) {
  const [row] = await tx
    .select({ id: ocCourseEnrollments.id })
    .from(ocCourseEnrollments)
    .where(and(eq(ocCourseEnrollments.id, enrollmentId), eq(ocCourseEnrollments.ocId, ocId)))
    .limit(1);
  if (!row) {
    throw new ApiError(404, "Enrollment not found for this OC", "not_found");
  }
}

export async function getEnrollmentForOcByCourse(
  ocId: string,
  courseId: string,
  tx: DbLike = db,
) {
  const [row] = await tx
    .select()
    .from(ocCourseEnrollments)
    .where(
      and(
        eq(ocCourseEnrollments.ocId, ocId),
        eq(ocCourseEnrollments.courseId, courseId),
        isNull(ocCourseEnrollments.endedOn),
      ),
    )
    .orderBy(desc(ocCourseEnrollments.createdAt))
    .limit(1);
  return row ?? null;
}

import { ApiError } from "@/app/lib/http";
import { db } from "@/app/db/client";
import { courses } from "@/app/db/schema/training/courses";
import { ocCadets, ocPreCommission } from "@/app/db/schema/training/oc";
import { ocRelegations } from "@/app/db/schema/training/ocRelegations";
import { and, asc, desc, eq, isNull } from "drizzle-orm";

export type RelegationOcOption = {
  ocId: string;
  ocNo: string;
  ocName: string;
  isActive: boolean;
  currentCourseId: string;
  currentCourseCode: string;
};

export type RelegationCourseOption = {
  courseId: string;
  courseCode: string;
  courseName: string;
};

export type ApplyOcRelegationTransferInput = {
  ocId: string;
  toCourseId: string;
  reason: string;
  remark?: string | null;
  pdfObjectKey?: string | null;
  pdfUrl?: string | null;
};

const COURSE_SEQUENCE_REGEX = /^([A-Za-z][A-Za-z0-9]*)-(\d+)$/;

export type ParsedCourseSequence = {
  prefix: string;
  number: number;
};

export function parseCourseSequence(courseCode: string): ParsedCourseSequence | null {
  const trimmed = courseCode.trim();
  const match = COURSE_SEQUENCE_REGEX.exec(trimmed);
  if (!match) return null;

  const number = Number(match[2]);
  if (!Number.isFinite(number)) return null;

  return {
    prefix: match[1].toUpperCase(),
    number,
  };
}

export function isImmediateNextCourseCode(currentCode: string, nextCode: string): boolean {
  const current = parseCourseSequence(currentCode);
  const next = parseCourseSequence(nextCode);

  if (!current || !next) return false;
  return current.prefix === next.prefix && next.number === current.number + 1;
}

type CourseLookupClient = Pick<typeof db, "select">;

function assertParsableCourseCode(code: string): ParsedCourseSequence {
  const parsed = parseCourseSequence(code);
  if (!parsed) {
    throw new ApiError(
      400,
      `Cannot determine newer course order for code '${code}'. Expected pattern PREFIX-NUMBER (example: TES-50).`,
      "bad_request"
    );
  }
  return parsed;
}

function toCourseOption(row: { id: string; code: string; title: string }): RelegationCourseOption {
  return {
    courseId: row.id,
    courseCode: row.code,
    courseName: row.title,
  };
}

async function getActiveCourseById(courseId: string, tx: CourseLookupClient = db) {
  const [course] = await tx
    .select({
      id: courses.id,
      code: courses.code,
      title: courses.title,
      deletedAt: courses.deletedAt,
    })
    .from(courses)
    .where(eq(courses.id, courseId))
    .limit(1);

  if (!course || course.deletedAt) {
    throw new ApiError(404, "Course not found", "not_found");
  }

  return course;
}

export async function listRelegationOcOptions(): Promise<RelegationOcOption[]> {
  const rows = await db
    .select({
      ocId: ocCadets.id,
      ocNo: ocCadets.ocNo,
      ocName: ocCadets.name,
      status: ocCadets.status,
      withdrawnOn: ocCadets.withdrawnOn,
      currentCourseId: courses.id,
      currentCourseCode: courses.code,
    })
    .from(ocCadets)
    .innerJoin(courses, eq(courses.id, ocCadets.courseId))
    .where(isNull(courses.deletedAt))
    .orderBy(asc(ocCadets.ocNo));

  return rows.map((row) => ({
    ocId: row.ocId,
    ocNo: row.ocNo,
    ocName: row.ocName,
    isActive: row.status === "ACTIVE" && row.withdrawnOn === null,
    currentCourseId: row.currentCourseId,
    currentCourseCode: row.currentCourseCode,
  }));
}

export async function listImmediateNextCourses(currentCourseId: string): Promise<RelegationCourseOption[]> {
  const currentCourse = await getActiveCourseById(currentCourseId);
  const currentSequence = assertParsableCourseCode(currentCourse.code);

  const candidateCourses = await db
    .select({
      id: courses.id,
      code: courses.code,
      title: courses.title,
    })
    .from(courses)
    .where(isNull(courses.deletedAt));

  const immediateNext = candidateCourses
    .filter((course) => {
      const parsed = parseCourseSequence(course.code);
      return (
        parsed !== null &&
        parsed.prefix === currentSequence.prefix &&
        parsed.number === currentSequence.number + 1
      );
    })
    .map(toCourseOption)
    .sort((a, b) => a.courseCode.localeCompare(b.courseCode));

  return immediateNext;
}

export async function applyOcRelegationTransfer(
  input: ApplyOcRelegationTransferInput,
  actorUserId: string
) {
  return db.transaction(async (tx) => {
    const [ocRow] = await tx
      .select({
        ocId: ocCadets.id,
        ocNo: ocCadets.ocNo,
        ocName: ocCadets.name,
        fromCourseId: ocCadets.courseId,
        fromCourseCode: courses.code,
        fromCourseName: courses.title,
      })
      .from(ocCadets)
      .innerJoin(courses, eq(courses.id, ocCadets.courseId))
      .where(and(eq(ocCadets.id, input.ocId), isNull(courses.deletedAt)))
      .limit(1);

    if (!ocRow) {
      throw new ApiError(404, "Officer Cadet not found", "not_found");
    }

    const fromSequence = assertParsableCourseCode(ocRow.fromCourseCode);

    const targetCourse = await getActiveCourseById(input.toCourseId, tx);
    const targetSequence = assertParsableCourseCode(targetCourse.code);

    const isImmediateNext =
      fromSequence.prefix === targetSequence.prefix &&
      targetSequence.number === fromSequence.number + 1;

    if (!isImmediateNext) {
      throw new ApiError(
        400,
        `Invalid transfer target. Only immediate next course is allowed from ${ocRow.fromCourseCode}.`,
        "bad_request"
      );
    }

    const now = new Date();

    const [history] = await tx
      .insert(ocRelegations)
      .values({
        ocId: ocRow.ocId,
        fromCourseId: ocRow.fromCourseId,
        fromCourseCode: ocRow.fromCourseCode,
        toCourseId: targetCourse.id,
        toCourseCode: targetCourse.code,
        reason: input.reason,
        remark: input.remark ?? null,
        pdfObjectKey: input.pdfObjectKey ?? null,
        pdfUrl: input.pdfUrl ?? null,
        performedByUserId: actorUserId,
        performedAt: now,
        createdAt: now,
        updatedAt: now,
      })
      .returning({
        id: ocRelegations.id,
        ocId: ocRelegations.ocId,
        fromCourseId: ocRelegations.fromCourseId,
        fromCourseCode: ocRelegations.fromCourseCode,
        toCourseId: ocRelegations.toCourseId,
        toCourseCode: ocRelegations.toCourseCode,
        reason: ocRelegations.reason,
        remark: ocRelegations.remark,
        pdfObjectKey: ocRelegations.pdfObjectKey,
        pdfUrl: ocRelegations.pdfUrl,
        performedByUserId: ocRelegations.performedByUserId,
        performedAt: ocRelegations.performedAt,
      });

    await tx
      .update(ocCadets)
      .set({
        courseId: targetCourse.id,
        relegatedToCourseId: targetCourse.id,
        relegatedOn: now,
        updatedAt: now,
      })
      .where(eq(ocCadets.id, ocRow.ocId));

    await tx
      .update(ocPreCommission)
      .set({
        courseId: targetCourse.id,
        relegatedToCourseId: targetCourse.id,
        relegatedOn: now,
      })
      .where(eq(ocPreCommission.ocId, ocRow.ocId));

    return {
      oc: {
        ocId: ocRow.ocId,
        ocNo: ocRow.ocNo,
        ocName: ocRow.ocName,
      },
      fromCourse: {
        courseId: ocRow.fromCourseId,
        courseCode: ocRow.fromCourseCode,
        courseName: ocRow.fromCourseName,
      },
      toCourse: toCourseOption({
        id: targetCourse.id,
        code: targetCourse.code,
        title: targetCourse.title,
      }),
      history,
    };
  });
}

export async function getOcRelegationHistory(ocId: string) {
  return db
    .select({
      id: ocRelegations.id,
      ocId: ocRelegations.ocId,
      fromCourseId: ocRelegations.fromCourseId,
      fromCourseCode: ocRelegations.fromCourseCode,
      toCourseId: ocRelegations.toCourseId,
      toCourseCode: ocRelegations.toCourseCode,
      reason: ocRelegations.reason,
      remark: ocRelegations.remark,
      pdfObjectKey: ocRelegations.pdfObjectKey,
      pdfUrl: ocRelegations.pdfUrl,
      performedByUserId: ocRelegations.performedByUserId,
      performedAt: ocRelegations.performedAt,
    })
    .from(ocRelegations)
    .where(eq(ocRelegations.ocId, ocId))
    .orderBy(desc(ocRelegations.performedAt));
}

import { ApiError } from "@/app/lib/http";
import { db } from "@/app/db/client";
import { courses } from "@/app/db/schema/training/courses";
import { ocCadets, ocPreCommission } from "@/app/db/schema/training/oc";
import { ocMovementKind, ocRelegations } from "@/app/db/schema/training/ocRelegations";
import { platoons } from "@/app/db/schema/auth/platoons";
import { and, asc, desc, eq, ilike, inArray, isNull, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

export type RelegationOcOption = {
  ocId: string;
  ocNo: string;
  ocName: string;
  status: string;
  isActive: boolean;
  platoonId: string | null;
  platoonKey: string | null;
  platoonName: string | null;
  currentCourseId: string;
  currentCourseCode: string;
};

export type RelegationCourseOption = {
  courseId: string;
  courseCode: string;
  courseName: string;
};

export type RelegationMovementKind = (typeof ocMovementKind.enumValues)[number];

export type ApplyOcRelegationTransferInput = {
  ocId: string;
  toCourseId: string;
  reason: string;
  remark?: string | null;
  pdfObjectKey?: string | null;
  pdfUrl?: string | null;
};

export type PromoteCourseBatchInput = {
  fromCourseId: string;
  toCourseId: string;
  excludeOcIds: string[];
  note?: string | null;
};

export type RelegationActorScope = {
  scopePlatoonId?: string | null;
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

function likeEscape(q: string) {
  return `%${q.replace(/[%_\\]/g, "\\$&")}%`;
}

function assertScopeAccess(scopePlatoonId: string | null | undefined, ocPlatoonId: string | null) {
  if (!scopePlatoonId) return;
  if (!ocPlatoonId || scopePlatoonId !== ocPlatoonId) {
    throw new ApiError(403, "Forbidden: OC is outside assigned platoon scope.", "forbidden");
  }
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

export async function listRelegationOcOptions(opts: {
  q?: string;
  courseId?: string;
  activeOnly?: boolean;
  scopePlatoonId?: string | null;
} = {}): Promise<RelegationOcOption[]> {
  const wh: any[] = [isNull(courses.deletedAt)];

  if (opts.courseId) wh.push(eq(ocCadets.courseId, opts.courseId));
  if (opts.activeOnly) wh.push(and(eq(ocCadets.status, "ACTIVE"), isNull(ocCadets.withdrawnOn)));
  if (opts.scopePlatoonId) wh.push(eq(ocCadets.platoonId, opts.scopePlatoonId));
  if (opts.q && opts.q.trim()) {
    const pattern = likeEscape(opts.q.trim());
    wh.push(or(ilike(ocCadets.ocNo, pattern), ilike(ocCadets.name, pattern)));
  }

  const rows = await db
    .select({
      ocId: ocCadets.id,
      ocNo: ocCadets.ocNo,
      ocName: ocCadets.name,
      status: ocCadets.status,
      withdrawnOn: ocCadets.withdrawnOn,
      platoonId: ocCadets.platoonId,
      platoonKey: platoons.key,
      platoonName: platoons.name,
      currentCourseId: courses.id,
      currentCourseCode: courses.code,
    })
    .from(ocCadets)
    .innerJoin(courses, eq(courses.id, ocCadets.courseId))
    .leftJoin(platoons, eq(platoons.id, ocCadets.platoonId))
    .where(and(...wh))
    .orderBy(asc(ocCadets.ocNo));

  return rows.map((row) => ({
    ocId: row.ocId,
    ocNo: row.ocNo,
    ocName: row.ocName,
    status: row.status,
    isActive: row.status === "ACTIVE" && row.withdrawnOn === null,
    platoonId: row.platoonId,
    platoonKey: row.platoonKey,
    platoonName: row.platoonName,
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

async function getScopedOcForMove(
  tx: any,
  ocId: string,
  scopePlatoonId?: string | null
) {
  const [ocRow] = await tx
    .select({
      ocId: ocCadets.id,
      ocNo: ocCadets.ocNo,
      ocName: ocCadets.name,
      platoonId: ocCadets.platoonId,
      fromCourseId: ocCadets.courseId,
      fromCourseCode: courses.code,
      fromCourseName: courses.title,
    })
    .from(ocCadets)
    .innerJoin(courses, eq(courses.id, ocCadets.courseId))
    .where(and(eq(ocCadets.id, ocId), isNull(courses.deletedAt)))
    .limit(1);

  if (!ocRow) {
    throw new ApiError(404, "Officer Cadet not found", "not_found");
  }

  assertScopeAccess(scopePlatoonId, ocRow.platoonId);
  return ocRow;
}

function ensureImmediateNext(fromCode: string, toCode: string) {
  const fromSequence = assertParsableCourseCode(fromCode);
  const toSequence = assertParsableCourseCode(toCode);

  const isImmediateNext =
    fromSequence.prefix === toSequence.prefix &&
    toSequence.number === fromSequence.number + 1;

  if (!isImmediateNext) {
    throw new ApiError(
      400,
      `Invalid transfer target. Only immediate next course is allowed from ${fromCode}.`,
      "bad_request"
    );
  }
}

export async function applyOcRelegationTransfer(
  input: ApplyOcRelegationTransferInput,
  actorUserId: string,
  scope: RelegationActorScope = {}
) {
  return db.transaction(async (tx) => {
    const ocRow = await getScopedOcForMove(tx, input.ocId, scope.scopePlatoonId ?? null);
    const targetCourse = await getActiveCourseById(input.toCourseId, tx);

    ensureImmediateNext(ocRow.fromCourseCode, targetCourse.code);

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
        movementKind: "TRANSFER",
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
        movementKind: ocRelegations.movementKind,
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

export async function recordPromotionException(
  input: ApplyOcRelegationTransferInput,
  actorUserId: string,
  scope: RelegationActorScope = {}
) {
  return db.transaction(async (tx) => {
    const ocRow = await getScopedOcForMove(tx, input.ocId, scope.scopePlatoonId ?? null);
    const targetCourse = await getActiveCourseById(input.toCourseId, tx);

    ensureImmediateNext(ocRow.fromCourseCode, targetCourse.code);

    const [existing] = await tx
      .select({ id: ocRelegations.id })
      .from(ocRelegations)
      .where(
        and(
          eq(ocRelegations.ocId, ocRow.ocId),
          eq(ocRelegations.fromCourseId, ocRow.fromCourseId),
          eq(ocRelegations.toCourseId, targetCourse.id),
          eq(ocRelegations.movementKind, "PROMOTION_EXCEPTION")
        )
      )
      .limit(1);

    if (existing) {
      throw new ApiError(
        409,
        "Promotion exception already recorded for this OC and target course.",
        "conflict"
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
        movementKind: "PROMOTION_EXCEPTION",
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
        movementKind: ocRelegations.movementKind,
        performedByUserId: ocRelegations.performedByUserId,
        performedAt: ocRelegations.performedAt,
      });

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

export async function promoteCourseBatch(input: PromoteCourseBatchInput, actorUserId: string) {
  return db.transaction(async (tx) => {
    const fromCourse = await getActiveCourseById(input.fromCourseId, tx);
    const toCourse = await getActiveCourseById(input.toCourseId, tx);

    ensureImmediateNext(fromCourse.code, toCourse.code);

    const candidates = await tx
      .select({
        ocId: ocCadets.id,
        ocNo: ocCadets.ocNo,
      })
      .from(ocCadets)
      .where(
        and(
          eq(ocCadets.courseId, fromCourse.id),
          eq(ocCadets.status, "ACTIVE"),
          isNull(ocCadets.withdrawnOn)
        )
      )
      .orderBy(asc(ocCadets.ocNo));

    const ocIds = candidates.map((row) => row.ocId);
    if (ocIds.length === 0) {
      return {
        fromCourse: toCourseOption(fromCourse),
        toCourse: toCourseOption(toCourse),
        summary: {
          totalEligible: 0,
          excludedByRequest: 0,
          excludedByException: 0,
          promoted: 0,
        },
        promotedOcIds: [] as string[],
      };
    }

    const [exceptionRows, excludeSet] = await Promise.all([
      tx
        .select({ ocId: ocRelegations.ocId })
        .from(ocRelegations)
        .where(
          and(
            inArray(ocRelegations.ocId, ocIds),
            eq(ocRelegations.fromCourseId, fromCourse.id),
            eq(ocRelegations.toCourseId, toCourse.id),
            eq(ocRelegations.movementKind, "PROMOTION_EXCEPTION")
          )
        ),
      new Set(input.excludeOcIds ?? []),
    ]);

    const exceptionSet = new Set(exceptionRows.map((row) => row.ocId));

    const promotableOcIds = ocIds.filter((ocId) => !excludeSet.has(ocId) && !exceptionSet.has(ocId));

    const now = new Date();

    if (promotableOcIds.length > 0) {
      await tx
        .update(ocCadets)
        .set({
          courseId: toCourse.id,
          relegatedToCourseId: toCourse.id,
          relegatedOn: now,
          updatedAt: now,
        })
        .where(inArray(ocCadets.id, promotableOcIds));

      await tx
        .update(ocPreCommission)
        .set({
          courseId: toCourse.id,
          relegatedToCourseId: toCourse.id,
          relegatedOn: now,
        })
        .where(inArray(ocPreCommission.ocId, promotableOcIds));

      await tx.insert(ocRelegations).values(
        promotableOcIds.map((ocId) => ({
          ocId,
          fromCourseId: fromCourse.id,
          fromCourseCode: fromCourse.code,
          toCourseId: toCourse.id,
          toCourseCode: toCourse.code,
          reason: `Promoted via course batch from ${fromCourse.code} to ${toCourse.code}`,
          remark: input.note?.trim() ? input.note.trim() : null,
          movementKind: "PROMOTION_BATCH" as const,
          performedByUserId: actorUserId,
          performedAt: now,
          createdAt: now,
          updatedAt: now,
        }))
      );
    }

    return {
      fromCourse: toCourseOption(fromCourse),
      toCourse: toCourseOption(toCourse),
      summary: {
        totalEligible: ocIds.length,
        excludedByRequest: ocIds.filter((id) => excludeSet.has(id)).length,
        excludedByException: ocIds.filter((id) => exceptionSet.has(id)).length,
        promoted: promotableOcIds.length,
      },
      promotedOcIds: promotableOcIds,
    };
  });
}

export type RelegationHistoryRow = {
  id: string;
  movementKind: RelegationMovementKind;
  ocId: string;
  ocNo: string;
  ocName: string;
  platoonId: string | null;
  platoonKey: string | null;
  platoonName: string | null;
  fromCourseId: string;
  fromCourseCode: string;
  fromCourseName: string | null;
  toCourseId: string;
  toCourseCode: string;
  toCourseName: string | null;
  reason: string;
  remark: string | null;
  hasMedia: boolean;
  performedByUserId: string;
  performedAt: Date;
};

export async function listRelegationHistory(opts: {
  q?: string;
  courseFromId?: string;
  courseToId?: string;
  movementKind?: RelegationMovementKind;
  limit?: number;
  offset?: number;
  scopePlatoonId?: string | null;
} = {}) {
  const limit = Math.min(opts.limit ?? 25, 100);
  const offset = Math.max(opts.offset ?? 0, 0);
  const toCourses = alias(courses, "to_course");

  const wh: any[] = [];
  if (opts.courseFromId) wh.push(eq(ocRelegations.fromCourseId, opts.courseFromId));
  if (opts.courseToId) wh.push(eq(ocRelegations.toCourseId, opts.courseToId));
  if (opts.movementKind) wh.push(eq(ocRelegations.movementKind, opts.movementKind));
  if (opts.scopePlatoonId) wh.push(eq(ocCadets.platoonId, opts.scopePlatoonId));
  if (opts.q && opts.q.trim()) {
    const pattern = likeEscape(opts.q.trim());
    wh.push(
      or(
        ilike(ocCadets.ocNo, pattern),
        ilike(ocCadets.name, pattern),
        ilike(ocRelegations.reason, pattern),
        ilike(sql`COALESCE(${ocRelegations.remark}, '')`, pattern)
      )
    );
  }

  const whereClause = wh.length ? and(...wh) : undefined;

  const [items, totalRows] = await Promise.all([
    db
      .select({
        id: ocRelegations.id,
        movementKind: ocRelegations.movementKind,
        ocId: ocRelegations.ocId,
        ocNo: ocCadets.ocNo,
        ocName: ocCadets.name,
        platoonId: ocCadets.platoonId,
        platoonKey: platoons.key,
        platoonName: platoons.name,
        fromCourseId: ocRelegations.fromCourseId,
        fromCourseCode: ocRelegations.fromCourseCode,
        fromCourseName: courses.title,
        toCourseId: ocRelegations.toCourseId,
        toCourseCode: ocRelegations.toCourseCode,
        toCourseName: toCourses.title,
        reason: ocRelegations.reason,
        remark: ocRelegations.remark,
        pdfObjectKey: ocRelegations.pdfObjectKey,
        pdfUrl: ocRelegations.pdfUrl,
        performedByUserId: ocRelegations.performedByUserId,
        performedAt: ocRelegations.performedAt,
      })
      .from(ocRelegations)
      .innerJoin(ocCadets, eq(ocCadets.id, ocRelegations.ocId))
      .leftJoin(platoons, eq(platoons.id, ocCadets.platoonId))
      .leftJoin(courses, eq(courses.id, ocRelegations.fromCourseId))
      .leftJoin(toCourses, eq(toCourses.id, ocRelegations.toCourseId))
      .where(whereClause)
      .orderBy(desc(ocRelegations.performedAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ total: sql<number>`count(*)::int` })
      .from(ocRelegations)
      .innerJoin(ocCadets, eq(ocCadets.id, ocRelegations.ocId))
      .where(whereClause),
  ]);

  const normalized: RelegationHistoryRow[] = items.map((row) => ({
    id: row.id,
    movementKind: row.movementKind,
    ocId: row.ocId,
    ocNo: row.ocNo,
    ocName: row.ocName,
    platoonId: row.platoonId,
    platoonKey: row.platoonKey,
    platoonName: row.platoonName,
    fromCourseId: row.fromCourseId,
    fromCourseCode: row.fromCourseCode,
    fromCourseName: row.fromCourseName,
    toCourseId: row.toCourseId,
    toCourseCode: row.toCourseCode,
    toCourseName: row.toCourseName,
    reason: row.reason,
    remark: row.remark,
    hasMedia: Boolean(row.pdfObjectKey || row.pdfUrl),
    performedByUserId: row.performedByUserId,
    performedAt: row.performedAt,
  }));

  return {
    items: normalized,
    total: totalRows[0]?.total ?? 0,
    limit,
    offset,
  };
}

export async function getRelegationMediaReference(historyId: string, scopePlatoonId?: string | null) {
  const [row] = await db
    .select({
      id: ocRelegations.id,
      pdfObjectKey: ocRelegations.pdfObjectKey,
      pdfUrl: ocRelegations.pdfUrl,
      ocPlatoonId: ocCadets.platoonId,
    })
    .from(ocRelegations)
    .innerJoin(ocCadets, eq(ocCadets.id, ocRelegations.ocId))
    .where(eq(ocRelegations.id, historyId))
    .limit(1);

  if (!row) {
    throw new ApiError(404, "Relegation history record not found", "not_found");
  }

  assertScopeAccess(scopePlatoonId, row.ocPlatoonId);

  if (!row.pdfObjectKey && !row.pdfUrl) {
    throw new ApiError(404, "No media attached to this history record", "not_found");
  }

  return {
    historyId: row.id,
    pdfObjectKey: row.pdfObjectKey,
    pdfUrl: row.pdfUrl,
  };
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
      movementKind: ocRelegations.movementKind,
      performedByUserId: ocRelegations.performedByUserId,
      performedAt: ocRelegations.performedAt,
    })
    .from(ocRelegations)
    .where(eq(ocRelegations.ocId, ocId))
    .orderBy(desc(ocRelegations.performedAt));
}

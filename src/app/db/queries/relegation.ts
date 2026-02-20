import { ApiError } from "@/app/lib/http";
import { db } from "@/app/db/client";
import { courses } from "@/app/db/schema/training/courses";
import {
  ocCadets,
  ocCourseEnrollments,
  ocSemesterMarks,
  ocOlq,
  ocCreditForExcellence,
  ocSprRecords,
  ocDiscipline,
  ocMotivationAwards,
  ocSportsAndGames,
  ocWeaponTraining,
  ocObstacleTraining,
  ocSpeedMarch,
  ocDrill,
  ocCamps,
  ocClubs,
  ocRecordingLeaveHikeDetention,
  ocCounselling,
} from "@/app/db/schema/training/oc";
import { ocMovementKind, ocRelegations } from "@/app/db/schema/training/ocRelegations";
import { platoons } from "@/app/db/schema/auth/platoons";
import { and, asc, desc, eq, ilike, inArray, isNull, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import {
  createEnrollment,
  getOrCreateActiveEnrollment,
  getPreviousArchivedEnrollment,
  setEnrollmentStatus,
  syncOcCourseFromEnrollment,
} from "@/app/db/queries/oc-enrollments";
import { ocPtMotivationAwards, ocPtTaskScores } from "@/app/db/schema/training/physicalTrainingOc";
import { ocInterviews } from "@/app/db/schema/training/interviewOc";

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

export type VoidPromotionInput = {
  ocId: string;
  reason: string;
  remark?: string | null;
  pdfObjectKey?: string | null;
  pdfUrl?: string | null;
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
  const activeEnrollment = await getOrCreateActiveEnrollment(ocId, tx);

  if (activeEnrollment.courseId !== ocRow.fromCourseId) {
    await syncOcCourseFromEnrollment(ocId, activeEnrollment.courseId, tx);
    const [synced] = await tx
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

    if (!synced) {
      throw new ApiError(404, "Officer Cadet not found", "not_found");
    }

    return {
      ...synced,
      activeEnrollment,
    };
  }

  return {
    ...ocRow,
    activeEnrollment,
  };
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
    const archivedEnrollment = await setEnrollmentStatus(ocRow.activeEnrollment.id, "ARCHIVED", tx, {
      endedOn: now,
      reason: input.reason,
      note: input.remark ?? null,
      closedByUserId: actorUserId,
    });

    if (!archivedEnrollment) {
      throw new ApiError(500, "Failed to archive existing enrollment", "internal_error");
    }

    const newEnrollment = await createEnrollment(
      {
        ocId: ocRow.ocId,
        courseId: targetCourse.id,
        origin: "TRANSFER",
        startedOn: now,
        reason: input.reason,
        note: input.remark ?? null,
        createdByUserId: actorUserId,
      },
      tx
    );

    await syncOcCourseFromEnrollment(ocRow.ocId, targetCourse.id, tx, { relegatedOn: now });

    const [history] = await tx
      .insert(ocRelegations)
      .values({
        ocId: ocRow.ocId,
        fromCourseId: ocRow.fromCourseId,
        fromEnrollmentId: archivedEnrollment.id,
        fromCourseCode: ocRow.fromCourseCode,
        toCourseId: targetCourse.id,
        toEnrollmentId: newEnrollment.id,
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
        fromEnrollmentId: ocRow.activeEnrollment.id,
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
    const historyRows: Array<typeof ocRelegations.$inferInsert> = [];

    if (promotableOcIds.length > 0) {
      const activeEnrollments = await tx
        .select({
          id: ocCourseEnrollments.id,
          ocId: ocCourseEnrollments.ocId,
          courseId: ocCourseEnrollments.courseId,
        })
        .from(ocCourseEnrollments)
        .where(
          and(
            inArray(ocCourseEnrollments.ocId, promotableOcIds),
            eq(ocCourseEnrollments.status, "ACTIVE")
          )
        );

      const activeEnrollmentByOc = new Map(activeEnrollments.map((row) => [row.ocId, row]));

      for (const ocId of promotableOcIds) {
        const activeEnrollment =
          activeEnrollmentByOc.get(ocId) ?? (await getOrCreateActiveEnrollment(ocId, tx, actorUserId));

        if (activeEnrollment.courseId !== fromCourse.id) {
          continue;
        }

        const archivedEnrollment = await setEnrollmentStatus(activeEnrollment.id, "ARCHIVED", tx, {
          endedOn: now,
          reason: `Promoted from ${fromCourse.code} to ${toCourse.code}`,
          note: input.note?.trim() ? input.note.trim() : null,
          closedByUserId: actorUserId,
        });

        if (!archivedEnrollment) continue;

        const promotedEnrollment = await createEnrollment(
          {
            ocId,
            courseId: toCourse.id,
            origin: "PROMOTION",
            startedOn: now,
            reason: `Promoted from ${fromCourse.code} to ${toCourse.code}`,
            note: input.note?.trim() ? input.note.trim() : null,
            createdByUserId: actorUserId,
          },
          tx
        );

        await syncOcCourseFromEnrollment(ocId, toCourse.id, tx, { relegatedOn: now });

        historyRows.push({
          ocId,
          fromCourseId: fromCourse.id,
          fromEnrollmentId: archivedEnrollment.id,
          fromCourseCode: fromCourse.code,
          toCourseId: toCourse.id,
          toEnrollmentId: promotedEnrollment.id,
          toCourseCode: toCourse.code,
          reason: `Promoted via course batch from ${fromCourse.code} to ${toCourse.code}`,
          remark: input.note?.trim() ? input.note.trim() : null,
          movementKind: "PROMOTION_BATCH",
          performedByUserId: actorUserId,
          performedAt: now,
          createdAt: now,
          updatedAt: now,
        });
      }

      if (historyRows.length) {
        await tx.insert(ocRelegations).values(historyRows);
      }
    }

    return {
      fromCourse: toCourseOption(fromCourse),
      toCourse: toCourseOption(toCourse),
      summary: {
        totalEligible: ocIds.length,
        excludedByRequest: ocIds.filter((id) => excludeSet.has(id)).length,
        excludedByException: ocIds.filter((id) => exceptionSet.has(id)).length,
        promoted: historyRows.length,
      },
      promotedOcIds: promotableOcIds,
    };
  });
}

export async function voidPromotionForOc(
  input: VoidPromotionInput,
  actorUserId: string,
  scope: RelegationActorScope = {}
) {
  return db.transaction(async (tx) => {
    const ocRow = await getScopedOcForMove(tx, input.ocId, scope.scopePlatoonId ?? null);
    const activeEnrollment = ocRow.activeEnrollment;

    if (activeEnrollment.status !== "ACTIVE") {
      throw new ApiError(409, "No active enrollment available for this OC", "conflict");
    }

    if (activeEnrollment.origin !== "PROMOTION") {
      throw new ApiError(
        409,
        "Active enrollment is not a promoted enrollment. Void promotion is not applicable.",
        "conflict"
      );
    }

    const previousEnrollment = await getPreviousArchivedEnrollment(ocRow.ocId, activeEnrollment.id, tx);
    if (!previousEnrollment) {
      throw new ApiError(
        409,
        "No archived enrollment is available to reactivate for this OC.",
        "conflict"
      );
    }

    const [toCourse] = await tx
      .select({ id: courses.id, code: courses.code, title: courses.title })
      .from(courses)
      .where(eq(courses.id, previousEnrollment.courseId))
      .limit(1);

    if (!toCourse) {
      throw new ApiError(404, "Target rollback course not found", "not_found");
    }

    const now = new Date();
    await setEnrollmentStatus(activeEnrollment.id, "VOIDED", tx, {
      endedOn: now,
      reason: input.reason,
      note: input.remark ?? null,
      closedByUserId: actorUserId,
    });

    await tx
      .update(ocCourseEnrollments)
      .set({
        status: "ACTIVE",
        endedOn: null,
        updatedAt: now,
      })
      .where(eq(ocCourseEnrollments.id, previousEnrollment.id));

    await syncOcCourseFromEnrollment(ocRow.ocId, previousEnrollment.courseId, tx, { relegatedOn: now });

    const [reversalOf] = await tx
      .select({ id: ocRelegations.id })
      .from(ocRelegations)
      .where(and(eq(ocRelegations.ocId, ocRow.ocId), eq(ocRelegations.toEnrollmentId, activeEnrollment.id)))
      .orderBy(desc(ocRelegations.performedAt))
      .limit(1);

    const [history] = await tx
      .insert(ocRelegations)
      .values({
        ocId: ocRow.ocId,
        fromCourseId: activeEnrollment.courseId,
        fromEnrollmentId: activeEnrollment.id,
        fromCourseCode: ocRow.fromCourseCode,
        toCourseId: previousEnrollment.courseId,
        toEnrollmentId: previousEnrollment.id,
        toCourseCode: toCourse.code,
        reason: input.reason,
        remark: input.remark ?? null,
        pdfObjectKey: input.pdfObjectKey ?? null,
        pdfUrl: input.pdfUrl ?? null,
        movementKind: "VOID_PROMOTION",
        reversalOfId: reversalOf?.id ?? null,
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
      toCourse: toCourseOption(toCourse),
      history,
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

async function assertOcScopeAndExistence(ocId: string, scopePlatoonId?: string | null) {
  const [ocRow] = await db
    .select({
      ocId: ocCadets.id,
      ocNo: ocCadets.ocNo,
      ocName: ocCadets.name,
      platoonId: ocCadets.platoonId,
    })
    .from(ocCadets)
    .where(eq(ocCadets.id, ocId))
    .limit(1);

  if (!ocRow) {
    throw new ApiError(404, "Officer Cadet not found", "not_found");
  }

  assertScopeAccess(scopePlatoonId, ocRow.platoonId);
  return ocRow;
}

export type RelegationEnrollmentTimelineRow = {
  id: string;
  ocId: string;
  courseId: string;
  courseCode: string;
  courseName: string;
  status: "ACTIVE" | "ARCHIVED" | "VOIDED";
  origin: "PROMOTION" | "TRANSFER" | "MANUAL" | "BASELINE";
  startedOn: Date;
  endedOn: Date | null;
  reason: string | null;
  note: string | null;
  createdByUserId: string | null;
  closedByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export async function listOcEnrollmentTimeline(ocId: string, scopePlatoonId?: string | null) {
  await assertOcScopeAndExistence(ocId, scopePlatoonId);

  const rows = await db
    .select({
      id: ocCourseEnrollments.id,
      ocId: ocCourseEnrollments.ocId,
      courseId: ocCourseEnrollments.courseId,
      courseCode: courses.code,
      courseName: courses.title,
      status: ocCourseEnrollments.status,
      origin: ocCourseEnrollments.origin,
      startedOn: ocCourseEnrollments.startedOn,
      endedOn: ocCourseEnrollments.endedOn,
      reason: ocCourseEnrollments.reason,
      note: ocCourseEnrollments.note,
      createdByUserId: ocCourseEnrollments.createdByUserId,
      closedByUserId: ocCourseEnrollments.closedByUserId,
      createdAt: ocCourseEnrollments.createdAt,
      updatedAt: ocCourseEnrollments.updatedAt,
    })
    .from(ocCourseEnrollments)
    .innerJoin(courses, eq(courses.id, ocCourseEnrollments.courseId))
    .where(eq(ocCourseEnrollments.ocId, ocId))
    .orderBy(desc(ocCourseEnrollments.startedOn), desc(ocCourseEnrollments.createdAt));

  return rows as RelegationEnrollmentTimelineRow[];
}

export type EnrollmentModuleKey =
  | "academics"
  | "olq"
  | "interviews"
  | "pt_scores"
  | "pt_motivation"
  | "spr"
  | "sports_games"
  | "motivation_awards"
  | "weapon_training"
  | "obstacle_training"
  | "speed_march"
  | "drill"
  | "camps"
  | "discipline"
  | "clubs"
  | "leave_hike_detention"
  | "counselling"
  | "cfe";

export async function getEnrollmentModuleDataset(opts: {
  ocId: string;
  enrollmentId: string;
  module: EnrollmentModuleKey;
  semester?: number;
  scopePlatoonId?: string | null;
}) {
  await assertOcScopeAndExistence(opts.ocId, opts.scopePlatoonId);

  const [enrollment] = await db
    .select({ id: ocCourseEnrollments.id })
    .from(ocCourseEnrollments)
    .where(and(eq(ocCourseEnrollments.id, opts.enrollmentId), eq(ocCourseEnrollments.ocId, opts.ocId)))
    .limit(1);

  if (!enrollment) {
    throw new ApiError(404, "Enrollment not found for this OC", "not_found");
  }

  const semester = opts.semester;

  switch (opts.module) {
    case "academics":
      return db
        .select()
        .from(ocSemesterMarks)
        .where(
          and(
            eq(ocSemesterMarks.ocId, opts.ocId),
            eq(ocSemesterMarks.enrollmentId, opts.enrollmentId),
            semester !== undefined ? eq(ocSemesterMarks.semester, semester) : undefined
          )
        )
        .orderBy(asc(ocSemesterMarks.semester));
    case "olq":
      return db
        .select()
        .from(ocOlq)
        .where(
          and(
            eq(ocOlq.ocId, opts.ocId),
            eq(ocOlq.enrollmentId, opts.enrollmentId),
            semester !== undefined ? eq(ocOlq.semester, semester) : undefined
          )
        )
        .orderBy(asc(ocOlq.semester));
    case "interviews":
      return db
        .select()
        .from(ocInterviews)
        .where(
          and(
            eq(ocInterviews.ocId, opts.ocId),
            eq(ocInterviews.enrollmentId, opts.enrollmentId),
            semester !== undefined ? eq(ocInterviews.semester, semester) : undefined
          )
        )
        .orderBy(asc(ocInterviews.createdAt));
    case "pt_scores":
      return db
        .select()
        .from(ocPtTaskScores)
        .where(
          and(
            eq(ocPtTaskScores.ocId, opts.ocId),
            eq(ocPtTaskScores.enrollmentId, opts.enrollmentId),
            semester !== undefined ? eq(ocPtTaskScores.semester, semester) : undefined
          )
        )
        .orderBy(asc(ocPtTaskScores.semester), asc(ocPtTaskScores.createdAt));
    case "pt_motivation":
      return db
        .select()
        .from(ocPtMotivationAwards)
        .where(
          and(
            eq(ocPtMotivationAwards.ocId, opts.ocId),
            eq(ocPtMotivationAwards.enrollmentId, opts.enrollmentId),
            semester !== undefined ? eq(ocPtMotivationAwards.semester, semester) : undefined
          )
        )
        .orderBy(asc(ocPtMotivationAwards.semester), asc(ocPtMotivationAwards.createdAt));
    case "spr":
      return db
        .select()
        .from(ocSprRecords)
        .where(
          and(
            eq(ocSprRecords.ocId, opts.ocId),
            eq(ocSprRecords.enrollmentId, opts.enrollmentId),
            semester !== undefined ? eq(ocSprRecords.semester, semester) : undefined
          )
        )
        .orderBy(asc(ocSprRecords.semester));
    case "sports_games":
      return db
        .select()
        .from(ocSportsAndGames)
        .where(
          and(
            eq(ocSportsAndGames.ocId, opts.ocId),
            eq(ocSportsAndGames.enrollmentId, opts.enrollmentId),
            semester !== undefined ? eq(ocSportsAndGames.semester, semester) : undefined
          )
        )
        .orderBy(asc(ocSportsAndGames.semester), asc(ocSportsAndGames.id));
    case "motivation_awards":
      return db
        .select()
        .from(ocMotivationAwards)
        .where(
          and(
            eq(ocMotivationAwards.ocId, opts.ocId),
            eq(ocMotivationAwards.enrollmentId, opts.enrollmentId),
            semester !== undefined ? eq(ocMotivationAwards.semester, semester) : undefined
          )
        )
        .orderBy(asc(ocMotivationAwards.semester), asc(ocMotivationAwards.id));
    case "weapon_training":
      return db
        .select()
        .from(ocWeaponTraining)
        .where(
          and(
            eq(ocWeaponTraining.ocId, opts.ocId),
            eq(ocWeaponTraining.enrollmentId, opts.enrollmentId),
            semester !== undefined ? eq(ocWeaponTraining.semester, semester) : undefined
          )
        )
        .orderBy(asc(ocWeaponTraining.semester), asc(ocWeaponTraining.id));
    case "obstacle_training":
      return db
        .select()
        .from(ocObstacleTraining)
        .where(
          and(
            eq(ocObstacleTraining.ocId, opts.ocId),
            eq(ocObstacleTraining.enrollmentId, opts.enrollmentId),
            semester !== undefined ? eq(ocObstacleTraining.semester, semester) : undefined
          )
        )
        .orderBy(asc(ocObstacleTraining.semester), asc(ocObstacleTraining.id));
    case "speed_march":
      return db
        .select()
        .from(ocSpeedMarch)
        .where(
          and(
            eq(ocSpeedMarch.ocId, opts.ocId),
            eq(ocSpeedMarch.enrollmentId, opts.enrollmentId),
            semester !== undefined ? eq(ocSpeedMarch.semester, semester) : undefined
          )
        )
        .orderBy(asc(ocSpeedMarch.semester), asc(ocSpeedMarch.id));
    case "drill":
      return db
        .select()
        .from(ocDrill)
        .where(
          and(
            eq(ocDrill.ocId, opts.ocId),
            eq(ocDrill.enrollmentId, opts.enrollmentId),
            semester !== undefined ? eq(ocDrill.semester, semester) : undefined
          )
        )
        .orderBy(asc(ocDrill.semester), asc(ocDrill.id));
    case "camps":
      return db
        .select()
        .from(ocCamps)
        .where(and(eq(ocCamps.ocId, opts.ocId), eq(ocCamps.enrollmentId, opts.enrollmentId)))
        .orderBy(desc(ocCamps.createdAt));
    case "discipline":
      return db
        .select()
        .from(ocDiscipline)
        .where(
          and(
            eq(ocDiscipline.ocId, opts.ocId),
            eq(ocDiscipline.enrollmentId, opts.enrollmentId),
            semester !== undefined ? eq(ocDiscipline.semester, semester) : undefined
          )
        )
        .orderBy(desc(ocDiscipline.dateOfOffence));
    case "clubs":
      return db
        .select()
        .from(ocClubs)
        .where(
          and(
            eq(ocClubs.ocId, opts.ocId),
            eq(ocClubs.enrollmentId, opts.enrollmentId),
            semester !== undefined ? eq(ocClubs.semester, semester) : undefined
          )
        )
        .orderBy(asc(ocClubs.semester), asc(ocClubs.id));
    case "leave_hike_detention":
      return db
        .select()
        .from(ocRecordingLeaveHikeDetention)
        .where(
          and(
            eq(ocRecordingLeaveHikeDetention.ocId, opts.ocId),
            eq(ocRecordingLeaveHikeDetention.enrollmentId, opts.enrollmentId),
            semester !== undefined ? eq(ocRecordingLeaveHikeDetention.semester, semester) : undefined
          )
        )
        .orderBy(desc(ocRecordingLeaveHikeDetention.dateFrom));
    case "counselling":
      return db
        .select()
        .from(ocCounselling)
        .where(
          and(
            eq(ocCounselling.ocId, opts.ocId),
            eq(ocCounselling.enrollmentId, opts.enrollmentId),
            semester !== undefined ? eq(ocCounselling.semester, semester) : undefined
          )
        )
        .orderBy(desc(ocCounselling.date));
    case "cfe":
      return db
        .select()
        .from(ocCreditForExcellence)
        .where(
          and(
            eq(ocCreditForExcellence.ocId, opts.ocId),
            eq(ocCreditForExcellence.enrollmentId, opts.enrollmentId),
            semester !== undefined ? eq(ocCreditForExcellence.semester, semester) : undefined
          )
        )
        .orderBy(asc(ocCreditForExcellence.semester));
    default:
      throw new ApiError(400, "Unsupported module requested", "bad_request");
  }
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

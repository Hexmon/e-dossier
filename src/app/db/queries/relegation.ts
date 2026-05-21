import { ApiError } from "@/app/lib/http";
import { db } from "@/app/db/client";
import { courses } from "@/app/db/schema/training/courses";
import { courseOfferings } from "@/app/db/schema/training/courseOfferings";
import {
  ocCadets,
  ocCourseEnrollments,
  ocSemesterMarks,
  ocMedicals,
  ocMedicalCategory,
  ocOlq,
  ocCreditForExcellence,
  ocSprRecords,
  ocDiscipline,
  ocParentComms,
  ocMotivationAwards,
  ocSportsAndGames,
  ocWeaponTraining,
  ocObstacleTraining,
  ocSpeedMarch,
  ocDrill,
  ocCamps,
  trainingCamps,
  ocClubs,
  ocRecordingLeaveHikeDetention,
  ocCounselling,
} from "@/app/db/schema/training/oc";
import { ocMovementKind, ocRelegations } from "@/app/db/schema/training/ocRelegations";
import { marksWorkflowTickets } from "@/app/db/schema/training/marksReviewWorkflow";
import { platoons } from "@/app/db/schema/auth/platoons";
import { and, asc, desc, eq, gte, ilike, inArray, isNull, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import {
  createEnrollment,
  getOrCreateActiveEnrollment,
  getPreviousArchivedEnrollment,
  setEnrollmentStatus,
  syncOcCourseFromEnrollment,
  updateEnrollmentCurrentSemester,
} from "@/app/db/queries/oc-enrollments";
import { ocPtMotivationAwards, ocPtTaskScores } from "@/app/db/schema/training/physicalTrainingOc";
import { ocInterviews } from "@/app/db/schema/training/interviewOc";
import { removeOcFromWorkflowDraftPayload } from "@/app/lib/marks-review-workflow";

export type RelegationOcOption = {
  ocId: string;
  ocNo: string;
  ocName: string;
  status: string;
  isActive: boolean;
  currentSemester: number;
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
  relegationMode?: "COURSE_TRANSFER" | "PREVIOUS_SEMESTER" | "REPEAT_SEMESTER";
  targetSemester?: number | null;
  reason: string;
  remark?: string | null;
  pdfObjectKey?: string | null;
  pdfUrl?: string | null;
};

export type PromoteCourseBatchInput = {
  fromCourseId: string;
  fromSemester: number;
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

export type RelegationCourseTargetMode = "COURSE_TRANSFER" | "PREVIOUS_SEMESTER" | "REPEAT_SEMESTER";

const COURSE_SEQUENCE_REGEX = /^([A-Za-z][A-Za-z0-9]*)[-=](\d+)$/;

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

export function resolveImmediateNextCourseCode(currentCode: string): string {
  const current = assertParsableCourseCode(currentCode);
  return `${current.prefix}-${current.number + 1}`;
}

export function isImmediatePreviousCourseCode(currentCode: string, previousCode: string): boolean {
  const current = parseCourseSequence(currentCode);
  const previous = parseCourseSequence(previousCode);

  if (!current || !previous) return false;
  return current.prefix === previous.prefix && previous.number === current.number - 1;
}

function compareCourseOptions(left: RelegationCourseOption, right: RelegationCourseOption): number {
  const leftParsed = parseCourseSequence(left.courseCode);
  const rightParsed = parseCourseSequence(right.courseCode);

  if (leftParsed && rightParsed) {
    const prefixCompare = leftParsed.prefix.localeCompare(rightParsed.prefix);
    if (prefixCompare !== 0) return prefixCompare;
    if (leftParsed.number !== rightParsed.number) return leftParsed.number - rightParsed.number;
  }

  if (leftParsed && !rightParsed) return -1;
  if (!leftParsed && rightParsed) return 1;
  return left.courseCode.localeCompare(right.courseCode);
}

export function selectNearestNextCourses(
  currentCode: string,
  candidates: RelegationCourseOption[]
): RelegationCourseOption[] {
  const current = assertParsableCourseCode(currentCode);

  const sequencedCandidates = candidates
    .map((course) => ({
      course,
      parsed: parseCourseSequence(course.courseCode),
    }))
    .filter(
      (
        entry
      ): entry is {
        course: RelegationCourseOption;
        parsed: ParsedCourseSequence;
      } =>
        entry.parsed !== null &&
        entry.parsed.prefix === current.prefix &&
        entry.parsed.number > current.number
    )
    .sort((left, right) => {
      if (left.parsed.number !== right.parsed.number) {
        return left.parsed.number - right.parsed.number;
      }
      return left.course.courseCode.localeCompare(right.course.courseCode);
    });

  const nearestNumber = sequencedCandidates[0]?.parsed.number;
  if (nearestNumber === undefined) {
    return [];
  }

  return sequencedCandidates
    .filter((entry) => entry.parsed.number === nearestNumber)
    .map((entry) => entry.course);
}

export function selectImmediateNextCourses(
  currentCode: string,
  candidates: RelegationCourseOption[]
): RelegationCourseOption[] {
  const current = assertParsableCourseCode(currentCode);

  return candidates
    .map((course) => ({
      course,
      parsed: parseCourseSequence(course.courseCode),
    }))
    .filter(
      (
        entry
      ): entry is {
        course: RelegationCourseOption;
        parsed: ParsedCourseSequence;
      } =>
        entry.parsed !== null &&
        entry.parsed.prefix === current.prefix &&
        entry.parsed.number === current.number + 1
    )
    .sort((left, right) => left.course.courseCode.localeCompare(right.course.courseCode))
    .map((entry) => entry.course);
}

export function selectNearestPreviousCourses(
  currentCode: string,
  candidates: RelegationCourseOption[]
): RelegationCourseOption[] {
  const expectedPrevious = parseCourseSequence(resolveImmediatePreviousCourseCode(currentCode));
  if (!expectedPrevious) return [];

  return candidates
    .map((course) => ({
      course,
      parsed: parseCourseSequence(course.courseCode),
    }))
    .filter(
      (
        entry
      ): entry is {
        course: RelegationCourseOption;
        parsed: ParsedCourseSequence;
      } =>
        entry.parsed !== null &&
        entry.parsed.prefix === expectedPrevious.prefix &&
        entry.parsed.number === expectedPrevious.number
    )
    .sort((left, right) => {
      return left.course.courseCode.localeCompare(right.course.courseCode);
    })
    .map((entry) => entry.course);
}

export function selectCourseTransferTargetCourses(
  currentCourseId: string,
  candidates: RelegationCourseOption[]
): RelegationCourseOption[] {
  return candidates
    .filter((course) => course.courseId !== currentCourseId)
    .sort(compareCourseOptions);
}

type CourseLookupClient = Pick<typeof db, "select">;

function assertParsableCourseCode(code: string): ParsedCourseSequence {
  const parsed = parseCourseSequence(code);
  if (!parsed) {
    throw new ApiError(
      400,
      `Cannot determine course order for code '${code}'. Expected a course number like TES-50.`,
      "bad_request"
    );
  }
  return parsed;
}

export function resolveImmediatePreviousCourseCode(currentCode: string): string {
  const current = assertParsableCourseCode(currentCode);
  if (current.number <= 1) {
    throw new ApiError(
      400,
      `No previous course exists before ${currentCode}.`,
      "previous_course_not_available",
      { currentCourseCode: currentCode }
    );
  }

  return `${current.prefix}-${current.number - 1}`;
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
  const wh: any[] = [isNull(courses.deletedAt), isNull(ocCadets.deletedAt)];

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
      currentSemester: ocCourseEnrollments.currentSemester,
      platoonId: ocCadets.platoonId,
      platoonKey: platoons.key,
      platoonName: platoons.name,
      currentCourseId: courses.id,
      currentCourseCode: courses.code,
    })
    .from(ocCadets)
    .innerJoin(courses, eq(courses.id, ocCadets.courseId))
    .leftJoin(
      ocCourseEnrollments,
      and(eq(ocCourseEnrollments.ocId, ocCadets.id), eq(ocCourseEnrollments.status, "ACTIVE"))
    )
    .leftJoin(platoons, eq(platoons.id, ocCadets.platoonId))
    .where(and(...wh))
    .orderBy(asc(ocCadets.ocNo));

  return rows.map((row) => ({
    ocId: row.ocId,
    ocNo: row.ocNo,
    ocName: row.ocName,
    status: row.status,
    isActive: row.status === "ACTIVE" && row.withdrawnOn === null,
    currentSemester: Number(row.currentSemester ?? 1),
    platoonId: row.platoonId,
    platoonKey: row.platoonKey,
    platoonName: row.platoonName,
    currentCourseId: row.currentCourseId,
    currentCourseCode: row.currentCourseCode,
  }));
}

export async function listImmediateNextCourses(
  currentCourseId: string,
  tx: CourseLookupClient = db
): Promise<RelegationCourseOption[]> {
  const currentCourse = await getActiveCourseById(currentCourseId, tx);

  const candidateCourses = await tx
    .select({
      id: courses.id,
      code: courses.code,
      title: courses.title,
    })
    .from(courses)
    .where(isNull(courses.deletedAt));

  return selectNearestNextCourses(
    currentCourse.code,
    candidateCourses.map(toCourseOption)
  );
}

export async function listRelegationTargetCourses(
  currentCourseId: string,
  mode: RelegationCourseTargetMode,
  tx: CourseLookupClient = db
): Promise<RelegationCourseOption[]> {
  const currentCourse = await getActiveCourseById(currentCourseId, tx);

  const candidateCourses = await tx
    .select({
      id: courses.id,
      code: courses.code,
      title: courses.title,
    })
    .from(courses)
    .where(isNull(courses.deletedAt));

  const options = candidateCourses.map(toCourseOption);
  if (mode === "PREVIOUS_SEMESTER" || mode === "REPEAT_SEMESTER") {
    const expectedCourseCode = resolveImmediateNextCourseCode(currentCourse.code);
    const targetCourses = selectImmediateNextCourses(
      currentCourse.code,
      options.filter((course) => course.courseId !== currentCourseId)
    );

    if (targetCourses.length === 0) {
      throw new ApiError(
        404,
        `Relegation target course ${expectedCourseCode} is not configured. Create ${expectedCourseCode} in Course Management before relegation.`,
        "relegation_target_course_not_found",
        {
          currentCourseCode: currentCourse.code,
          expectedCourseCode,
        }
      );
    }

    return targetCourses;
  }

  return selectCourseTransferTargetCourses(currentCourseId, options);
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
    .where(and(eq(ocCadets.id, ocId), isNull(ocCadets.deletedAt), isNull(courses.deletedAt)))
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
      .where(and(eq(ocCadets.id, ocId), isNull(ocCadets.deletedAt), isNull(courses.deletedAt)))
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

async function ensureAllowedNextCourse(
  currentCourseId: string,
  targetCourseId: string,
  fromCode: string,
  tx: CourseLookupClient = db
) {
  const allowedNextCourses = await listImmediateNextCourses(currentCourseId, tx);
  const isAllowed = allowedNextCourses.some((course) => course.courseId === targetCourseId);

  if (!isAllowed) {
    throw new ApiError(
      400,
      `Invalid transfer target. Only the next available course is allowed from ${fromCode}.`,
      "bad_request"
    );
  }
}

async function ensureAllowedRelegationTargetCourse(
  currentCourseId: string,
  targetCourseId: string,
  fromCode: string,
  mode: RelegationCourseTargetMode,
  tx: CourseLookupClient = db
) {
  if (mode === "COURSE_TRANSFER") {
    if (currentCourseId === targetCourseId) {
      throw new ApiError(
        400,
        "Invalid transfer target. Course transfer target must be different from the current course.",
        "bad_request"
      );
    }
    return;
  }

  const allowedPreviousCourses = await listRelegationTargetCourses(currentCourseId, mode, tx);
  const isAllowed = allowedPreviousCourses.some((course) => course.courseId === targetCourseId);

  if (!isAllowed) {
    const label = mode === "REPEAT_SEMESTER" ? "repeat-semester" : "previous-semester";
    throw new ApiError(
      400,
      `Invalid ${label} target. Only the immediate next course is allowed from ${fromCode}.`,
      "bad_request"
    );
  }
}

export type RelegationTransferMode = "COURSE_TRANSFER" | "PREVIOUS_SEMESTER" | "REPEAT_SEMESTER";

export type RelegationTransferSemesterPlan = {
  mode: RelegationTransferMode;
  movementKind: RelegationMovementKind;
  fromSemester: number;
  toSemester: number | null;
  cleanupFromSemester: number | null;
  newEnrollmentCurrentSemester: number | null;
};

function normalizeSemester(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 1;
  return Math.max(1, Math.min(Math.trunc(parsed), 6));
}

export function resolveRelegationTransferSemesterPlan(args: {
  currentSemester: number;
  relegationMode?: RelegationTransferMode | null;
  targetSemester?: number | null;
}): RelegationTransferSemesterPlan {
  const mode = args.relegationMode ?? "COURSE_TRANSFER";
  const fromSemester = normalizeSemester(args.currentSemester);

  if (mode === "COURSE_TRANSFER") {
    return {
      mode: "COURSE_TRANSFER",
      movementKind: "TRANSFER",
      fromSemester,
      toSemester: null,
      cleanupFromSemester: null,
      newEnrollmentCurrentSemester: null,
    };
  }

  if (mode === "REPEAT_SEMESTER") {
    if (args.targetSemester !== fromSemester) {
      throw new ApiError(
        400,
        `Repeat-semester relegation target must be semester ${fromSemester}.`,
        "bad_request",
        {
          currentSemester: fromSemester,
          expectedTargetSemester: fromSemester,
          providedTargetSemester: args.targetSemester ?? null,
        }
      );
    }

    return {
      mode,
      movementKind: "SEMESTER_REPEAT",
      fromSemester,
      toSemester: fromSemester,
      cleanupFromSemester: fromSemester + 1,
      newEnrollmentCurrentSemester: fromSemester,
    };
  }

  if (fromSemester <= 1) {
    throw new ApiError(
      400,
      "Previous-semester relegation is not available from semester 1.",
      "bad_request"
    );
  }

  const expectedTargetSemester = fromSemester - 1;
  if (args.targetSemester !== expectedTargetSemester) {
    throw new ApiError(
      400,
      `Previous-semester relegation target must be semester ${expectedTargetSemester}.`,
      "bad_request",
      {
        currentSemester: fromSemester,
        expectedTargetSemester,
        providedTargetSemester: args.targetSemester ?? null,
      }
    );
  }

  return {
    mode,
    movementKind: "SEMESTER_RELEGATION",
    fromSemester,
    toSemester: expectedTargetSemester,
    cleanupFromSemester: expectedTargetSemester + 1,
    newEnrollmentCurrentSemester: expectedTargetSemester,
  };
}

export type PreviousSemesterCleanupSummary = {
  cleanupFromSemester: number;
  deletedRows: Record<string, number>;
  workflowTicketsUpdated: number;
  workflowItemsRemoved: number;
};

async function deleteReturningCount(
  tx: any,
  table: any,
  whereClause: any
): Promise<number> {
  const rows = await tx.delete(table).where(whereClause).returning({ id: table.id });
  return rows.length;
}

async function cleanupSourceEnrollmentFutureSemesterData(args: {
  tx: any;
  ocId: string;
  sourceEnrollmentId: string;
  sourceCourseId: string;
  cleanupFromSemester: number;
  actorUserId: string;
}): Promise<PreviousSemesterCleanupSummary> {
  const { tx, ocId, sourceEnrollmentId, sourceCourseId, cleanupFromSemester, actorUserId } = args;
  const deletedRows: Record<string, number> = {};
  const bySourceEnrollmentAndFutureSemester = (table: any) =>
    and(
      eq(table.ocId, ocId),
      eq(table.enrollmentId, sourceEnrollmentId),
      gte(table.semester, cleanupFromSemester)
    );

  deletedRows.ocSemesterMarks = await deleteReturningCount(
    tx,
    ocSemesterMarks,
    bySourceEnrollmentAndFutureSemester(ocSemesterMarks)
  );
  deletedRows.ocMedicals = await deleteReturningCount(
    tx,
    ocMedicals,
    bySourceEnrollmentAndFutureSemester(ocMedicals)
  );
  deletedRows.ocMedicalCategory = await deleteReturningCount(
    tx,
    ocMedicalCategory,
    bySourceEnrollmentAndFutureSemester(ocMedicalCategory)
  );
  deletedRows.ocParentComms = await deleteReturningCount(
    tx,
    ocParentComms,
    bySourceEnrollmentAndFutureSemester(ocParentComms)
  );
  deletedRows.ocSprRecords = await deleteReturningCount(
    tx,
    ocSprRecords,
    bySourceEnrollmentAndFutureSemester(ocSprRecords)
  );
  deletedRows.ocDiscipline = await deleteReturningCount(
    tx,
    ocDiscipline,
    bySourceEnrollmentAndFutureSemester(ocDiscipline)
  );
  deletedRows.ocMotivationAwards = await deleteReturningCount(
    tx,
    ocMotivationAwards,
    bySourceEnrollmentAndFutureSemester(ocMotivationAwards)
  );
  deletedRows.ocSportsAndGames = await deleteReturningCount(
    tx,
    ocSportsAndGames,
    bySourceEnrollmentAndFutureSemester(ocSportsAndGames)
  );
  deletedRows.ocWeaponTraining = await deleteReturningCount(
    tx,
    ocWeaponTraining,
    bySourceEnrollmentAndFutureSemester(ocWeaponTraining)
  );
  deletedRows.ocObstacleTraining = await deleteReturningCount(
    tx,
    ocObstacleTraining,
    bySourceEnrollmentAndFutureSemester(ocObstacleTraining)
  );
  deletedRows.ocSpeedMarch = await deleteReturningCount(
    tx,
    ocSpeedMarch,
    bySourceEnrollmentAndFutureSemester(ocSpeedMarch)
  );
  deletedRows.ocDrill = await deleteReturningCount(
    tx,
    ocDrill,
    bySourceEnrollmentAndFutureSemester(ocDrill)
  );
  deletedRows.ocOlq = await deleteReturningCount(
    tx,
    ocOlq,
    bySourceEnrollmentAndFutureSemester(ocOlq)
  );
  deletedRows.ocCreditForExcellence = await deleteReturningCount(
    tx,
    ocCreditForExcellence,
    bySourceEnrollmentAndFutureSemester(ocCreditForExcellence)
  );
  deletedRows.ocClubs = await deleteReturningCount(
    tx,
    ocClubs,
    bySourceEnrollmentAndFutureSemester(ocClubs)
  );
  deletedRows.ocRecordingLeaveHikeDetention = await deleteReturningCount(
    tx,
    ocRecordingLeaveHikeDetention,
    bySourceEnrollmentAndFutureSemester(ocRecordingLeaveHikeDetention)
  );
  deletedRows.ocCounselling = await deleteReturningCount(
    tx,
    ocCounselling,
    bySourceEnrollmentAndFutureSemester(ocCounselling)
  );
  deletedRows.ocPtTaskScores = await deleteReturningCount(
    tx,
    ocPtTaskScores,
    bySourceEnrollmentAndFutureSemester(ocPtTaskScores)
  );
  deletedRows.ocPtMotivationAwards = await deleteReturningCount(
    tx,
    ocPtMotivationAwards,
    bySourceEnrollmentAndFutureSemester(ocPtMotivationAwards)
  );
  deletedRows.ocInterviews = await deleteReturningCount(
    tx,
    ocInterviews,
    bySourceEnrollmentAndFutureSemester(ocInterviews)
  );
  deletedRows.ocCamps = await deleteReturningCount(
    tx,
    ocCamps,
    and(
      eq(ocCamps.ocId, ocId),
      eq(ocCamps.enrollmentId, sourceEnrollmentId),
      inArray(
        ocCamps.trainingCampId,
        tx.select({ id: trainingCamps.id }).from(trainingCamps).where(gte(trainingCamps.semester, cleanupFromSemester))
      )
    )
  );

  const workflowRows = await tx
    .select({
      id: marksWorkflowTickets.id,
      draftPayload: marksWorkflowTickets.draftPayload,
      currentRevision: marksWorkflowTickets.currentRevision,
    })
    .from(marksWorkflowTickets)
    .where(
      and(
        eq(marksWorkflowTickets.courseId, sourceCourseId),
        gte(marksWorkflowTickets.semester, cleanupFromSemester),
        inArray(marksWorkflowTickets.module, ["ACADEMICS_BULK", "PT_BULK"])
      )
    );

  let workflowTicketsUpdated = 0;
  let workflowItemsRemoved = 0;
  const now = new Date();

  for (const ticket of workflowRows) {
    const result = removeOcFromWorkflowDraftPayload(ticket.draftPayload, ocId);
    if (result.removedCount === 0) continue;

    await tx
      .update(marksWorkflowTickets)
      .set({
        draftPayload: result.payload,
        currentRevision: ticket.currentRevision + 1,
        lastActorUserId: actorUserId,
        lastActorMessage: `Removed OC from invalid semester workflow payload during previous-semester relegation.`,
        draftUpdatedAt: now,
        updatedAt: now,
      })
      .where(eq(marksWorkflowTickets.id, ticket.id));

    workflowTicketsUpdated += 1;
    workflowItemsRemoved += result.removedCount;
  }

  return {
    cleanupFromSemester,
    deletedRows,
    workflowTicketsUpdated,
    workflowItemsRemoved,
  };
}

export async function applyOcRelegationTransfer(
  input: ApplyOcRelegationTransferInput,
  actorUserId: string,
  scope: RelegationActorScope = {}
) {
  return db.transaction(async (tx) => {
    const ocRow = await getScopedOcForMove(tx, input.ocId, scope.scopePlatoonId ?? null);
    const targetCourse = await getActiveCourseById(input.toCourseId, tx);
    const semesterPlan = resolveRelegationTransferSemesterPlan({
      currentSemester: ocRow.activeEnrollment.currentSemester,
      relegationMode: input.relegationMode,
      targetSemester: input.targetSemester ?? null,
    });

    await ensureAllowedRelegationTargetCourse(
      ocRow.fromCourseId,
      targetCourse.id,
      ocRow.fromCourseCode,
      semesterPlan.mode,
      tx
    );

    const now = new Date();
    const cleanupSummary = semesterPlan.cleanupFromSemester
      ? await cleanupSourceEnrollmentFutureSemesterData({
          tx,
          ocId: ocRow.ocId,
          sourceEnrollmentId: ocRow.activeEnrollment.id,
          sourceCourseId: ocRow.fromCourseId,
          cleanupFromSemester: semesterPlan.cleanupFromSemester,
          actorUserId,
        })
      : null;

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
        currentSemester: semesterPlan.newEnrollmentCurrentSemester,
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
        fromSemester: semesterPlan.fromSemester,
        toCourseId: targetCourse.id,
        toEnrollmentId: newEnrollment.id,
        toCourseCode: targetCourse.code,
        toSemester: semesterPlan.toSemester ?? newEnrollment.currentSemester,
        reason: input.reason,
        remark: input.remark ?? null,
        pdfObjectKey: input.pdfObjectKey ?? null,
        pdfUrl: input.pdfUrl ?? null,
        movementKind: semesterPlan.movementKind,
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
        fromSemester: ocRelegations.fromSemester,
        toCourseId: ocRelegations.toCourseId,
        toCourseCode: ocRelegations.toCourseCode,
        toSemester: ocRelegations.toSemester,
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
      cleanupSummary,
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

    await ensureAllowedNextCourse(ocRow.fromCourseId, targetCourse.id, ocRow.fromCourseCode, tx);

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
        fromSemester: normalizeSemester(ocRow.activeEnrollment.currentSemester),
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
        fromSemester: ocRelegations.fromSemester,
        toCourseId: ocRelegations.toCourseId,
        toCourseCode: ocRelegations.toCourseCode,
        toSemester: ocRelegations.toSemester,
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
    const fromSemester = Math.max(1, Math.min(Number(input.fromSemester ?? 1), 6));
    const toSemester = fromSemester + 1;

    if (toSemester > 6) {
      throw new ApiError(400, "Semester promotion is only supported up to semester 6.", "bad_request");
    }

    const [targetSemesterOffering] = await tx
      .select({ id: courseOfferings.id })
      .from(courseOfferings)
      .where(
        and(
          eq(courseOfferings.courseId, fromCourse.id),
          eq(courseOfferings.semester, toSemester),
          isNull(courseOfferings.deletedAt)
        )
      )
      .limit(1);

    if (!targetSemesterOffering) {
      throw new ApiError(
        400,
        `Semester ${toSemester} is not configured in course offerings for ${fromCourse.code}.`,
        "bad_request"
      );
    }

    const candidates = await tx
      .select({
        ocId: ocCadets.id,
        ocNo: ocCadets.ocNo,
        enrollmentId: ocCourseEnrollments.id,
      })
      .from(ocCadets)
      .innerJoin(
        ocCourseEnrollments,
        and(eq(ocCourseEnrollments.ocId, ocCadets.id), eq(ocCourseEnrollments.status, "ACTIVE"))
      )
      .where(
        and(
          eq(ocCadets.courseId, fromCourse.id),
          eq(ocCourseEnrollments.courseId, fromCourse.id),
          eq(ocCourseEnrollments.currentSemester, fromSemester),
          isNull(ocCadets.deletedAt),
          eq(ocCadets.status, "ACTIVE"),
          isNull(ocCadets.withdrawnOn)
        )
      )
      .orderBy(asc(ocCadets.ocNo));

    const ocIds = candidates.map((row) => row.ocId);
    if (ocIds.length === 0) {
      return {
        fromCourse: toCourseOption(fromCourse),
        toCourse: toCourseOption(fromCourse),
        fromSemester,
        toSemester,
        summary: {
          totalEligible: 0,
          excludedByRequest: 0,
          excludedByException: 0,
          promoted: 0,
        },
        promotedOcIds: [] as string[],
      };
    }

    const excludeSet = new Set(input.excludeOcIds ?? []);
    const promotableCandidates = candidates.filter((candidate) => !excludeSet.has(candidate.ocId));

    const now = new Date();
    const historyRows: Array<typeof ocRelegations.$inferInsert> = [];

    if (promotableCandidates.length > 0) {
      for (const candidate of promotableCandidates) {
        const updatedEnrollment = await updateEnrollmentCurrentSemester(candidate.enrollmentId, toSemester, tx);
        if (!updatedEnrollment) continue;

        historyRows.push({
          ocId: candidate.ocId,
          fromCourseId: fromCourse.id,
          fromEnrollmentId: candidate.enrollmentId,
          fromCourseCode: fromCourse.code,
          toCourseId: fromCourse.id,
          toEnrollmentId: candidate.enrollmentId,
          toCourseCode: fromCourse.code,
          fromSemester,
          toSemester,
          reason: `Promoted via semester batch in ${fromCourse.code} from semester ${fromSemester} to semester ${toSemester}`,
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
      toCourse: toCourseOption(fromCourse),
      fromSemester,
      toSemester,
      summary: {
        totalEligible: ocIds.length,
        excludedByRequest: ocIds.filter((id) => excludeSet.has(id)).length,
        excludedByException: 0,
        promoted: historyRows.length,
      },
      promotedOcIds: historyRows.map((row) => row.ocId),
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
        fromSemester: normalizeSemester(activeEnrollment.currentSemester),
        toCourseId: previousEnrollment.courseId,
        toEnrollmentId: previousEnrollment.id,
        toCourseCode: toCourse.code,
        toSemester: normalizeSemester(previousEnrollment.currentSemester),
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
        fromSemester: ocRelegations.fromSemester,
        toCourseId: ocRelegations.toCourseId,
        toCourseCode: ocRelegations.toCourseCode,
        toSemester: ocRelegations.toSemester,
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
  fromSemester: number | null;
  toCourseId: string;
  toCourseCode: string;
  toCourseName: string | null;
  toSemester: number | null;
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
        fromSemester: ocRelegations.fromSemester,
        fromCourseName: courses.title,
        toCourseId: ocRelegations.toCourseId,
        toCourseCode: ocRelegations.toCourseCode,
        toSemester: ocRelegations.toSemester,
        toCourseName: toCourses.title,
        reason: ocRelegations.reason,
        remark: ocRelegations.remark,
        pdfObjectKey: ocRelegations.pdfObjectKey,
        pdfUrl: ocRelegations.pdfUrl,
        performedByUserId: ocRelegations.performedByUserId,
        performedAt: ocRelegations.performedAt,
      })
      .from(ocRelegations)
      .innerJoin(ocCadets, and(eq(ocCadets.id, ocRelegations.ocId), isNull(ocCadets.deletedAt)))
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
      .innerJoin(ocCadets, and(eq(ocCadets.id, ocRelegations.ocId), isNull(ocCadets.deletedAt)))
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
    fromSemester: row.fromSemester,
    toCourseId: row.toCourseId,
    toCourseCode: row.toCourseCode,
    toCourseName: row.toCourseName,
    toSemester: row.toSemester,
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
    .where(and(eq(ocCadets.id, ocId), isNull(ocCadets.deletedAt)))
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
  currentSemester: number;
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
      currentSemester: ocCourseEnrollments.currentSemester,
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
  | "medical"
  | "medical_category"
  | "parent_comms"
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
            isNull(ocSemesterMarks.deletedAt),
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
            isNull(ocInterviews.deletedAt),
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
    case "medical":
      return db
        .select()
        .from(ocMedicals)
        .where(
          and(
            eq(ocMedicals.ocId, opts.ocId),
            eq(ocMedicals.enrollmentId, opts.enrollmentId),
            isNull(ocMedicals.deletedAt),
            semester !== undefined ? eq(ocMedicals.semester, semester) : undefined
          )
        )
        .orderBy(asc(ocMedicals.semester), asc(ocMedicals.date));
    case "medical_category":
      return db
        .select()
        .from(ocMedicalCategory)
        .where(
          and(
            eq(ocMedicalCategory.ocId, opts.ocId),
            eq(ocMedicalCategory.enrollmentId, opts.enrollmentId),
            isNull(ocMedicalCategory.deletedAt),
            semester !== undefined ? eq(ocMedicalCategory.semester, semester) : undefined
          )
        )
        .orderBy(asc(ocMedicalCategory.semester), asc(ocMedicalCategory.date));
    case "parent_comms":
      return db
        .select()
        .from(ocParentComms)
        .where(
          and(
            eq(ocParentComms.ocId, opts.ocId),
            eq(ocParentComms.enrollmentId, opts.enrollmentId),
            isNull(ocParentComms.deletedAt),
            semester !== undefined ? eq(ocParentComms.semester, semester) : undefined
          )
        )
        .orderBy(asc(ocParentComms.semester), asc(ocParentComms.date));
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
    .innerJoin(ocCadets, and(eq(ocCadets.id, ocRelegations.ocId), isNull(ocCadets.deletedAt)))
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

export async function isRelegationPdfObjectCommitted(objectKey: string) {
  const [row] = await db
    .select({ id: ocRelegations.id })
    .from(ocRelegations)
    .where(eq(ocRelegations.pdfObjectKey, objectKey))
    .limit(1);

  return Boolean(row);
}

export async function getOcRelegationHistory(ocId: string) {
  return db
    .select({
      id: ocRelegations.id,
      ocId: ocRelegations.ocId,
      fromCourseId: ocRelegations.fromCourseId,
      fromCourseCode: ocRelegations.fromCourseCode,
      fromSemester: ocRelegations.fromSemester,
      toCourseId: ocRelegations.toCourseId,
      toCourseCode: ocRelegations.toCourseCode,
      toSemester: ocRelegations.toSemester,
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

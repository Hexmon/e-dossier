import { and, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@/app/db/client";
import {
  ocCourseEnrollments,
  ocDiscipline,
  ocMedicalCategory,
  ocOlq,
  ocSemesterMarks,
} from "@/app/db/schema/training/oc";
import { ocPtTaskScores } from "@/app/db/schema/training/physicalTrainingOc";
import { getOrCreateActiveEnrollment } from "@/app/db/queries/oc-enrollments";
import type {
  PerformanceGraphData,
} from "@/types/performanceGraph";

const TERM_COUNT = 6;

function createTermArray() {
  return Array.from({ length: TERM_COUNT }, () => 0);
}

function isValidSemester(value: number) {
  return Number.isInteger(value) && value >= 1 && value <= TERM_COUNT;
}

function toTermIndex(semester: number) {
  return semester - 1;
}

function round1(value: number) {
  return Math.round((value + Number.EPSILON) * 10) / 10;
}

function toFiniteNumber(value: unknown) {
  const num = Number(value ?? 0);
  return Number.isFinite(num) ? num : 0;
}

function parseAbsenceDays(absence: string | null) {
  if (!absence) return null;
  const match = absence.match(/-?\d+(\.\d+)?/);
  if (!match) return null;
  const value = Number(match[0]);
  if (!Number.isFinite(value)) return null;
  return Math.max(0, value);
}

function durationInDays(from?: Date | null, to?: Date | null) {
  if (!from || !to) return 0;
  const start = new Date(from);
  const end = new Date(to);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return 0;
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.floor((end.getTime() - start.getTime()) / msPerDay) + 1;
}

function averageSeriesByCourseCount(sumByTerm: number[], courseCadetCount: number) {
  return sumByTerm.map((sum) => round1(sum / Math.max(1, courseCadetCount)));
}

export async function getPerformanceGraphData(ocId: string): Promise<PerformanceGraphData> {
  const activeEnrollment = await getOrCreateActiveEnrollment(ocId);

  const activeCourseEnrollments = await db
    .select({
      id: ocCourseEnrollments.id,
      ocId: ocCourseEnrollments.ocId,
    })
    .from(ocCourseEnrollments)
    .where(
      and(
        eq(ocCourseEnrollments.courseId, activeEnrollment.courseId),
        eq(ocCourseEnrollments.status, "ACTIVE"),
      ),
    );

  const enrollmentIdSet = new Set(activeCourseEnrollments.map((row) => row.id));
  enrollmentIdSet.add(activeEnrollment.id);
  const courseEnrollmentIds = Array.from(enrollmentIdSet);

  const ocIdSet = new Set(activeCourseEnrollments.map((row) => row.ocId));
  ocIdSet.add(ocId);
  const courseOcIds = Array.from(ocIdSet);

  const courseCadetCount = Math.max(1, courseEnrollmentIds.length);

  const [
    academicsRows,
    olqRows,
    ptScoreRows,
    disciplineRows,
    medicalCategoryRows,
  ] = await Promise.all([
    db
      .select({
        enrollmentId: ocSemesterMarks.enrollmentId,
        semester: ocSemesterMarks.semester,
        cgpa: ocSemesterMarks.cgpa,
      })
      .from(ocSemesterMarks)
      .where(
        and(
          inArray(ocSemesterMarks.enrollmentId, courseEnrollmentIds),
          isNull(ocSemesterMarks.deletedAt),
        ),
      ),
    db
      .select({
        enrollmentId: ocOlq.enrollmentId,
        semester: ocOlq.semester,
        totalMarks: ocOlq.totalMarks,
      })
      .from(ocOlq)
      .where(inArray(ocOlq.enrollmentId, courseEnrollmentIds)),
    db
      .select({
        enrollmentId: ocPtTaskScores.enrollmentId,
        semester: ocPtTaskScores.semester,
        marksScored: ocPtTaskScores.marksScored,
      })
      .from(ocPtTaskScores)
      .where(inArray(ocPtTaskScores.enrollmentId, courseEnrollmentIds)),
    db
      .select({
        enrollmentId: ocDiscipline.enrollmentId,
        semester: ocDiscipline.semester,
        pointsDelta: ocDiscipline.pointsDelta,
        numberOfPunishments: ocDiscipline.numberOfPunishments,
      })
      .from(ocDiscipline)
      .where(inArray(ocDiscipline.enrollmentId, courseEnrollmentIds)),
    db
      .select({
        ocId: ocMedicalCategory.ocId,
        semester: ocMedicalCategory.semester,
        absence: ocMedicalCategory.absence,
        catFrom: ocMedicalCategory.catFrom,
        catTo: ocMedicalCategory.catTo,
        mhFrom: ocMedicalCategory.mhFrom,
        mhTo: ocMedicalCategory.mhTo,
      })
      .from(ocMedicalCategory)
      .where(inArray(ocMedicalCategory.ocId, courseOcIds)),
  ]);

  const academicsCadet = createTermArray();
  const academicsCourseSum = createTermArray();
  const academicsCadetPresence = Array.from({ length: TERM_COUNT }, () => false);

  for (const row of academicsRows) {
    if (!isValidSemester(row.semester)) continue;
    const value = toFiniteNumber(row.cgpa);
    const termIndex = toTermIndex(row.semester);
    academicsCourseSum[termIndex] += value;
    if (row.enrollmentId === activeEnrollment.id) {
      academicsCadet[termIndex] = round1(value);
      academicsCadetPresence[termIndex] = true;
    }
  }

  const olqCadet = createTermArray();
  const olqCourseSum = createTermArray();
  const olqCadetPresence = Array.from({ length: TERM_COUNT }, () => false);

  for (const row of olqRows) {
    if (!isValidSemester(row.semester)) continue;
    const value = toFiniteNumber(row.totalMarks);
    const termIndex = toTermIndex(row.semester);
    olqCourseSum[termIndex] += value;
    if (row.enrollmentId === activeEnrollment.id) {
      olqCadet[termIndex] = round1(value);
      olqCadetPresence[termIndex] = true;
    }
  }

  const odtByEnrollmentTerm = new Map<string, number>();

  for (const row of ptScoreRows) {
    if (!isValidSemester(row.semester)) continue;
    const key = `${row.enrollmentId}:${row.semester}`;
    odtByEnrollmentTerm.set(key, (odtByEnrollmentTerm.get(key) ?? 0) + toFiniteNumber(row.marksScored));
  }

  const odtCadet = createTermArray();
  const odtCourseSum = createTermArray();
  const odtCadetPresence = Array.from({ length: TERM_COUNT }, () => false);

  for (const [key, rawValue] of odtByEnrollmentTerm.entries()) {
    const [enrollmentId, semesterRaw] = key.split(":");
    const semester = Number(semesterRaw);
    if (!isValidSemester(semester)) continue;
    const termIndex = toTermIndex(semester);
    const value = toFiniteNumber(rawValue);
    odtCourseSum[termIndex] += value;
    if (enrollmentId === activeEnrollment.id) {
      odtCadet[termIndex] = round1(value);
      odtCadetPresence[termIndex] = true;
    }
  }

  const disciplineByEnrollmentTerm = new Map<string, number>();

  for (const row of disciplineRows) {
    if (!isValidSemester(row.semester)) continue;
    const key = `${row.enrollmentId}:${row.semester}`;
    const pointsDelta = Math.abs(toFiniteNumber(row.pointsDelta));
    const fallbackPunishmentCount = toFiniteNumber(row.numberOfPunishments);
    const value = pointsDelta > 0 ? pointsDelta : fallbackPunishmentCount;
    disciplineByEnrollmentTerm.set(key, (disciplineByEnrollmentTerm.get(key) ?? 0) + value);
  }

  const disciplineCadet = createTermArray();
  const disciplineCourseSum = createTermArray();
  const disciplineCadetPresence = Array.from({ length: TERM_COUNT }, () => false);

  for (const [key, rawValue] of disciplineByEnrollmentTerm.entries()) {
    const [enrollmentId, semesterRaw] = key.split(":");
    const semester = Number(semesterRaw);
    if (!isValidSemester(semester)) continue;
    const termIndex = toTermIndex(semester);
    const value = toFiniteNumber(rawValue);
    disciplineCourseSum[termIndex] += value;
    if (enrollmentId === activeEnrollment.id) {
      disciplineCadet[termIndex] = round1(value);
      disciplineCadetPresence[termIndex] = true;
    }
  }

  const medicalByOcTerm = new Map<string, number>();
  const medicalCadetPresence = Array.from({ length: TERM_COUNT }, () => false);

  for (const row of medicalCategoryRows) {
    if (!isValidSemester(row.semester)) continue;
    const key = `${row.ocId}:${row.semester}`;
    if (row.ocId === ocId) {
      medicalCadetPresence[toTermIndex(row.semester)] = true;
    }
    const absenceDays = parseAbsenceDays(row.absence);
    const catDays = durationInDays(row.catFrom, row.catTo);
    const mhDays = durationInDays(row.mhFrom, row.mhTo);
    const value = absenceDays ?? (catDays > 0 ? catDays : mhDays);
    medicalByOcTerm.set(key, (medicalByOcTerm.get(key) ?? 0) + toFiniteNumber(value));
  }

  const medicalCadet = createTermArray();
  const medicalCourseSum = createTermArray();

  for (const [key, rawValue] of medicalByOcTerm.entries()) {
    const [medicalOcId, semesterRaw] = key.split(":");
    const semester = Number(semesterRaw);
    if (!isValidSemester(semester)) continue;
    const termIndex = toTermIndex(semester);
    const value = toFiniteNumber(rawValue);
    medicalCourseSum[termIndex] += value;
    if (medicalOcId === ocId) {
      medicalCadet[termIndex] = round1(value);
    }
  }

  return {
    academics: {
      cadet: academicsCadet.map(round1),
      courseAverage: averageSeriesByCourseCount(academicsCourseSum, courseCadetCount),
      cadetTermPresence: academicsCadetPresence,
    },
    olq: {
      cadet: olqCadet.map(round1),
      courseAverage: averageSeriesByCourseCount(olqCourseSum, courseCadetCount),
      cadetTermPresence: olqCadetPresence,
    },
    odt: {
      cadet: odtCadet.map(round1),
      courseAverage: averageSeriesByCourseCount(odtCourseSum, courseCadetCount),
      cadetTermPresence: odtCadetPresence,
    },
    discipline: {
      cadet: disciplineCadet.map(round1),
      courseAverage: averageSeriesByCourseCount(disciplineCourseSum, courseCadetCount),
      cadetTermPresence: disciplineCadetPresence,
    },
    medical: {
      cadet: medicalCadet.map(round1),
      courseAverage: averageSeriesByCourseCount(medicalCourseSum, courseCadetCount),
      cadetTermPresence: medicalCadetPresence,
    },
  };
}

import { and, eq, inArray, isNull } from 'drizzle-orm';
import { db } from '@/app/db/client';
import { ocCadets, ocSemesterMarks, type PracticalMarksRecord, type SemesterSubjectRecord, type TheoryMarksRecord } from '@/app/db/schema/training/oc';
import {
  getAcademicGradingPolicy,
} from '@/app/db/queries/academicGradingPolicy';
import {
  marksToGradePointsWithPolicy,
  marksToLetterGradeWithPolicy,
  roundPolicyValue,
  type AcademicGradingPolicy,
} from '@/app/lib/grading-policy';

type RecalculateScope = 'all' | 'courses';

export type AcademicRecalcRequest = {
  dryRun?: boolean;
  scope: RecalculateScope;
  courseIds?: string[];
};

export type AcademicRecalcSampleChange = {
  ocId: string;
  courseId: string;
  semester: number;
  field: string;
  before: string | number | null;
  after: string | number | null;
};

export type AcademicRecalcResult = {
  dryRun: boolean;
  scope: RecalculateScope;
  scannedRows: number;
  changedRows: number;
  changedGradeFields: number;
  changedSummaryRows: number;
  affectedOcs: number;
  affectedCourses: number;
  sampleChanges: AcademicRecalcSampleChange[];
};

type SemesterComponent = {
  credits: number;
  points: number;
  weighted: number;
};

type RowComputation = {
  subjects: SemesterSubjectRecord[];
  gradeFieldChanges: number;
  components: SemesterComponent[];
};

function toFiniteNumber(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toPositiveNumber(value: unknown): number {
  return Math.max(0, toFiniteNumber(value));
}

function normalizeGrade(value: unknown): string {
  return String(value ?? '').trim().toUpperCase();
}

function theoryTotal(theory: TheoryMarksRecord | null | undefined): number {
  if (!theory) return 0;
  // C# parity: each component contributes only when positive (Sign(x) == 1).
  return (
    toPositiveNumber(theory.phaseTest1Marks) +
    toPositiveNumber(theory.phaseTest2Marks) +
    toPositiveNumber(theory.tutorial) +
    toPositiveNumber(theory.finalMarks)
  );
}

function practicalTotal(practical: PracticalMarksRecord | null | undefined): number {
  if (!practical) return 0;
  // C# parity: practical marks use positive-only value.
  return toPositiveNumber(practical.finalMarks);
}

function computeSgpa(
  components: SemesterComponent[],
  policy: AcademicGradingPolicy
): number | null {
  if (!components.length) return null;

  if (policy.sgpaFormulaTemplate === 'SEMESTER_AVG') {
    const avg = components.reduce((sum, component) => sum + component.points, 0) / components.length;
    return roundPolicyValue(avg, policy.roundingScale);
  }

  const totalCredits = components.reduce((sum, component) => sum + component.credits, 0);
  if (totalCredits <= 0) return null;
  const totalWeighted = components.reduce((sum, component) => sum + component.weighted, 0);
  return roundPolicyValue(totalWeighted / totalCredits, policy.roundingScale);
}

function computeCgpa(
  semesters: Array<{ sgpa: number | null; components: SemesterComponent[] }>,
  index: number,
  policy: AcademicGradingPolicy
): number | null {
  const upto = semesters.slice(0, index + 1);
  if (!upto.length) return null;

  if (policy.cgpaFormulaTemplate === 'SEMESTER_AVG') {
    const sgpas = upto.map((entry) => entry.sgpa).filter((value): value is number => value !== null);
    if (!sgpas.length) return null;
    const avg = sgpas.reduce((sum, value) => sum + value, 0) / sgpas.length;
    return roundPolicyValue(avg, policy.roundingScale);
  }

  const components = upto.flatMap((entry) => entry.components);
  const totalCredits = components.reduce((sum, component) => sum + component.credits, 0);
  if (totalCredits <= 0) return null;
  const totalWeighted = components.reduce((sum, component) => sum + component.weighted, 0);
  return roundPolicyValue(totalWeighted / totalCredits, policy.roundingScale);
}

function recomputeRowSubjects(
  subjects: SemesterSubjectRecord[],
  policy: AcademicGradingPolicy
): RowComputation {
  let gradeFieldChanges = 0;
  const components: SemesterComponent[] = [];

  const nextSubjects = subjects.map((subject) => {
    const nextSubject: SemesterSubjectRecord = {
      ...subject,
      theory: subject.theory ? { ...subject.theory } : subject.theory,
      practical: subject.practical ? { ...subject.practical } : subject.practical,
      meta: subject.meta ? { ...subject.meta } : subject.meta,
    };

    if (nextSubject.theory) {
      const marks = theoryTotal(nextSubject.theory);
      const credits = Math.max(0, toFiniteNumber(nextSubject.meta?.theoryCredits));
      if (credits <= 0) {
        if (normalizeGrade(nextSubject.theory.grade) !== '') {
          nextSubject.theory.grade = undefined;
          gradeFieldChanges += 1;
        }
      } else {
        const derivedGrade = marksToLetterGradeWithPolicy(marks, policy);
        if (normalizeGrade(nextSubject.theory.grade) !== derivedGrade) {
          nextSubject.theory.grade = derivedGrade;
          gradeFieldChanges += 1;
        }

        const points = marksToGradePointsWithPolicy(marks, policy);
        components.push({
          credits,
          points,
          weighted: credits * points,
        });
      }
    }

    if (nextSubject.practical) {
      const marks = practicalTotal(nextSubject.practical);
      const credits = Math.max(0, toFiniteNumber(nextSubject.meta?.practicalCredits));
      if (credits <= 0) {
        if (normalizeGrade(nextSubject.practical.grade) !== '') {
          nextSubject.practical.grade = undefined;
          gradeFieldChanges += 1;
        }
      } else {
        const derivedGrade = marksToLetterGradeWithPolicy(marks, policy);
        if (normalizeGrade(nextSubject.practical.grade) !== derivedGrade) {
          nextSubject.practical.grade = derivedGrade;
          gradeFieldChanges += 1;
        }

        const points = marksToGradePointsWithPolicy(marks, policy);
        components.push({
          credits,
          points,
          weighted: credits * points,
        });
      }
    }

    return nextSubject;
  });

  return {
    subjects: nextSubjects,
    gradeFieldChanges,
    components,
  };
}

export async function recalculateAcademicGrading(
  request: AcademicRecalcRequest
): Promise<AcademicRecalcResult> {
  const policy = await getAcademicGradingPolicy();
  const dryRun = request.dryRun ?? false;
  const sampleChanges: AcademicRecalcSampleChange[] = [];

  const where = [isNull(ocSemesterMarks.deletedAt)];
  if (request.scope === 'courses' && request.courseIds?.length) {
    where.push(inArray(ocCadets.courseId, request.courseIds));
  }

  const rows = await db
    .select({
      id: ocSemesterMarks.id,
      ocId: ocSemesterMarks.ocId,
      semester: ocSemesterMarks.semester,
      courseId: ocCadets.courseId,
      subjects: ocSemesterMarks.subjects,
      sgpa: ocSemesterMarks.sgpa,
      cgpa: ocSemesterMarks.cgpa,
    })
    .from(ocSemesterMarks)
    .innerJoin(ocCadets, eq(ocCadets.id, ocSemesterMarks.ocId))
    .where(and(...where))
    .orderBy(ocSemesterMarks.ocId, ocSemesterMarks.semester);

  const rowsByOc = new Map<
    string,
    Array<{
      id: string;
      courseId: string;
      semester: number;
      subjects: SemesterSubjectRecord[];
      sgpa: number | null;
      cgpa: number | null;
    }>
  >();

  for (const row of rows) {
    const list = rowsByOc.get(row.ocId) ?? [];
    list.push({
      id: row.id,
      courseId: row.courseId,
      semester: row.semester,
      subjects: (row.subjects ?? []) as SemesterSubjectRecord[],
      sgpa: row.sgpa ?? null,
      cgpa: row.cgpa ?? null,
    });
    rowsByOc.set(row.ocId, list);
  }

  let changedRows = 0;
  let changedGradeFields = 0;
  let changedSummaryRows = 0;
  const affectedOcs = new Set<string>();
  const affectedCourses = new Set<string>();

  for (const [ocId, ocRows] of rowsByOc.entries()) {
    const sortedRows = [...ocRows].sort((a, b) => a.semester - b.semester);
    const semesterComputations = sortedRows.map((row) => recomputeRowSubjects(row.subjects, policy));
    const sgpaValues = semesterComputations.map((entry) => computeSgpa(entry.components, policy));
    const cgpaValues = sgpaValues.map((_, index) =>
      computeCgpa(
        sgpaValues.map((sgpa, i) => ({ sgpa, components: semesterComputations[i].components })),
        index,
        policy
      )
    );

    for (let i = 0; i < sortedRows.length; i += 1) {
      const current = sortedRows[i];
      const computation = semesterComputations[i];
      const nextSgpa = sgpaValues[i];
      const nextCgpa = cgpaValues[i];

      const sgpaChanged = roundPolicyValue(current.sgpa, policy.roundingScale) !== nextSgpa;
      const cgpaChanged = roundPolicyValue(current.cgpa, policy.roundingScale) !== nextCgpa;
      const gradesChanged = computation.gradeFieldChanges > 0;

      if (!gradesChanged && !sgpaChanged && !cgpaChanged) continue;

      changedRows += 1;
      changedGradeFields += computation.gradeFieldChanges;
      if (sgpaChanged || cgpaChanged) changedSummaryRows += 1;
      affectedOcs.add(ocId);
      affectedCourses.add(current.courseId);

      if (sampleChanges.length < 25) {
        if (sgpaChanged) {
          sampleChanges.push({
            ocId,
            courseId: current.courseId,
            semester: current.semester,
            field: 'sgpa',
            before: roundPolicyValue(current.sgpa, policy.roundingScale),
            after: nextSgpa,
          });
        }
        if (cgpaChanged && sampleChanges.length < 25) {
          sampleChanges.push({
            ocId,
            courseId: current.courseId,
            semester: current.semester,
            field: 'cgpa',
            before: roundPolicyValue(current.cgpa, policy.roundingScale),
            after: nextCgpa,
          });
        }
      }

      if (!dryRun) {
        await db
          .update(ocSemesterMarks)
          .set({
            subjects: computation.subjects,
            sgpa: nextSgpa,
            cgpa: nextCgpa,
            updatedAt: new Date(),
          })
          .where(eq(ocSemesterMarks.id, current.id));
      }
    }
  }

  return {
    dryRun,
    scope: request.scope,
    scannedRows: rows.length,
    changedRows,
    changedGradeFields,
    changedSummaryRows,
    affectedOcs: affectedOcs.size,
    affectedCourses: affectedCourses.size,
    sampleChanges,
  };
}

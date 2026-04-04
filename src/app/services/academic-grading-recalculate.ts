import { and, eq, inArray, isNull } from 'drizzle-orm';
import { db } from '@/app/db/client';
import { ocCadets, ocSemesterMarks, type SemesterSubjectRecord } from '@/app/db/schema/training/oc';
import {
  getAcademicGradingPolicy,
} from '@/app/db/queries/academicGradingPolicy';
import {
  roundPolicyValue,
  type AcademicGradingPolicy,
} from '@/app/lib/grading-policy';
import {
  buildAcademicGpaComponent,
  computeAcademicCgpa,
  computeAcademicSgpa,
  computePracticalTotalMarks,
  computeTheoryTotalMarks,
  derivePracticalLetterGrade,
  deriveTheoryLetterGrade,
  normalizeAcademicCredits,
  normalizeAcademicGrade,
  type AcademicCumulativeSemester,
  type AcademicGpaComponent,
} from '@/app/lib/academic-marks-core';

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

type RowComputation = {
  subjects: SemesterSubjectRecord[];
  gradeFieldChanges: number;
  components: AcademicGpaComponent[];
}

function recomputeRowSubjects(
  subjects: SemesterSubjectRecord[],
  policy: AcademicGradingPolicy
): RowComputation {
  let gradeFieldChanges = 0;
  const components: AcademicGpaComponent[] = [];

  const nextSubjects = subjects.map((subject) => {
    const nextSubject: SemesterSubjectRecord = {
      ...subject,
      theory: subject.theory ? { ...subject.theory } : subject.theory,
      practical: subject.practical ? { ...subject.practical } : subject.practical,
      meta: subject.meta ? { ...subject.meta } : subject.meta,
    };

    if (nextSubject.theory) {
      const marks = computeTheoryTotalMarks(nextSubject.theory);
      const credits = normalizeAcademicCredits(nextSubject.meta?.theoryCredits);
      if (credits <= 0) {
        if (normalizeAcademicGrade(nextSubject.theory.grade) !== '') {
          nextSubject.theory.grade = undefined;
          gradeFieldChanges += 1;
        }
      } else {
        const derivedGrade = deriveTheoryLetterGrade(nextSubject.theory, policy);
        if (normalizeAcademicGrade(nextSubject.theory.grade) !== derivedGrade) {
          nextSubject.theory.grade = derivedGrade;
          gradeFieldChanges += 1;
        }

        const component = buildAcademicGpaComponent(marks, credits, policy);
        if (component) components.push(component);
      }
    }

    if (nextSubject.practical) {
      const marks = computePracticalTotalMarks(nextSubject.practical);
      const credits = normalizeAcademicCredits(nextSubject.meta?.practicalCredits);
      if (credits <= 0) {
        if (normalizeAcademicGrade(nextSubject.practical.grade) !== '') {
          nextSubject.practical.grade = undefined;
          gradeFieldChanges += 1;
        }
      } else {
        const derivedGrade = derivePracticalLetterGrade(nextSubject.practical, policy);
        if (normalizeAcademicGrade(nextSubject.practical.grade) !== derivedGrade) {
          nextSubject.practical.grade = derivedGrade;
          gradeFieldChanges += 1;
        }

        const component = buildAcademicGpaComponent(marks, credits, policy);
        if (component) components.push(component);
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
    const sgpaValues = semesterComputations.map((entry) => computeAcademicSgpa(entry.components, policy));
    const cumulativeSemesters: AcademicCumulativeSemester[] = sgpaValues.map((sgpa, i) => ({
      sgpa,
      components: semesterComputations[i].components,
    }));
    const cgpaValues = sgpaValues.map((_, index) =>
      computeAcademicCgpa(cumulativeSemesters, index, policy)
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

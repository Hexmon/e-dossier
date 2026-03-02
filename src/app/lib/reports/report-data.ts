import { and, eq, isNull } from 'drizzle-orm';
import { ApiError } from '@/app/lib/http';
import { db } from '@/app/db/client';
import { listOCsBasic } from '@/app/db/queries/oc';
import { listCourseOfferings } from '@/app/db/queries/courses';
import { getOcAcademicSemester, getOcAcademics } from '@/app/services/oc-academics';
import { getPtTemplateBySemester } from '@/app/db/queries/physicalTraining';
import { listOcPtScoresByOcIds } from '@/app/db/queries/physicalTrainingOc';
import { courses } from '@/app/db/schema/training/courses';
import { courseOfferingInstructors } from '@/app/db/schema/training/courseOfferings';
import { instructors } from '@/app/db/schema/training/instructors';
import { FIXED_MARKS, REPORT_TYPES } from '@/app/lib/reports/types';
import { marksToGradePoints, marksToLetterGrade } from '@/app/lib/grading';
import type {
  ConsolidatedSessionalPreview,
  FinalResultCompilationPreview,
  FinalResultOcRow,
  FinalResultSubjectColumn,
  SemesterGradeCandidate,
  SemesterGradePreview,
  PtAssessmentPreview,
} from '@/types/reports';

function normalizeValue(value: number | null | undefined): number | null {
  if (value === null || value === undefined || Number.isNaN(value)) return null;
  return Number(value);
}

function resolveStoredOrDerivedLetterGrade(
  storedGrade: string | null | undefined,
  marks: number | null | undefined
): string {
  const normalized = String(storedGrade ?? '').trim();
  if (normalized) return normalized;
  return marksToLetterGrade(marks);
}

function summarizeGrades(values: Array<string | null | undefined>) {
  const fixedOrder = ['AP', 'AO', 'AM', 'BP', 'BO', 'BM', 'CP', 'CO', 'CM', 'F'];
  const map = new Map<string, number>();
  for (const value of values) {
    const grade = String(value ?? '').trim().toUpperCase();
    if (!grade) continue;
    map.set(grade, (map.get(grade) ?? 0) + 1);
  }

  const fixed = fixedOrder.map((grade) => ({ grade, count: map.get(grade) ?? 0 }));
  const extras = Array.from(map.entries())
    .filter(([grade]) => !fixedOrder.includes(grade))
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([grade, count]) => ({ grade, count }));

  return [...fixed, ...extras];
}

const FINAL_RESULT_GRADE_BANDS: FinalResultCompilationPreview['gradeBands'] = [
  { label: 'Outstanding Avg', range: '300-270' },
  { label: 'Well Above Avg', range: '269-240' },
  { label: 'Above Avg', range: '239-210' },
  { label: 'Just Above Avg', range: '209-180' },
  { label: 'High Avg', range: '179-150' },
  { label: 'Low Avg', range: '149-120' },
  { label: 'Just Below Avg', range: '119-90' },
  { label: 'Below Avg', range: '89-60' },
  { label: 'Well Below Avg', range: '59-30' },
  { label: 'Poor', range: '29-0' },
];

function safeNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function resolveTheoryTotalMarks(
  theory: {
    totalMarks?: number | null;
    phaseTest1Marks?: number | null;
    phaseTest2Marks?: number | null;
    tutorial?: string | number | null;
    finalMarks?: number | null;
  } | null | undefined
): number | null {
  if (!theory) return null;
  if (theory.totalMarks !== null && theory.totalMarks !== undefined && Number.isFinite(Number(theory.totalMarks))) {
    return Number(theory.totalMarks);
  }
  const total =
    safeNumber(theory.phaseTest1Marks) +
    safeNumber(theory.phaseTest2Marks) +
    safeNumber(theory.tutorial) +
    safeNumber(theory.finalMarks);
  return total > 0 ? total : null;
}

function resolvePracticalTotalMarks(
  practical: { totalMarks?: number | null; finalMarks?: number | null } | null | undefined
): number | null {
  if (!practical) return null;
  if (practical.totalMarks !== null && practical.totalMarks !== undefined && Number.isFinite(Number(practical.totalMarks))) {
    return Number(practical.totalMarks);
  }
  const total = safeNumber(practical.finalMarks);
  return total > 0 ? total : null;
}

function normalizeSubjectColumns(
  offerings: Awaited<ReturnType<typeof listCourseOfferings>>
): FinalResultSubjectColumn[] {
  const sorted = [...offerings].sort((a, b) => {
    const codeDiff = String(a.subject.code ?? '').localeCompare(String(b.subject.code ?? ''));
    if (codeDiff !== 0) return codeDiff;
    return String(a.subject.name ?? '').localeCompare(String(b.subject.name ?? ''));
  });

  let order = 0;
  const columns: FinalResultSubjectColumn[] = [];
  for (const offering of sorted) {
    const theoryCredits = Number(offering.theoryCredits ?? offering.subject.defaultTheoryCredits ?? 0);
    const practicalCredits = Number(offering.practicalCredits ?? offering.subject.defaultPracticalCredits ?? 0);

    if (offering.includeTheory) {
      columns.push({
        key: `${offering.subject.id}:L`,
        subjectId: offering.subject.id,
        subjectCode: offering.subject.code,
        subjectName: offering.subject.name,
        kind: 'L',
        credits: Number.isFinite(theoryCredits) ? theoryCredits : 0,
        order: order++,
      });
    }

    if (offering.includePractical) {
      columns.push({
        key: `${offering.subject.id}:P`,
        subjectId: offering.subject.id,
        subjectCode: offering.subject.code,
        subjectName: offering.subject.name,
        kind: 'P',
        credits: Number.isFinite(practicalCredits) ? practicalCredits : 0,
        order: order++,
      });
    }
  }

  return columns;
}

function computeSemesterSummary(view: Awaited<ReturnType<typeof getOcAcademicSemester>>) {
  let credits = 0;
  let points = 0;

  for (const subject of view.subjects ?? []) {
    if (subject.includeTheory) {
      const subjectCredits = Number(subject.theoryCredits ?? subject.subject.defaultTheoryCredits ?? 0);
      const total = resolveTheoryTotalMarks(subject.theory);
      credits += subjectCredits;
      points += subjectCredits * marksToGradePoints(total);
    }
    if (subject.includePractical) {
      const subjectCredits = Number(subject.practicalCredits ?? subject.subject.defaultPracticalCredits ?? 0);
      const total = resolvePracticalTotalMarks(subject.practical);
      credits += subjectCredits;
      points += subjectCredits * marksToGradePoints(total);
    }
  }

  return {
    credits,
    points,
    sgpa: view.sgpa ?? (credits > 0 ? points / credits : null),
  };
}

async function resolveCourse(courseId: string) {
  const [course] = await db
    .select({ id: courses.id, code: courses.code, title: courses.title })
    .from(courses)
    .where(and(eq(courses.id, courseId), isNull(courses.deletedAt)))
    .limit(1);

  if (!course) {
    throw new ApiError(404, 'Course not found.', 'not_found', { courseId });
  }
  return course;
}

export async function buildConsolidatedSessionalPreview(params: {
  courseId: string;
  semester: number;
  subjectId: string;
}): Promise<ConsolidatedSessionalPreview> {
  const [course, offerings, ocRows] = await Promise.all([
    resolveCourse(params.courseId),
    listCourseOfferings(params.courseId, params.semester),
    listOCsBasic({
      courseId: params.courseId,
      active: false,
      limit: 5000,
      sort: 'name_asc',
    }),
  ]);

  const selectedOffering = offerings.find((offering) => offering.subject.id === params.subjectId);
  if (!selectedOffering) {
    throw new ApiError(404, 'Subject offering not found for selected course and semester.', 'not_found', {
      courseId: params.courseId,
      semester: params.semester,
      subjectId: params.subjectId,
    });
  }

  const subjectBranch = String(selectedOffering.subject.branch ?? 'C').toUpperCase();
  const filteredOCs =
    params.semester <= 2 || subjectBranch === 'C'
      ? ocRows
      : ocRows.filter((oc) => String(oc.branch ?? '').toUpperCase() === subjectBranch);

  const semesterViews = await Promise.all(
    filteredOCs.map(async (oc) => {
      const view = await getOcAcademicSemester(oc.id, params.semester);
      return { oc, view };
    })
  );

  const theoryRows: ConsolidatedSessionalPreview['theoryRows'] = [];
  const practicalRows: ConsolidatedSessionalPreview['practicalRows'] = [];

  const offeringInstructorRows = await db
    .select({
      name: instructors.name,
      role: courseOfferingInstructors.role,
    })
    .from(courseOfferingInstructors)
    .innerJoin(instructors, eq(instructors.id, courseOfferingInstructors.instructorId))
    .where(
      and(
        eq(courseOfferingInstructors.offeringId, selectedOffering.id),
        isNull(instructors.deletedAt)
      )
    );

  const primaryInstructor =
    offeringInstructorRows.find((item) => item.role === 'PRIMARY') ?? offeringInstructorRows[0] ?? null;

  for (const [index, item] of semesterViews.entries()) {
    const subject = item.view.subjects.find(
      (entry) => entry.subject.id === params.subjectId || entry.subject.code === selectedOffering.subject.code
    );

    if (selectedOffering.includeTheory) {
      const phaseTest1 = normalizeValue(subject?.theory?.phaseTest1Marks ?? null);
      const phaseTest2 = normalizeValue(subject?.theory?.phaseTest2Marks ?? null);
      const tutorial = normalizeValue(subject?.theory?.tutorial ? Number(subject.theory.tutorial) : null);
      const sessional =
        phaseTest1 === null && phaseTest2 === null && tutorial === null
          ? null
          : (phaseTest1 ?? 0) + (phaseTest2 ?? 0) + (tutorial ?? 0);
      const finalObtained = normalizeValue(subject?.theory?.finalMarks ?? null);
      const totalObtained =
        sessional === null && finalObtained === null ? null : (sessional ?? 0) + (finalObtained ?? 0);

      theoryRows.push({
        ocId: item.oc.id,
        sNo: index + 1,
        ocNo: item.oc.ocNo,
        ocName: item.oc.name,
        branch: item.oc.branch,
        phaseTest1Obtained: phaseTest1,
        phaseTest1Max: FIXED_MARKS.phaseTest1Max,
        phaseTest2Obtained: phaseTest2,
        phaseTest2Max: FIXED_MARKS.phaseTest2Max,
        tutorialObtained: tutorial,
        tutorialMax: FIXED_MARKS.tutorialMax,
        sessionalObtained: sessional,
        sessionalMax: FIXED_MARKS.sessionalMax,
        finalObtained,
        finalMax: FIXED_MARKS.finalMax,
        totalObtained,
        totalMax: FIXED_MARKS.totalMax,
        letterGrade: resolveStoredOrDerivedLetterGrade(subject?.theory?.grade ?? null, totalObtained),
      });
    }

    if (selectedOffering.includePractical) {
      practicalRows.push({
        ocId: item.oc.id,
        sNo: index + 1,
        ocNo: item.oc.ocNo,
        ocName: item.oc.name,
        branch: item.oc.branch,
        practicalObtained: normalizeValue(subject?.practical?.finalMarks ?? null),
        practicalMax: Number(selectedOffering.practicalCredits ?? selectedOffering.subject.defaultPracticalCredits ?? 0),
        letterGrade: resolveStoredOrDerivedLetterGrade(
          subject?.practical?.grade ?? null,
          subject?.practical?.finalMarks ?? null
        ),
      });
    }
  }

  return {
    reportType: REPORT_TYPES.ACADEMICS_CONSOLIDATED_SESSIONAL,
    course,
    semester: params.semester,
    subject: {
      id: selectedOffering.subject.id,
      code: selectedOffering.subject.code,
      name: selectedOffering.subject.name,
      branch: (['C', 'E', 'M'].includes(selectedOffering.subject.branch)
        ? selectedOffering.subject.branch
        : 'C') as 'C' | 'E' | 'M',
      hasTheory: selectedOffering.includeTheory,
      hasPractical: selectedOffering.includePractical,
      theoryCredits: selectedOffering.theoryCredits ?? selectedOffering.subject.defaultTheoryCredits ?? null,
      practicalCredits:
        selectedOffering.practicalCredits ?? selectedOffering.subject.defaultPracticalCredits ?? null,
      instructorName: primaryInstructor?.name ?? null,
    },
    theoryRows,
    practicalRows,
    theorySummary: summarizeGrades(theoryRows.map((row) => row.letterGrade)),
    practicalSummary: summarizeGrades(practicalRows.map((row) => row.letterGrade)),
  };
}

export async function buildFinalResultCompilationPreview(params: {
  courseId: string;
  semester: number;
}): Promise<FinalResultCompilationPreview> {
  const [course, offerings, ocRows] = await Promise.all([
    resolveCourse(params.courseId),
    listCourseOfferings(params.courseId, params.semester),
    listOCsBasic({
      courseId: params.courseId,
      active: true,
      limit: 5000,
      sort: 'name_asc',
    }),
  ]);

  const subjectColumns = normalizeSubjectColumns(offerings);

  const ocViews = await Promise.all(
    ocRows.map(async (oc) => ({
      oc,
      views: await getOcAcademics(oc.id),
    }))
  );

  const rows: FinalResultOcRow[] = [];
  for (const [index, item] of ocViews.entries()) {
    const { oc, views } = item;
    const viewBySemester = new Map(views.map((view) => [view.semester, view]));
    const selectedView = viewBySemester.get(params.semester);

    const subjectGrades: Record<string, string | null> = {};
    const selectedSubjects = selectedView?.subjects ?? [];
    const selectedById = new Map(selectedSubjects.map((subject) => [subject.subject.id, subject]));
    const selectedByCode = new Map(selectedSubjects.map((subject) => [subject.subject.code, subject]));

    for (const column of subjectColumns) {
      const subject = selectedById.get(column.subjectId) ?? selectedByCode.get(column.subjectCode);
      if (!subject) {
        subjectGrades[column.key] = null;
        continue;
      }

      if (column.kind === 'L') {
        const marks = resolveTheoryTotalMarks(subject.theory);
        subjectGrades[column.key] = resolveStoredOrDerivedLetterGrade(subject.theory?.grade ?? null, marks);
      } else {
        const marks = resolvePracticalTotalMarks(subject.practical);
        subjectGrades[column.key] = resolveStoredOrDerivedLetterGrade(subject.practical?.grade ?? null, marks);
      }
    }

    let previousPoints = 0;
    let previousCredits = 0;
    let uptoPoints = 0;
    let uptoCredits = 0;

    for (const view of views) {
      if (view.semester > params.semester) continue;
      const summary = computeSemesterSummary(view);
      uptoPoints += summary.points;
      uptoCredits += summary.credits;
      if (view.semester < params.semester) {
        previousPoints += summary.points;
        previousCredits += summary.credits;
      }
    }

    const selectedSummary = selectedView
      ? computeSemesterSummary(selectedView)
      : {
          credits: subjectColumns.reduce((sum, item) => sum + item.credits, 0),
          points: 0,
          sgpa: null as number | null,
        };

    rows.push({
      ocId: oc.id,
      sNo: index + 1,
      tesNo: oc.ocNo,
      name: oc.name,
      previousCumulativePoints: Math.round(previousPoints),
      previousCumulativeCredits: previousCredits,
      previousCumulativeCgpa: previousCredits > 0 ? previousPoints / previousCredits : null,
      semesterPoints: Math.round(selectedSummary.points),
      semesterCredits: selectedSummary.credits,
      semesterSgpa: selectedSummary.sgpa,
      uptoSemesterPoints: Math.round(uptoPoints),
      uptoSemesterCredits: uptoCredits,
      uptoSemesterCgpa: uptoCredits > 0 ? uptoPoints / uptoCredits : null,
      subjectGrades,
    });
  }

  return {
    reportType: REPORT_TYPES.ACADEMICS_FINAL_RESULT_COMPILATION,
    course,
    semester: params.semester,
    subjectColumns,
    rows,
    gradeBands: FINAL_RESULT_GRADE_BANDS,
    semesterCreditsTotal: subjectColumns.reduce((sum, item) => sum + item.credits, 0),
    previousSemesterCreditsReference: Math.max(0, ...rows.map((row) => row.previousCumulativeCredits)),
    uptoSemesterCreditsReference: Math.max(0, ...rows.map((row) => row.uptoSemesterCredits)),
  };
}

export async function listSemesterGradeCandidates(params: {
  courseId: string;
  semester: number;
  branches?: Array<'E' | 'M' | 'O'>;
  q?: string;
}): Promise<SemesterGradeCandidate[]> {
  await resolveCourse(params.courseId);

  const rows = await listOCsBasic({
    courseId: params.courseId,
    active: true,
    q: params.q,
    limit: 5000,
    sort: 'name_asc',
  });

  const branchFilter = new Set((params.branches ?? []).map((b) => b.toUpperCase()));

  return rows
    .filter((row) => {
      if (!branchFilter.size) return true;
      const branch = String(row.branch ?? 'O').toUpperCase() as 'E' | 'M' | 'O';
      return branchFilter.has(branch);
    })
    .map((row) => ({
      ocId: row.id,
      ocNo: row.ocNo,
      name: row.name,
      branch: row.branch,
      courseId: row.courseId,
      courseCode: row.courseCode,
      courseTitle: row.courseTitle,
    }));
}

export async function buildSemesterGradePreview(params: {
  courseId: string;
  semester: number;
  ocId: string;
}): Promise<SemesterGradePreview> {
  const [course, candidates] = await Promise.all([
    resolveCourse(params.courseId),
    listOCsBasic({ courseId: params.courseId, active: true, limit: 5000 }),
  ]);

  const oc = candidates.find((item) => item.id === params.ocId);
  if (!oc) {
    throw new ApiError(404, 'OC not found in selected course.', 'not_found', {
      courseId: params.courseId,
      ocId: params.ocId,
    });
  }

  const [semesterView, allViews] = await Promise.all([
    getOcAcademicSemester(params.ocId, params.semester),
    getOcAcademics(params.ocId),
  ]);

  const subjectRows: SemesterGradePreview['subjects'] = [];
  let sNo = 1;

  for (const subject of semesterView.subjects) {
    if (subject.includeTheory) {
      const credits = Number(subject.theoryCredits ?? subject.subject.defaultTheoryCredits ?? 0);
      const totalMarks = normalizeValue(subject.theory?.totalMarks ?? null);
      const points = marksToGradePoints(totalMarks);
      subjectRows.push({
        sNo: sNo++,
        subject: subject.includePractical ? `${subject.subject.name} (Theory)` : subject.subject.name,
        credits,
        letterGrade: resolveStoredOrDerivedLetterGrade(subject.theory?.grade ?? null, totalMarks),
        totalMarks,
        gradePoints: points,
        weightedGradePoints: credits * points,
      });
    }

    if (subject.includePractical) {
      const credits = Number(subject.practicalCredits ?? subject.subject.defaultPracticalCredits ?? 0);
      const totalMarks = normalizeValue(subject.practical?.totalMarks ?? null);
      const points = marksToGradePoints(totalMarks);
      subjectRows.push({
        sNo: sNo++,
        subject: subject.includeTheory ? `${subject.subject.name} (Practical)` : subject.subject.name,
        credits,
        letterGrade: resolveStoredOrDerivedLetterGrade(subject.practical?.grade ?? null, totalMarks),
        totalMarks,
        gradePoints: points,
        weightedGradePoints: credits * points,
      });
    }
  }

  const currentTotalCredits = subjectRows.reduce((sum, row) => sum + row.credits, 0);
  const currentTotalGrades = subjectRows.reduce((sum, row) => sum + row.weightedGradePoints, 0);

  const allRows = allViews
    .filter((view) => view.semester <= params.semester)
    .flatMap((view) => {
      const rows: Array<{ credits: number; weighted: number }> = [];
      for (const subject of view.subjects) {
        if (subject.includeTheory) {
          const credits = Number(subject.theoryCredits ?? subject.subject.defaultTheoryCredits ?? 0);
          rows.push({ credits, weighted: credits * marksToGradePoints(subject.theory?.totalMarks ?? null) });
        }
        if (subject.includePractical) {
          const credits = Number(subject.practicalCredits ?? subject.subject.defaultPracticalCredits ?? 0);
          rows.push({ credits, weighted: credits * marksToGradePoints(subject.practical?.totalMarks ?? null) });
        }
      }
      return rows;
    });

  const cumulativeTotalCredits = allRows.reduce((sum, row) => sum + row.credits, 0);
  const cumulativeTotalGrades = allRows.reduce((sum, row) => sum + row.weighted, 0);

  const selectedSemesterFromAll = allViews.find((view) => view.semester === params.semester);

  return {
    reportType: REPORT_TYPES.ACADEMICS_SEMESTER_GRADE,
    oc: {
      id: oc.id,
      ocNo: oc.ocNo,
      name: oc.name,
      branch: oc.branch,
      jnuEnrollmentNo: null,
    },
    course,
    semester: params.semester,
    year: new Date().getFullYear(),
    subjects: subjectRows,
    currentSemester: {
      totalCredits: currentTotalCredits,
      totalGrades: currentTotalGrades,
      sgpa: selectedSemesterFromAll?.sgpa ?? (currentTotalCredits ? currentTotalGrades / currentTotalCredits : null),
    },
    cumulative: {
      totalCredits: cumulativeTotalCredits,
      totalGrades: cumulativeTotalGrades,
      cgpa:
        selectedSemesterFromAll?.cgpa ??
        (cumulativeTotalCredits ? cumulativeTotalGrades / cumulativeTotalCredits : null),
    },
    totalValidCreditsEarned: cumulativeTotalCredits,
  };
}

export async function buildPtAssessmentPreview(params: {
  courseId: string;
  semester: number;
  ptTypeId: string;
}): Promise<PtAssessmentPreview> {
  const [course, template, ocRows] = await Promise.all([
    resolveCourse(params.courseId),
    getPtTemplateBySemester(params.semester, { includeDeleted: false }),
    listOCsBasic({ courseId: params.courseId, active: true, limit: 5000, sort: 'name_asc' }),
  ]);

  const selectedType = template.types.find((type) => type.id === params.ptTypeId);
  if (!selectedType) {
    throw new ApiError(404, 'PT type not found for selected semester.', 'not_found', {
      semester: params.semester,
      ptTypeId: params.ptTypeId,
    });
  }

  const ocIds = ocRows.map((oc) => oc.id);
  const scoreRows = await listOcPtScoresByOcIds(ocIds, params.semester);
  const scoreMap = new Map<string, number>();
  for (const row of scoreRows) {
    scoreMap.set(`${row.ocId}:${row.ptTaskScoreId}`, row.marksScored);
  }

  const tasks = (selectedType.tasks ?? []).map((task) => ({
    taskId: task.id,
    title: task.title,
    maxMarks: task.maxMarks,
    attempts: (task.attempts ?? []).map((attempt) => ({
      attemptId: attempt.id,
      attemptCode: attempt.code,
      grades: (attempt.grades ?? []).map((grade) => ({
        gradeCode: grade.code,
        scoreId: grade.scoreId,
        maxMarks: grade.maxMarks,
      })),
    })),
  }));

  const rows = ocRows.map((oc, index) => {
    const cells: Record<string, number | null> = {};
    let totalMarksScored = 0;

    for (const task of tasks) {
      for (const attempt of task.attempts) {
        for (const grade of attempt.grades) {
          const key = `${task.taskId}:${attempt.attemptId}:${grade.gradeCode}`;
          const marks = grade.scoreId ? scoreMap.get(`${oc.id}:${grade.scoreId}`) ?? null : null;
          cells[key] = marks;
          if (marks !== null) {
            totalMarksScored += marks;
          }
        }
      }
    }

    return {
      ocId: oc.id,
      sNo: index + 1,
      tesNo: oc.ocNo,
      rank: 'Officer Cadet',
      name: oc.name,
      cells,
      totalMarksScored,
    };
  });

  return {
    reportType: REPORT_TYPES.MIL_TRAINING_PHYSICAL_ASSESSMENT,
    course,
    semester: params.semester,
    ptType: {
      id: selectedType.id,
      code: selectedType.code,
      title: selectedType.title,
    },
    tasks,
    rows,
  };
}

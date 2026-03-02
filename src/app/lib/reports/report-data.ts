import { and, eq, inArray, isNull } from 'drizzle-orm';
import { ApiError } from '@/app/lib/http';
import { db } from '@/app/db/client';
import { listOCsBasic } from '@/app/db/queries/oc';
import { listCourseOfferings } from '@/app/db/queries/courses';
import { getAcademicGradingPolicy } from '@/app/db/queries/academicGradingPolicy';
import { getOcAcademicSemester, getOcAcademics } from '@/app/services/oc-academics';
import { getPtTemplateBySemester } from '@/app/db/queries/physicalTraining';
import { listOcPtScoresByOcIds } from '@/app/db/queries/physicalTrainingOc';
import {
  getAllSemesterSourceMarks,
  getSemesterSourceScoresDetailed,
  getSprRecord,
} from '@/app/db/queries/performance-records';
import { courses } from '@/app/db/schema/training/courses';
import { courseOfferingInstructors } from '@/app/db/schema/training/courseOfferings';
import { instructors } from '@/app/db/schema/training/instructors';
import { ocCommissioning } from '@/app/db/schema/training/oc';
import { FIXED_MARKS, REPORT_TYPES } from '@/app/lib/reports/types';
import { FPR_MAX_MARKS, SPR_MAX_MARKS } from '@/app/services/performance-record.constants';
import {
  marksToGradePointsWithPolicy,
  marksToLetterGradeWithPolicy,
  type AcademicGradingPolicy,
} from '@/app/lib/grading-policy';
import type {
  ConsolidatedSessionalPreview,
  CourseWiseFinalPerformancePreview,
  CourseWisePerformanceColumn,
  CourseWisePerformancePreview,
  CourseWisePerformanceRow,
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

function normalizeNonNegativeValue(value: number | null | undefined): number | null {
  const normalized = normalizeValue(value);
  if (normalized === null) return null;
  return Math.max(0, normalized);
}

function resolveStoredOrDerivedLetterGrade(
  storedGrade: string | null | undefined,
  marks: number | null | undefined,
  policy: AcademicGradingPolicy
): string | null {
  const numericMarks = Number(marks);
  if (marks !== null && marks !== undefined && Number.isFinite(numericMarks)) {
    return marksToLetterGradeWithPolicy(numericMarks, policy);
  }

  const normalized = String(storedGrade ?? '').trim().toUpperCase();
  if (normalized) return normalized;
  return null;
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

const COURSE_WISE_BASE_COLUMNS: CourseWisePerformanceColumn[] = [
  { key: 'serNo', label: 'S. No', maxMarks: null },
  { key: 'tesNo', label: 'TES No', maxMarks: null },
  { key: 'rank', label: 'Rank', maxMarks: null },
  { key: 'name', label: 'Name', maxMarks: null },
  { key: 'academicsTotal', label: 'Academics Total Marks', maxMarks: 2500 },
  { key: 'academicsScaled', label: 'Academics Marks Scale to', maxMarks: 1350 },
  { key: 'ptSwimming', label: 'PT & Swimming', maxMarks: 150 },
  { key: 'games', label: 'Games incl X-Country', maxMarks: 100 },
  { key: 'olq', label: 'OLQ', maxMarks: 300 },
  { key: 'cfe', label: 'Credit for Excellence', maxMarks: 25 },
];

const COURSE_WISE_TAIL_COLUMNS: CourseWisePerformanceColumn[] = [
  { key: 'cdrMarks', label: "Cdr's Mks", maxMarks: 25 },
  { key: 'grandTotal', label: 'Grand Total', maxMarks: null },
  { key: 'percentage', label: '%', maxMarks: 100 },
];

function round2(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function safeNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function safePositiveNumber(value: unknown): number {
  return Math.max(0, safeNumber(value));
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
    safePositiveNumber(theory.phaseTest1Marks) +
    safePositiveNumber(theory.phaseTest2Marks) +
    safePositiveNumber(theory.tutorial) +
    safePositiveNumber(theory.finalMarks);
  return total > 0 ? total : null;
}

function resolvePracticalTotalMarks(
  practical: { totalMarks?: number | null; finalMarks?: number | null } | null | undefined
): number | null {
  if (!practical) return null;
  if (practical.totalMarks !== null && practical.totalMarks !== undefined && Number.isFinite(Number(practical.totalMarks))) {
    return Number(practical.totalMarks);
  }
  const total = safePositiveNumber(practical.finalMarks);
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

function computeSemesterSummary(
  view: Awaited<ReturnType<typeof getOcAcademicSemester>>,
  policy: AcademicGradingPolicy
) {
  let credits = 0;
  let points = 0;

  for (const subject of view.subjects ?? []) {
    if (subject.includeTheory) {
      const subjectCredits = Number(subject.theoryCredits ?? subject.subject.defaultTheoryCredits ?? 0);
      const total = resolveTheoryTotalMarks(subject.theory);
      credits += subjectCredits;
      points += subjectCredits * marksToGradePointsWithPolicy(total, policy);
    }
    if (subject.includePractical) {
      const subjectCredits = Number(subject.practicalCredits ?? subject.subject.defaultPracticalCredits ?? 0);
      const total = resolvePracticalTotalMarks(subject.practical);
      credits += subjectCredits;
      points += subjectCredits * marksToGradePointsWithPolicy(total, policy);
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
  const [course, offerings, ocRows, policy] = await Promise.all([
    resolveCourse(params.courseId),
    listCourseOfferings(params.courseId, params.semester),
    listOCsBasic({
      courseId: params.courseId,
      active: false,
      limit: 5000,
      sort: 'name_asc',
    }),
    getAcademicGradingPolicy(),
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
      const phaseTest1 = normalizeNonNegativeValue(subject?.theory?.phaseTest1Marks ?? null);
      const phaseTest2 = normalizeNonNegativeValue(subject?.theory?.phaseTest2Marks ?? null);
      const tutorial = normalizeNonNegativeValue(subject?.theory?.tutorial ? Number(subject.theory.tutorial) : null);
      const sessional =
        phaseTest1 === null && phaseTest2 === null && tutorial === null
          ? null
          : (phaseTest1 ?? 0) + (phaseTest2 ?? 0) + (tutorial ?? 0);
      const finalObtained = normalizeNonNegativeValue(subject?.theory?.finalMarks ?? null);
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
        letterGrade: resolveStoredOrDerivedLetterGrade(subject?.theory?.grade ?? null, totalObtained, policy),
      });
    }

    if (selectedOffering.includePractical) {
      practicalRows.push({
        ocId: item.oc.id,
        sNo: index + 1,
        ocNo: item.oc.ocNo,
        ocName: item.oc.name,
        branch: item.oc.branch,
        practicalObtained: normalizeNonNegativeValue(subject?.practical?.finalMarks ?? null),
        practicalMax: Number(selectedOffering.practicalCredits ?? selectedOffering.subject.defaultPracticalCredits ?? 0),
        letterGrade: resolveStoredOrDerivedLetterGrade(
          subject?.practical?.grade ?? null,
          subject?.practical?.finalMarks ?? null,
          policy
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
  const [course, offerings, ocRows, policy] = await Promise.all([
    resolveCourse(params.courseId),
    listCourseOfferings(params.courseId, params.semester),
    listOCsBasic({
      courseId: params.courseId,
      active: true,
      limit: 5000,
      sort: 'name_asc',
    }),
    getAcademicGradingPolicy(),
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
        subjectGrades[column.key] = resolveStoredOrDerivedLetterGrade(subject.theory?.grade ?? null, marks, policy);
      } else {
        const marks = resolvePracticalTotalMarks(subject.practical);
        subjectGrades[column.key] = resolveStoredOrDerivedLetterGrade(subject.practical?.grade ?? null, marks, policy);
      }
    }

    let previousPoints = 0;
    let previousCredits = 0;
    let uptoPoints = 0;
    let uptoCredits = 0;

    for (const view of views) {
      if (view.semester > params.semester) continue;
      const summary = computeSemesterSummary(view, policy);
      uptoPoints += summary.points;
      uptoCredits += summary.credits;
      if (view.semester < params.semester) {
        previousPoints += summary.points;
        previousCredits += summary.credits;
      }
    }

    const selectedSummary = selectedView
      ? computeSemesterSummary(selectedView, policy)
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

export async function buildCourseWisePerformancePreview(params: {
  courseId: string;
  semester: number;
}): Promise<CourseWisePerformancePreview> {
  const [course, ocRows] = await Promise.all([
    resolveCourse(params.courseId),
    listOCsBasic({
      courseId: params.courseId,
      active: true,
      limit: 5000,
      sort: 'name_asc',
    }),
  ]);

  const includeDrill = params.semester >= 4 && Number(SPR_MAX_MARKS[params.semester]?.drill ?? 0) > 0;
  const includeCamp = params.semester >= 5 && Number(SPR_MAX_MARKS[params.semester]?.camp ?? 0) > 0;
  const maxTotalForSemester = Number(SPR_MAX_MARKS[params.semester]?.total ?? 0);

  const dynamicColumns: CourseWisePerformanceColumn[] = [...COURSE_WISE_BASE_COLUMNS];
  if (includeDrill) {
    dynamicColumns.push({
      key: 'drill',
      label: 'Drill',
      maxMarks: Number(SPR_MAX_MARKS[params.semester]?.drill ?? 0),
    });
  }
  if (includeCamp) {
    dynamicColumns.push({
      key: 'camp',
      label: 'Camp',
      maxMarks: Number(SPR_MAX_MARKS[params.semester]?.camp ?? 0),
    });
  }
  dynamicColumns.push(
    ...COURSE_WISE_TAIL_COLUMNS.map((column) =>
      column.key === 'grandTotal'
        ? { ...column, maxMarks: maxTotalForSemester || null }
        : column
    )
  );

  const formulaParts = [
    'Academics Scaled',
    'PT & Swimming',
    'Games incl X-Country',
    'OLQ',
    'Credit for Excellence',
    ...(includeDrill ? ['Drill'] : []),
    ...(includeCamp ? ['Camp'] : []),
    "Cdr's Mks",
  ];

  const rows = await Promise.all(
    ocRows.map(async (oc, index): Promise<CourseWisePerformanceRow> => {
      const [source, sprRecord] = await Promise.all([
        getSemesterSourceScoresDetailed(oc.id, params.semester),
        getSprRecord(oc.id, params.semester),
      ]);

      const cdrMarks = Number(sprRecord?.cdrMarks ?? 0);
      const grandTotal =
        Number(source.academicsScaled ?? 0) +
        Number(source.ptSwimming ?? 0) +
        Number(source.games ?? 0) +
        Number(source.olq ?? 0) +
        Number(source.cfe ?? 0) +
        (includeDrill ? Number(source.drill ?? 0) : 0) +
        (includeCamp ? Number(source.camp ?? 0) : 0) +
        cdrMarks;

      const percentage = maxTotalForSemester > 0 ? (grandTotal / maxTotalForSemester) * 100 : 0;

      return {
        ocId: oc.id,
        sNo: index + 1,
        tesNo: oc.ocNo,
        rank: 'OC',
        name: oc.name,
        academicsTotal: round2(Number(source.academicsRawScored ?? 0)),
        academicsScaled: round2(Number(source.academicsScaled ?? 0)),
        ptSwimming: round2(Number(source.ptSwimming ?? 0)),
        games: round2(Number(source.games ?? 0)),
        olq: round2(Number(source.olq ?? 0)),
        cfe: round2(Number(source.cfe ?? 0)),
        drill: round2(Number(source.drill ?? 0)),
        camp: round2(Number(source.camp ?? 0)),
        cdrMarks: round2(cdrMarks),
        grandTotal: round2(grandTotal),
        percentage: round2(percentage),
      };
    })
  );

  return {
    reportType: REPORT_TYPES.OVERALL_TRAINING_COURSE_WISE_PERFORMANCE,
    course,
    semester: params.semester,
    columns: dynamicColumns,
    rows,
    maxTotalForSemester,
    formulaLabel: `Grand Total = ${formulaParts.join(' + ')}`,
  };
}

export async function buildCourseWiseFinalPerformancePreview(params: {
  courseId: string;
}): Promise<CourseWiseFinalPerformancePreview> {
  const [course, ocRows] = await Promise.all([
    resolveCourse(params.courseId),
    listOCsBasic({
      courseId: params.courseId,
      active: true,
      limit: 5000,
      sort: 'name_asc',
    }),
  ]);

  const ocIds = ocRows.map((oc) => oc.id);
  const omRows = ocIds.length
    ? await db
        .select({
          ocId: ocCommissioning.ocId,
          orderOfMerit: ocCommissioning.orderOfMerit,
        })
        .from(ocCommissioning)
        .where(inArray(ocCommissioning.ocId, ocIds))
    : [];
  const orderOfMeritByOc = new Map(omRows.map((row) => [row.ocId, row.orderOfMerit ?? null]));

  const rows = await Promise.all(
    ocRows.map(async (oc, index) => {
      const [allSemScores, sprRecords] = await Promise.all([
        getAllSemesterSourceMarks(oc.id),
        Promise.all([1, 2, 3, 4, 5, 6].map((semester) => getSprRecord(oc.id, semester))),
      ]);

      const academics = round2(
        [1, 2, 3, 4, 5, 6].reduce(
          (sum, semester) => sum + Number(allSemScores[semester]?.academics ?? 0),
          0
        )
      );
      const ptSwimming = round2(
        [1, 2, 3, 4, 5, 6].reduce(
          (sum, semester) => sum + Number(allSemScores[semester]?.ptSwimming ?? 0),
          0
        )
      );
      const games = round2(
        [1, 2, 3, 4, 5, 6].reduce(
          (sum, semester) => sum + Number(allSemScores[semester]?.games ?? 0),
          0
        )
      );
      const olq = round2(
        [1, 2, 3, 4, 5, 6].reduce(
          (sum, semester) => sum + Number(allSemScores[semester]?.olq ?? 0),
          0
        )
      );
      const cfe = round2(
        [1, 2, 3, 4, 5, 6].reduce(
          (sum, semester) => sum + Number(allSemScores[semester]?.cfe ?? 0),
          0
        )
      );
      const camp = round2(
        [1, 2, 3, 4, 5, 6].reduce(
          (sum, semester) => sum + Number(allSemScores[semester]?.camp ?? 0),
          0
        )
      );
      const drill = round2(
        [1, 2, 3, 4, 5, 6].reduce(
          (sum, semester) => sum + Number(allSemScores[semester]?.drill ?? 0),
          0
        )
      );
      const cdrMarks = round2(
        sprRecords.reduce((sum, record) => sum + Number(record?.cdrMarks ?? 0), 0)
      );

      const grandTotal = round2(
        academics + ptSwimming + games + olq + cfe + cdrMarks + camp + drill
      );
      const percentage = round2(
        FPR_MAX_MARKS.total > 0 ? (grandTotal / Number(FPR_MAX_MARKS.total)) * 100 : 0
      );

      return {
        ocId: oc.id,
        sNo: index + 1,
        tesNo: oc.ocNo,
        rank: 'OC',
        name: oc.name,
        academics,
        ptSwimming,
        games,
        olq,
        cfe,
        cdrMarks,
        camp,
        drill,
        grandTotal,
        percentage,
        orderOfMerit: orderOfMeritByOc.get(oc.id) ?? null,
        piAllotment: oc.platoonName ?? null,
      };
    })
  );

  return {
    reportType: REPORT_TYPES.OVERALL_TRAINING_COURSE_WISE_FINAL_PERFORMANCE,
    course,
    rows,
    formulaLabel:
      "Grand Total = Academics + PT & Swimming + Games + OLQ + CFE + Cdr's Mks + Camp + Drill",
    maxTotal: Number(FPR_MAX_MARKS.total),
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
  const [course, candidates, policy] = await Promise.all([
    resolveCourse(params.courseId),
    listOCsBasic({ courseId: params.courseId, active: true, limit: 5000 }),
    getAcademicGradingPolicy(),
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
      const points = marksToGradePointsWithPolicy(totalMarks, policy);
      subjectRows.push({
        sNo: sNo++,
        subject: subject.includePractical ? `${subject.subject.name} (Theory)` : subject.subject.name,
        credits,
        letterGrade: resolveStoredOrDerivedLetterGrade(subject.theory?.grade ?? null, totalMarks, policy),
        totalMarks,
        gradePoints: points,
        weightedGradePoints: credits * points,
      });
    }

    if (subject.includePractical) {
      const credits = Number(subject.practicalCredits ?? subject.subject.defaultPracticalCredits ?? 0);
      const totalMarks = normalizeValue(subject.practical?.totalMarks ?? null);
      const points = marksToGradePointsWithPolicy(totalMarks, policy);
      subjectRows.push({
        sNo: sNo++,
        subject: subject.includeTheory ? `${subject.subject.name} (Practical)` : subject.subject.name,
        credits,
        letterGrade: resolveStoredOrDerivedLetterGrade(subject.practical?.grade ?? null, totalMarks, policy),
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
          rows.push({
            credits,
            weighted: credits * marksToGradePointsWithPolicy(subject.theory?.totalMarks ?? null, policy),
          });
        }
        if (subject.includePractical) {
          const credits = Number(subject.practicalCredits ?? subject.subject.defaultPracticalCredits ?? 0);
          rows.push({
            credits,
            weighted: credits * marksToGradePointsWithPolicy(subject.practical?.totalMarks ?? null, policy),
          });
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

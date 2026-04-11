import { and, eq, inArray, isNull } from 'drizzle-orm';
import { ApiError } from '@/app/lib/http';
import { db } from '@/app/db/client';
import { listOCsBasic } from '@/app/db/queries/oc';
import { listCourseOfferings } from '@/app/db/queries/courses';
import { getAcademicGradingPolicy } from '@/app/db/queries/academicGradingPolicy';
import { getOcAcademicSemester, getOcAcademics } from '@/app/services/oc-academics';
import { getPtTemplateBySemester } from '@/app/db/queries/physicalTraining';
import { listOcPtScoresByOcIds } from '@/app/db/queries/physicalTrainingOc';
import { getSiteSettingsOrDefault } from '@/app/db/queries/site-settings';
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
  type AcademicGradingPolicy,
} from '@/app/lib/grading-policy';
import {
  buildAcademicGpaComponent,
  buildAcademicSubjectsGpaComponents,
  resolvePracticalTotalMarks,
  resolveStoredOrDerivedAcademicLetterGrade,
  resolveTheoryTotalMarks,
  summarizeAcademicSubjects,
} from '@/app/lib/academic-marks-core';
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
  ReportBranch,
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

function semesterToRoman(semester: number): string {
  const map: Record<number, string> = {
    1: 'I',
    2: 'II',
    3: 'III',
    4: 'IV',
    5: 'V',
    6: 'VI',
  };
  return map[semester] ?? String(semester);
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
  const grouped = new Map<string, FinalResultSubjectColumn>();
  for (const offering of sorted) {
    const groupingKey = offering.subject.id ?? offering.subject.code;
    let column = grouped.get(groupingKey);

    if (!column) {
      column = {
        subjectId: offering.subject.id,
        subjectCode: offering.subject.code,
        subjectName: offering.subject.name,
        branch: (offering.subject.branch ?? 'C') as 'C' | 'E' | 'M',
        order: order++,
        components: [],
      };
      grouped.set(groupingKey, column);
      columns.push(column);
    }

    const theoryCredits = Number(offering.theoryCredits ?? offering.subject.defaultTheoryCredits ?? 0);
    const practicalCredits = Number(offering.practicalCredits ?? offering.subject.defaultPracticalCredits ?? 0);

    if (offering.includeTheory) {
      column.components.push({
        key: `${offering.subject.id}:L`,
        kind: 'L',
        credits: Number.isFinite(theoryCredits) ? theoryCredits : 0,
      });
    }

    if (offering.includePractical) {
      column.components.push({
        key: `${offering.subject.id}:P`,
        kind: 'P',
        credits: Number.isFinite(practicalCredits) ? practicalCredits : 0,
      });
    }
  }

  return columns;
}

function totalSubjectCredits(columns: FinalResultSubjectColumn[]) {
  return columns.reduce(
    (sum, column) => sum + column.components.reduce((componentSum, component) => componentSum + component.credits, 0),
    0
  );
}

function buildFinalResultEnrollmentNumber(heroTitle: string | null | undefined, courseCode: string, jnuEnrollmentNo: string | null | undefined) {
  const prefix = String(heroTitle ?? '').trim() || 'MCEME';
  const enrollment = String(jnuEnrollmentNo ?? '').trim();
  if (!enrollment) return '';
  return `${prefix}/${courseCode}/${enrollment}`;
}

function buildFinalResultCertSerialNo(courseCode: string, semester: number, branchTag: 'C' | 'E' | 'M', serial: number) {
  return `${courseCode}/Sem-${semesterToRoman(semester)}(${branchTag})/${String(serial).padStart(2, '0')}`;
}

function toFinalResultBranchTag(branch: string | null | undefined): 'C' | 'E' | 'M' {
  const normalized = String(branch ?? '').trim().toUpperCase();
  if (normalized === 'E') return 'E';
  if (normalized === 'M') return 'M';
  return 'C';
}

function toFinalResultBranchFilter(branches: ReportBranch[] | undefined, semester: number) {
  if (semester <= 2) return new Set<'C' | 'E' | 'M'>();
  return new Set(branches?.map((branch) => toFinalResultBranchTag(branch)) ?? []);
}

function toOcBranchTag(branch: string | null | undefined): ReportBranch {
  const normalized = String(branch ?? '').trim().toUpperCase();
  if (normalized === 'E') return 'E';
  if (normalized === 'M') return 'M';
  return 'O';
}

function toConsolidatedSessionalBranchFilter(branches: ReportBranch[] | undefined) {
  return new Set((branches ?? []).map((branch) => toOcBranchTag(branch)));
}

function computeSemesterSummary(
  view: Awaited<ReturnType<typeof getOcAcademicSemester>>,
  policy: AcademicGradingPolicy
) {
  const summary = summarizeAcademicSubjects(view.subjects ?? [], policy);

  return {
    credits: summary.totalCredits,
    points: summary.totalWeighted,
    sgpa: view.sgpa ?? summary.sgpa,
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
  branches?: ReportBranch[];
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
  const subjectScopedOCs =
    params.semester <= 2 || subjectBranch === 'C'
      ? ocRows
      : ocRows.filter((oc) => String(oc.branch ?? '').toUpperCase() === subjectBranch);
  const selectedBranchFilter = toConsolidatedSessionalBranchFilter(params.branches);
  const filteredOCs = subjectScopedOCs.filter((oc) => {
    if (!selectedBranchFilter.size) return true;
    return selectedBranchFilter.has(toOcBranchTag(oc.branch));
  });

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
        letterGrade: resolveStoredOrDerivedAcademicLetterGrade(
          subject?.theory?.grade ?? null,
          totalObtained,
          policy
        ),
      });
    }

    if (selectedOffering.includePractical) {
      const contentOfExp = normalizeNonNegativeValue(subject?.practical?.contentOfExpMarks ?? null);
      const maintOfExp = normalizeNonNegativeValue(subject?.practical?.maintOfExpMarks ?? null);
      const practicalObtained = normalizeNonNegativeValue(subject?.practical?.practicalMarks ?? null);
      const vivaObtained = normalizeNonNegativeValue(subject?.practical?.vivaMarks ?? null);
      const totalObtained = normalizeNonNegativeValue(resolvePracticalTotalMarks(subject?.practical));

      practicalRows.push({
        ocId: item.oc.id,
        sNo: index + 1,
        ocNo: item.oc.ocNo,
        ocName: item.oc.name,
        branch: item.oc.branch,
        contentOfExpObtained: contentOfExp,
        contentOfExpMax: FIXED_MARKS.practicalContentMax,
        maintOfExpObtained: maintOfExp,
        maintOfExpMax: FIXED_MARKS.practicalMaintenanceMax,
        practicalObtained,
        practicalMax: FIXED_MARKS.practicalExamMax,
        vivaObtained,
        vivaMax: FIXED_MARKS.practicalVivaMax,
        totalObtained,
        totalMax: FIXED_MARKS.practicalTotalMax,
        letterGrade: resolveStoredOrDerivedAcademicLetterGrade(
          subject?.practical?.grade ?? null,
          totalObtained,
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
  branches?: ReportBranch[];
}): Promise<FinalResultCompilationPreview> {
  const [course, offerings, ocRows, policy, siteSettings] = await Promise.all([
    resolveCourse(params.courseId),
    listCourseOfferings(params.courseId, params.semester),
    listOCsBasic({
      courseId: params.courseId,
      active: true,
      limit: 5000,
      sort: 'name_asc',
    }),
    getAcademicGradingPolicy(),
    getSiteSettingsOrDefault(),
  ]);

  const selectedBranchFilter = toFinalResultBranchFilter(params.branches, params.semester);
  const filteredOfferings =
    !selectedBranchFilter.size
      ? offerings
      : offerings.filter((offering) => {
          const subjectBranch = toFinalResultBranchTag(offering.subject.branch);
          return subjectBranch === 'C' || selectedBranchFilter.has(subjectBranch);
        });

  const filteredOcRows =
    !selectedBranchFilter.size
      ? ocRows
      : ocRows.filter((oc) => selectedBranchFilter.has(toFinalResultBranchTag(oc.branch)));

  const subjectColumns = normalizeSubjectColumns(filteredOfferings);

  const ocViews = await Promise.all(
    filteredOcRows.map(async (oc) => ({
      oc,
      views: await getOcAcademics(oc.id),
    }))
  );

  const rows: FinalResultOcRow[] = [];
  const branchSerials = new Map<'C' | 'E' | 'M', number>();
  for (const [index, item] of ocViews.entries()) {
    const { oc, views } = item;
    const viewBySemester = new Map(views.map((view) => [view.semester, view]));
    const selectedView = viewBySemester.get(params.semester);
    const previousView = [...views]
      .filter((view) => view.semester < params.semester)
      .sort((left, right) => right.semester - left.semester)[0] ?? null;
    const branchTag = selectedView?.branchTag ?? (params.semester <= 2 ? 'C' : toFinalResultBranchTag(oc.branch));
    const nextBranchSerial = (branchSerials.get(branchTag) ?? 0) + 1;
    branchSerials.set(branchTag, nextBranchSerial);

    const subjectGrades: Record<string, string | null> = {};
    const selectedSubjects = selectedView?.subjects ?? [];
    const selectedById = new Map(selectedSubjects.map((subject) => [subject.subject.id, subject]));
    const selectedByCode = new Map(selectedSubjects.map((subject) => [subject.subject.code, subject]));

    for (const column of subjectColumns) {
      const subject = selectedById.get(column.subjectId) ?? selectedByCode.get(column.subjectCode);
      for (const component of column.components) {
        if (!subject) {
          subjectGrades[component.key] = null;
          continue;
        }

        if (component.kind === 'L') {
          const marks = resolveTheoryTotalMarks(subject.theory);
          subjectGrades[component.key] = resolveStoredOrDerivedAcademicLetterGrade(
            subject.theory?.grade ?? null,
            marks,
            policy
          );
        } else {
          const marks = resolvePracticalTotalMarks(subject.practical);
          subjectGrades[component.key] = resolveStoredOrDerivedAcademicLetterGrade(
            subject.practical?.grade ?? null,
            marks,
            policy
          );
        }
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
          credits: totalSubjectCredits(subjectColumns),
          points: 0,
          sgpa: null as number | null,
        };

    rows.push({
      ocId: oc.id,
      sNo: index + 1,
      tesNo: oc.ocNo,
      name: oc.name,
      branchTag,
      enrolmentNumber: buildFinalResultEnrollmentNumber(siteSettings.heroTitle, course.code, oc.jnuEnrollmentNo),
      certSerialNo: buildFinalResultCertSerialNo(course.code, params.semester, branchTag, nextBranchSerial),
      previousCumulativePoints: Math.round(previousPoints),
      previousCumulativeCredits: previousCredits,
      previousCumulativeCgpa: previousView?.cgpa ?? (previousCredits > 0 ? previousPoints / previousCredits : null),
      semesterPoints: Math.round(selectedSummary.points),
      semesterCredits: selectedSummary.credits,
      semesterSgpa: selectedView?.sgpa ?? selectedSummary.sgpa,
      uptoSemesterPoints: Math.round(uptoPoints),
      uptoSemesterCredits: uptoCredits,
      uptoSemesterCgpa: selectedView?.cgpa ?? (uptoCredits > 0 ? uptoPoints / uptoCredits : null),
      subjectGrades,
    });
  }

  return {
    reportType: REPORT_TYPES.ACADEMICS_FINAL_RESULT_COMPILATION,
    course,
    semester: params.semester,
    branches: params.semester <= 2 ? [] : params.branches ?? [],
    subjectColumns,
    rows,
    gradeBands: FINAL_RESULT_GRADE_BANDS,
    semesterCreditsTotal: totalSubjectCredits(subjectColumns),
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
  const [course, candidates, policy, siteSettings] = await Promise.all([
    resolveCourse(params.courseId),
    listOCsBasic({ courseId: params.courseId, active: true, limit: 5000 }),
    getAcademicGradingPolicy(),
    getSiteSettingsOrDefault(),
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
      const totalMarks = resolveTheoryTotalMarks(subject.theory);
      const component = buildAcademicGpaComponent(totalMarks, credits, policy);
      subjectRows.push({
        sNo: sNo++,
        subject: subject.includePractical ? `${subject.subject.name} (Theory)` : subject.subject.name,
        credits,
        letterGrade: resolveStoredOrDerivedAcademicLetterGrade(subject.theory?.grade ?? null, totalMarks, policy),
        totalMarks,
        gradePoints: component?.points ?? 0,
        weightedGradePoints: component?.weighted ?? 0,
      });
    }

    if (subject.includePractical) {
      const credits = Number(subject.practicalCredits ?? subject.subject.defaultPracticalCredits ?? 0);
      const totalMarks = resolvePracticalTotalMarks(subject.practical);
      const component = buildAcademicGpaComponent(totalMarks, credits, policy);
      subjectRows.push({
        sNo: sNo++,
        subject: subject.includeTheory ? `${subject.subject.name} (Practical)` : subject.subject.name,
        credits,
        letterGrade: resolveStoredOrDerivedAcademicLetterGrade(
          subject.practical?.grade ?? null,
          totalMarks,
          policy
        ),
        totalMarks,
        gradePoints: component?.points ?? 0,
        weightedGradePoints: component?.weighted ?? 0,
      });
    }
  }

  const currentTotalCredits = subjectRows.reduce((sum, row) => sum + row.credits, 0);
  const currentTotalGrades = subjectRows.reduce((sum, row) => sum + row.weightedGradePoints, 0);

  const allRows = allViews
    .filter((view) => view.semester <= params.semester)
    .flatMap((view) => buildAcademicSubjectsGpaComponents(view.subjects, policy));

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
      jnuEnrollmentNo: oc.jnuEnrollmentNo ?? null,
      enrolmentNumber: buildFinalResultEnrollmentNumber(siteSettings.heroTitle, course.code, oc.jnuEnrollmentNo),
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

  const isAllTypes = params.ptTypeId === 'ALL';
  const selectedType = isAllTypes ? null : template.types.find((type) => type.id === params.ptTypeId);
  if (!isAllTypes && !selectedType) {
    throw new ApiError(404, 'PT type not found for selected semester.', 'not_found', {
      semester: params.semester,
      ptTypeId: params.ptTypeId,
    });
  }
  const selectedTypes = isAllTypes ? template.types : selectedType ? [selectedType] : [];

  const ocIds = ocRows.map((oc) => oc.id);
  const scoreRows = await listOcPtScoresByOcIds(ocIds, params.semester);
  const selectedTypeIds = new Set(selectedTypes.map((type) => type.id));
  const scoreMap = new Map<string, (typeof scoreRows)[number]>();
  for (const row of scoreRows) {
    if (!selectedTypeIds.has(row.ptTypeId)) continue;
    const key = `${row.ocId}:${row.ptTaskId}`;
    const existing = scoreMap.get(key);
    const rowUpdatedAt = new Date(row.updatedAt ?? row.createdAt ?? 0).getTime();
    const existingUpdatedAt = existing ? new Date(existing.updatedAt ?? existing.createdAt ?? 0).getTime() : -1;
    if (!existing || rowUpdatedAt >= existingUpdatedAt) {
      scoreMap.set(key, row);
    }
  }

  const sections = selectedTypes.map((type) => {
    const tasks = (type.tasks ?? []).map((task) => ({
      taskId: task.id,
      title: task.title,
      maxMarks: task.maxMarks,
    }));

    const rows = ocRows.map((oc, index) => {
      const cells: Record<string, { attemptCode: string | null; gradeCode: string | null; marks: number | null }> = {};
      let totalMarksScored = 0;

      for (const task of tasks) {
        const score = scoreMap.get(`${oc.id}:${task.taskId}`);
        const marks = score?.marksScored ?? null;
        cells[task.taskId] = {
          attemptCode: score?.attemptCode ?? null,
          gradeCode: score?.gradeCode ?? null,
          marks,
        };
        if (marks !== null) {
          totalMarksScored += marks;
        }
      }

      return {
        ocId: oc.id,
        sNo: index + 1,
        tesNo: oc.ocNo,
        rank: 'OC',
        name: oc.name,
        cells,
        totalMarksScored,
      };
    });

    return {
      ptType: {
        id: type.id,
        code: type.code,
        title: type.title,
      },
      tasks,
      rows,
    };
  });

  return {
    reportType: REPORT_TYPES.MIL_TRAINING_PHYSICAL_ASSESSMENT,
    course,
    semester: params.semester,
    selection: {
      ptTypeId: params.ptTypeId,
      label: isAllTypes ? 'ALL' : `${selectedType?.code ?? ''} - ${selectedType?.title ?? ''}`,
      isAll: isAllTypes,
    },
    sections,
  };
}

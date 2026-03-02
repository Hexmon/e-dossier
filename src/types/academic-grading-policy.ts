import type { GradePointBand, LetterGradeBand } from '@/app/lib/grading';
import type { GpaFormulaTemplate } from '@/app/lib/grading-policy';

export type AcademicGradingPolicy = {
  id: string;
  singletonKey: string;
  letterGradeBands: LetterGradeBand[];
  gradePointBands: GradePointBand[];
  sgpaFormulaTemplate: GpaFormulaTemplate;
  cgpaFormulaTemplate: GpaFormulaTemplate;
  roundingScale: number;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AcademicGradingPolicyUpdateRequest = {
  letterGradeBands?: LetterGradeBand[];
  gradePointBands?: GradePointBand[];
  sgpaFormulaTemplate?: GpaFormulaTemplate;
  cgpaFormulaTemplate?: GpaFormulaTemplate;
  roundingScale?: number;
};

export type AcademicGradingPolicyRecalculateScope = 'all' | 'courses';

export type AcademicGradingPolicyRecalculateRequest = {
  dryRun?: boolean;
  scope: AcademicGradingPolicyRecalculateScope;
  courseIds?: string[];
};

export type AcademicGradingPolicySampleChange = {
  ocId: string;
  courseId: string;
  semester: number;
  field: string;
  before: string | number | null;
  after: string | number | null;
};

export type AcademicGradingPolicyRecalculateResult = {
  dryRun: boolean;
  scope: AcademicGradingPolicyRecalculateScope;
  scannedRows: number;
  changedRows: number;
  changedGradeFields: number;
  changedSummaryRows: number;
  affectedOcs: number;
  affectedCourses: number;
  sampleChanges: AcademicGradingPolicySampleChange[];
};

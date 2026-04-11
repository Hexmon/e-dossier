export const REPORT_TYPES = {
  ACADEMICS_CONSOLIDATED_SESSIONAL: 'ACADEMICS_CONSOLIDATED_SESSIONAL',
  ACADEMICS_SEMESTER_GRADE: 'ACADEMICS_SEMESTER_GRADE',
  ACADEMICS_FINAL_RESULT_COMPILATION: 'ACADEMICS_FINAL_RESULT_COMPILATION',
  MIL_TRAINING_PHYSICAL_ASSESSMENT: 'MIL_TRAINING_PHYSICAL_ASSESSMENT',
  OVERALL_TRAINING_COURSE_WISE_PERFORMANCE: 'OVERALL_TRAINING_COURSE_WISE_PERFORMANCE',
  OVERALL_TRAINING_COURSE_WISE_FINAL_PERFORMANCE:
    'OVERALL_TRAINING_COURSE_WISE_FINAL_PERFORMANCE',
} as const;

export type ReportType = (typeof REPORT_TYPES)[keyof typeof REPORT_TYPES];

export const FIXED_MARKS = {
  phaseTest1Max: 20,
  phaseTest2Max: 20,
  tutorialMax: 10,
  sessionalMax: 50,
  finalMax: 50,
  totalMax: 100,
  practicalContentMax: 20,
  practicalMaintenanceMax: 20,
  practicalExamMax: 45,
  practicalVivaMax: 15,
  practicalTotalMax: 100,
} as const;

export function normalizeBranch(value: string | null | undefined): 'E' | 'M' | 'O' {
  if (value === 'E' || value === 'M' || value === 'O') return value;
  return 'O';
}

export type ReportBranch = 'E' | 'M' | 'O';

export type CourseSemesterMetadata = {
  courseId: string;
  courseCode: string;
  currentSemester: number;
  allowedSemesters: number[];
};

export type ReportDownloadMeta = {
  password: string;
  preparedBy: string;
  checkedBy: string;
};

export type ConsolidatedTheoryRow = {
  ocId: string;
  sNo: number;
  ocNo: string;
  ocName: string;
  branch: string | null;
  phaseTest1Obtained: number | null;
  phaseTest1Max: number;
  phaseTest2Obtained: number | null;
  phaseTest2Max: number;
  tutorialObtained: number | null;
  tutorialMax: number;
  sessionalObtained: number | null;
  sessionalMax: number;
  finalObtained: number | null;
  finalMax: number;
  totalObtained: number | null;
  totalMax: number;
  letterGrade: string | null;
};

export type ConsolidatedPracticalRow = {
  ocId: string;
  sNo: number;
  ocNo: string;
  ocName: string;
  branch: string | null;
  conductOfExpObtained: number | null;
  conductOfExpMax: number;
  maintOfAppObtained: number | null;
  maintOfAppMax: number;
  practicalTestObtained: number | null;
  practicalTestMax: number;
  vivaVoceObtained: number | null;
  vivaVoceMax: number;
  totalObtained: number | null;
  totalMax: number;
  letterGrade: string | null;
};

export type GradeSummaryItem = {
  grade: string;
  count: number;
};

export type ConsolidatedSessionalPreview = {
  reportType: 'ACADEMICS_CONSOLIDATED_SESSIONAL';
  course: { id: string; code: string; title: string };
  semester: number;
  subject: {
    id: string;
    code: string;
    name: string;
    branch: 'C' | 'E' | 'M';
    noOfPhaseTests: number;
    hasTheory: boolean;
    hasPractical: boolean;
    theoryCredits: number | null;
    practicalCredits: number | null;
    instructorName: string | null;
  };
  theoryRows: ConsolidatedTheoryRow[];
  practicalRows: ConsolidatedPracticalRow[];
  theorySummary: GradeSummaryItem[];
  practicalSummary: GradeSummaryItem[];
};

export type SemesterGradeCandidate = {
  ocId: string;
  ocNo: string;
  name: string;
  branch: string | null;
  courseId: string;
  courseCode: string | null;
  courseTitle: string | null;
};

export type SemesterGradeSubjectRow = {
  sNo: number;
  subject: string;
  credits: number;
  letterGrade: string | null;
  totalMarks: number | null;
  gradePoints: number;
  weightedGradePoints: number;
};

export type SemesterGradePreview = {
  reportType: 'ACADEMICS_SEMESTER_GRADE';
  oc: {
    id: string;
    ocNo: string;
    name: string;
    branch: string | null;
    jnuEnrollmentNo: string | null;
  };
  course: {
    id: string;
    code: string;
    title: string;
  };
  semester: number;
  year: number;
  subjects: SemesterGradeSubjectRow[];
  currentSemester: {
    totalCredits: number;
    totalGrades: number;
    sgpa: number | null;
  };
  cumulative: {
    totalCredits: number;
    totalGrades: number;
    cgpa: number | null;
  };
  totalValidCreditsEarned: number;
};

export type PtAssessmentTask = {
  taskId: string;
  title: string;
  maxMarks: number;
};

export type PtAssessmentTaskCell = {
  attemptCode: string | null;
  gradeCode: string | null;
  marks: number | null;
};

export type PtAssessmentRow = {
  ocId: string;
  sNo: number;
  tesNo: string;
  rank: string;
  name: string;
  cells: Record<string, PtAssessmentTaskCell>;
  totalMarksScored: number;
};

export type PtAssessmentTypeSection = {
  ptType: {
    id: string;
    code: string;
    title: string;
  };
  tasks: PtAssessmentTask[];
  rows: PtAssessmentRow[];
};

export type PtAssessmentPreview = {
  reportType: 'MIL_TRAINING_PHYSICAL_ASSESSMENT';
  course: { id: string; code: string; title: string };
  semester: number;
  selection: {
    ptTypeId: string;
    label: string;
    isAll: boolean;
  };
  sections: PtAssessmentTypeSection[];
};

export type SemesterGradeDownloadRequest = {
  courseId: string;
  semester: number;
  ocIds: string[];
  password: string;
  preparedBy: string;
  checkedBy: string;
};

export type ConsolidatedDownloadRequest = {
  courseId: string;
  semester: number;
  subjectId: string;
  password: string;
  preparedBy?: string;
  checkedBy?: string;
  instructorName?: string;
};

export type PtAssessmentDownloadRequest = {
  courseId: string;
  semester: number;
  ptTypeId: string;
  password: string;
  preparedBy: string;
  checkedBy: string;
};

export type CourseWisePerformanceColumn = {
  key:
    | 'serNo'
    | 'tesNo'
    | 'rank'
    | 'name'
    | 'academicsTotal'
    | 'academicsScaled'
    | 'ptSwimming'
    | 'games'
    | 'olq'
    | 'cfe'
    | 'drill'
    | 'camp'
    | 'cdrMarks'
    | 'grandTotal'
    | 'percentage';
  label: string;
  maxMarks: number | null;
};

export type CourseWisePerformanceRow = {
  ocId: string;
  sNo: number;
  tesNo: string;
  rank: string;
  name: string;
  academicsTotal: number;
  academicsScaled: number;
  ptSwimming: number;
  games: number;
  olq: number;
  cfe: number;
  drill: number;
  camp: number;
  cdrMarks: number;
  grandTotal: number;
  percentage: number;
};

export type CourseWisePerformancePreview = {
  reportType: 'OVERALL_TRAINING_COURSE_WISE_PERFORMANCE';
  course: { id: string; code: string; title: string };
  semester: number;
  columns: CourseWisePerformanceColumn[];
  rows: CourseWisePerformanceRow[];
  maxTotalForSemester: number;
  formulaLabel: string;
};

export type FinalResultSubjectColumn = {
  subjectId: string;
  subjectCode: string;
  subjectName: string;
  branch: 'C' | 'E' | 'M';
  order: number;
  components: Array<{
    key: string;
    kind: 'L' | 'P';
    credits: number;
  }>;
};

export type FinalResultGradeBand = {
  label: string;
  range: string;
};

export type FinalResultOcRow = {
  ocId: string;
  sNo: number;
  tesNo: string;
  name: string;
  branchTag: 'C' | 'E' | 'M';
  enrolmentNumber: string;
  certSerialNo: string;
  previousCumulativePoints: number;
  previousCumulativeCredits: number;
  previousCumulativeCgpa: number | null;
  semesterPoints: number;
  semesterCredits: number;
  semesterSgpa: number | null;
  uptoSemesterPoints: number;
  uptoSemesterCredits: number;
  uptoSemesterCgpa: number | null;
  subjectGrades: Record<string, string | null>;
};

export type FinalResultCompilationPreview = {
  reportType: 'ACADEMICS_FINAL_RESULT_COMPILATION';
  course: { id: string; code: string; title: string };
  semester: number;
  subjectColumns: FinalResultSubjectColumn[];
  rows: FinalResultOcRow[];
  gradeBands: FinalResultGradeBand[];
  semesterCreditsTotal: number;
  previousSemesterCreditsReference: number;
  uptoSemesterCreditsReference: number;
};

export type FinalResultIdentityRow = {
  ocId: string;
  enrolmentNumber?: string;
  certSerialNo?: string;
};

export type FinalResultDownloadRequest = {
  courseId: string;
  semester: number;
  password: string;
  preparedBy?: string;
  checkedBy?: string;
};

export type CourseWisePerformanceDownloadRequest = {
  courseId: string;
  semester: number;
  password: string;
};

export type CourseWiseFinalPerformanceRow = {
  ocId: string;
  sNo: number;
  tesNo: string;
  rank: string;
  name: string;
  academics: number;
  ptSwimming: number;
  games: number;
  olq: number;
  cfe: number;
  cdrMarks: number;
  camp: number;
  drill: number;
  grandTotal: number;
  percentage: number;
  orderOfMerit: number | null;
  piAllotment: string | null;
};

export type CourseWiseFinalPerformancePreview = {
  reportType: 'OVERALL_TRAINING_COURSE_WISE_FINAL_PERFORMANCE';
  course: { id: string; code: string; title: string };
  rows: CourseWiseFinalPerformanceRow[];
  formulaLabel: string;
  maxTotal: number;
};

export type CourseWiseFinalPerformanceDownloadRequest = {
  courseId: string;
  password: string;
};

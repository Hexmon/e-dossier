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
  practicalObtained: number | null;
  practicalMax: number;
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

export type PtAssessmentGradeCell = {
  gradeCode: string;
  scoreId: string | null;
  maxMarks: number | null;
};

export type PtAssessmentAttempt = {
  attemptId: string;
  attemptCode: string;
  grades: PtAssessmentGradeCell[];
};

export type PtAssessmentTask = {
  taskId: string;
  title: string;
  maxMarks: number;
  attempts: PtAssessmentAttempt[];
};

export type PtAssessmentRow = {
  ocId: string;
  sNo: number;
  tesNo: string;
  rank: string;
  name: string;
  cells: Record<string, number | null>;
  totalMarksScored: number;
};

export type PtAssessmentPreview = {
  reportType: 'MIL_TRAINING_PHYSICAL_ASSESSMENT';
  course: { id: string; code: string; title: string };
  semester: number;
  ptType: {
    id: string;
    code: string;
    title: string;
  };
  tasks: PtAssessmentTask[];
  rows: PtAssessmentRow[];
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
  preparedBy: string;
  checkedBy: string;
};

export type PtAssessmentDownloadRequest = {
  courseId: string;
  semester: number;
  ptTypeId: string;
  password: string;
  preparedBy: string;
  checkedBy: string;
};

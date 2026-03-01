export type OrgTemplateModule = "pt" | "camp";

export type PtTemplateProfile = "default";

export type PtGradeBand = {
  code: string;
  label: string;
  sortOrder: number;
  isActive?: boolean;
};

export type PtAttemptTemplate = {
  code: string;
  label: string;
  isCompensatory: boolean;
  sortOrder: number;
  isActive?: boolean;
  grades: PtGradeBand[];
};

export type PtTaskScoreTemplate = {
  attemptCode: string;
  gradeCode: string;
  maxMarks: number;
};

export type PtTaskTemplate = {
  title: string;
  maxMarks: number;
  sortOrder: number;
  scoreMatrix: PtTaskScoreTemplate[];
};

export type PtTypeTemplate = {
  code: string;
  title: string;
  description?: string | null;
  maxTotalMarks: number;
  sortOrder: number;
  isActive?: boolean;
  attempts: PtAttemptTemplate[];
  tasks: PtTaskTemplate[];
};

export type PtMotivationFieldTemplate = {
  label: string;
  sortOrder: number;
  isActive?: boolean;
};

export type PtSemesterTemplate = {
  semester: number;
  ptTypes: PtTypeTemplate[];
  motivationFields: PtMotivationFieldTemplate[];
};

export type PtTemplatePack = {
  module: "pt";
  version: string;
  profile: PtTemplateProfile;
  notes?: {
    additionalAttemptsRule?: string;
    summary?: string;
  };
  semesters: PtSemesterTemplate[];
};

export type PtTemplateApplyStats = {
  created: number;
  updated: number;
  skipped: number;
};

export type PtTemplateApplyResult = {
  module: "pt";
  profile: PtTemplateProfile;
  dryRun: boolean;
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
  warnings: string[];
  stats: {
    ptTypes: PtTemplateApplyStats;
    attempts: PtTemplateApplyStats;
    grades: PtTemplateApplyStats;
    tasks: PtTemplateApplyStats;
    taskScores: PtTemplateApplyStats;
    motivationFields: PtTemplateApplyStats;
  };
};

export type CampTemplateProfile = "default";

export type CampActivityTemplate = {
  name: string;
  defaultMaxMarks: number;
  sortOrder: number;
};

export type CampTemplate = {
  semester: 1 | 2 | 3 | 4 | 5 | 6;
  name: string;
  sortOrder: number;
  maxTotalMarks: number;
  performanceTitle?: string | null;
  performanceGuidance?: string | null;
  signaturePrimaryLabel?: string | null;
  signatureSecondaryLabel?: string | null;
  noteLine1?: string | null;
  noteLine2?: string | null;
  showAggregateSummary?: boolean;
  activities: CampActivityTemplate[];
};

export type CampTemplatePack = {
  module: "camp";
  version: string;
  profile: CampTemplateProfile;
  camps: CampTemplate[];
};

export type CampTemplateApplyResult = {
  module: "camp";
  profile: CampTemplateProfile;
  dryRun: boolean;
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
  warnings: string[];
  stats: {
    camps: PtTemplateApplyStats;
    activities: PtTemplateApplyStats;
  };
};

export type OrgTemplateApplyResult = PtTemplateApplyResult | CampTemplateApplyResult;

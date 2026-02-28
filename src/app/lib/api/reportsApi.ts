import { api } from '@/app/lib/apiClient';
import { endpoints } from '@/constants/endpoints';
import type {
  ConsolidatedSessionalPreview,
  CourseSemesterMetadata,
  PtAssessmentPreview,
  ReportBranch,
  SemesterGradeCandidate,
  SemesterGradePreview,
} from '@/types/reports';

export type CourseSemesterMetadataResponse = {
  message: string;
  data: CourseSemesterMetadata & { courseTitle: string };
};

export type ConsolidatedPreviewResponse = {
  message: string;
  data: ConsolidatedSessionalPreview;
};

export type SemesterGradeCandidatesResponse = {
  message: string;
  items: SemesterGradeCandidate[];
  count: number;
};

export type SemesterGradePreviewResponse = {
  message: string;
  data: SemesterGradePreview;
};

export type PtAssessmentPreviewResponse = {
  message: string;
  data: PtAssessmentPreview;
};

export const reportsApi = {
  getCourseSemesters(courseId: string) {
    return api.get<CourseSemesterMetadataResponse>(endpoints.reports.metadata.courseSemesters, {
      query: { courseId },
    });
  },

  getConsolidatedSessionalPreview(params: {
    courseId: string;
    semester: number;
    subjectId: string;
  }) {
    return api.get<ConsolidatedPreviewResponse>(
      endpoints.reports.academics.consolidatedSessional.preview,
      {
        query: params,
      }
    );
  },

  getSemesterGradeCandidates(params: {
    courseId: string;
    semester: number;
    branches?: ReportBranch[];
    q?: string;
  }) {
    return api.get<SemesterGradeCandidatesResponse>(
      endpoints.reports.academics.semesterGrade.candidates,
      {
        query: {
          courseId: params.courseId,
          semester: params.semester,
          branches: (params.branches ?? []).join(','),
          q: params.q || undefined,
        },
      }
    );
  },

  getSemesterGradePreview(params: {
    courseId: string;
    semester: number;
    ocId: string;
  }) {
    return api.get<SemesterGradePreviewResponse>(
      endpoints.reports.academics.semesterGrade.preview(params.ocId),
      {
        query: {
          courseId: params.courseId,
          semester: params.semester,
        },
      }
    );
  },

  getPtAssessmentPreview(params: {
    courseId: string;
    semester: number;
    ptTypeId: string;
  }) {
    return api.get<PtAssessmentPreviewResponse>(
      endpoints.reports.milTraining.physicalAssessment.preview,
      {
        query: params,
      }
    );
  },
};

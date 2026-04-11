import { useMutation, useQuery } from '@tanstack/react-query';
import { reportsApi } from '@/app/lib/api/reportsApi';
import { reportsDownloadApi } from '@/app/lib/api/reportsDownloadApi';
import type {
  ConsolidatedDownloadRequest,
  CourseWiseFinalPerformanceDownloadRequest,
  CourseWisePerformanceDownloadRequest,
  FinalResultDownloadRequest,
  PtAssessmentDownloadRequest,
  ReportBranch,
  SemesterGradeDownloadRequest,
} from '@/types/reports';

export function useCourseSemesters(courseId: string | null) {
  return useQuery({
    queryKey: ['reports', 'course-semesters', courseId],
    queryFn: () => reportsApi.getCourseSemesters(courseId as string),
    enabled: Boolean(courseId),
  });
}

export function useConsolidatedSessionalPreview(filters: {
  courseId: string;
  semester: number | null;
  subjectId: string;
  branches: ReportBranch[];
  enabled?: boolean;
}) {
  const isEnabled =
    (filters.enabled ?? true) && Boolean(filters.courseId && filters.semester && filters.subjectId);

  return useQuery({
    queryKey: ['reports', 'consolidated-sessional', filters.courseId, filters.semester, filters.subjectId, filters.branches],
    queryFn: () =>
      reportsApi.getConsolidatedSessionalPreview({
        courseId: filters.courseId,
        semester: filters.semester as number,
        subjectId: filters.subjectId,
        branches: filters.branches,
      }),
    enabled: isEnabled,
  });
}

export function useFinalResultCompilationPreview(filters: {
  courseId: string;
  semester: number | null;
  branches: ReportBranch[];
  enabled?: boolean;
}) {
  const isEnabled = (filters.enabled ?? true) && Boolean(filters.courseId && filters.semester);

  return useQuery({
    queryKey: ['reports', 'final-result-compilation', filters.courseId, filters.semester, filters.branches],
    queryFn: () =>
      reportsApi.getFinalResultCompilationPreview({
        courseId: filters.courseId,
        semester: filters.semester as number,
        branches: filters.branches,
      }),
    enabled: isEnabled,
  });
}

export function useSemesterGradeCandidates(filters: {
  courseId: string;
  semester: number | null;
  branches: ReportBranch[];
  q: string;
}) {
  return useQuery({
    queryKey: ['reports', 'semester-grade', 'candidates', filters.courseId, filters.semester, filters.branches, filters.q],
    queryFn: () =>
      reportsApi.getSemesterGradeCandidates({
        courseId: filters.courseId,
        semester: filters.semester as number,
        branches: filters.branches,
        q: filters.q,
      }),
    enabled: Boolean(filters.courseId && filters.semester),
  });
}

export function useSemesterGradePreview(filters: {
  courseId: string;
  semester: number | null;
  ocId: string | null;
}) {
  return useQuery({
    queryKey: ['reports', 'semester-grade', 'preview', filters.courseId, filters.semester, filters.ocId],
    queryFn: () =>
      reportsApi.getSemesterGradePreview({
        courseId: filters.courseId,
        semester: filters.semester as number,
        ocId: filters.ocId as string,
      }),
    enabled: Boolean(filters.courseId && filters.semester && filters.ocId),
  });
}

export function usePtAssessmentPreview(filters: {
  courseId: string;
  semester: number | null;
  ptTypeId: string;
}) {
  return useQuery({
    queryKey: ['reports', 'pt-assessment', filters.courseId, filters.semester, filters.ptTypeId],
    queryFn: () =>
      reportsApi.getPtAssessmentPreview({
        courseId: filters.courseId,
        semester: filters.semester as number,
        ptTypeId: filters.ptTypeId,
      }),
    enabled: Boolean(filters.courseId && filters.semester && filters.ptTypeId),
  });
}

export function useCourseWisePerformancePreview(filters: {
  courseId: string;
  semester: number | null;
  enabled?: boolean;
}) {
  const isEnabled = (filters.enabled ?? true) && Boolean(filters.courseId && filters.semester);

  return useQuery({
    queryKey: ['reports', 'course-wise-performance', filters.courseId, filters.semester],
    queryFn: () =>
      reportsApi.getCourseWisePerformancePreview({
        courseId: filters.courseId,
        semester: filters.semester as number,
      }),
    enabled: isEnabled,
  });
}

export function useCourseWiseFinalPerformancePreview(filters: {
  courseId: string;
  enabled?: boolean;
}) {
  const isEnabled = (filters.enabled ?? true) && Boolean(filters.courseId);

  return useQuery({
    queryKey: ['reports', 'course-wise-final-performance', filters.courseId],
    queryFn: () =>
      reportsApi.getCourseWiseFinalPerformancePreview({
        courseId: filters.courseId,
      }),
    enabled: isEnabled,
  });
}

export function useReportsDownloads() {
  const consolidatedDownload = useMutation({
    mutationFn: (payload: ConsolidatedDownloadRequest) =>
      reportsDownloadApi.downloadConsolidatedSessional(payload),
  });

  const finalResultCompilationDownload = useMutation({
    mutationFn: (payload: FinalResultDownloadRequest) =>
      reportsDownloadApi.downloadFinalResultCompilation(payload),
  });

  const semesterGradeDownload = useMutation({
    mutationFn: (payload: SemesterGradeDownloadRequest) =>
      reportsDownloadApi.downloadSemesterGrade(payload),
  });

  const ptAssessmentDownload = useMutation({
    mutationFn: (payload: PtAssessmentDownloadRequest) =>
      reportsDownloadApi.downloadPtAssessment(payload),
  });

  const courseWisePerformanceDownload = useMutation({
    mutationFn: (payload: CourseWisePerformanceDownloadRequest) =>
      reportsDownloadApi.downloadCourseWisePerformance(payload),
  });

  const courseWiseFinalPerformanceDownload = useMutation({
    mutationFn: (payload: CourseWiseFinalPerformanceDownloadRequest) =>
      reportsDownloadApi.downloadCourseWiseFinalPerformance(payload),
  });

  return {
    consolidatedDownload,
    finalResultCompilationDownload,
    semesterGradeDownload,
    ptAssessmentDownload,
    courseWisePerformanceDownload,
    courseWiseFinalPerformanceDownload,
  };
}

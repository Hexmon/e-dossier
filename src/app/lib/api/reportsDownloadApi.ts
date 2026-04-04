import { endpoints } from '@/constants/endpoints';
import type {
  ConsolidatedDownloadRequest,
  CourseWiseFinalPerformanceDownloadRequest,
  CourseWisePerformanceDownloadRequest,
  FinalResultDownloadRequest,
  PtAssessmentDownloadRequest,
  SemesterGradeDownloadRequest,
} from '@/types/reports';

let csrfToken: string | null = null;
let csrfPromise: Promise<void> | null = null;

function parseFileNameFromDisposition(disposition: string | null, fallback: string) {
  if (!disposition) return fallback;
  const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1]);
  }
  const plainMatch = disposition.match(/filename="?([^";]+)"?/i);
  if (plainMatch?.[1]) {
    return plainMatch[1];
  }
  return fallback;
}

async function ensureCsrfToken() {
  if (typeof window === 'undefined') return;
  if (csrfToken) return;
  if (!csrfPromise) {
    csrfPromise = (async () => {
      try {
        const response = await fetch('/api/v1/health', {
          method: 'GET',
          credentials: 'include',
        });
        const token = response.headers.get('X-CSRF-Token');
        if (token) csrfToken = token;
      } finally {
        csrfPromise = null;
      }
    })();
  }
  await csrfPromise;
}

async function postDownload(payload: {
  endpoint: string;
  body: Record<string, unknown>;
  fallbackFileName: string;
}) {
  await ensureCsrfToken();

  const response = await fetch(payload.endpoint, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
    },
    body: JSON.stringify(payload.body),
  });

  const headerToken = response.headers.get('X-CSRF-Token');
  if (headerToken) csrfToken = headerToken;

  if (!response.ok) {
    let message = 'Download failed';
    try {
      const body = (await response.json()) as { message?: string };
      if (body.message) message = body.message;
    } catch {
      // no-op
    }
    throw new Error(message);
  }

  const blob = await response.blob();
  const disposition = response.headers.get('Content-Disposition');
  const fileName = parseFileNameFromDisposition(disposition, payload.fallbackFileName);

  const link = document.createElement('a');
  const objectUrl = URL.createObjectURL(blob);
  try {
    link.href = objectUrl;
    link.download = fileName;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
  } finally {
    link.remove();
    URL.revokeObjectURL(objectUrl);
  }

  return { fileName };
}

export const reportsDownloadApi = {
  downloadConsolidatedSessional(payload: ConsolidatedDownloadRequest) {
    return postDownload({
      endpoint: endpoints.reports.academics.consolidatedSessional.download,
      body: payload,
      fallbackFileName: 'consolidated-sessional.pdf',
    });
  },

  downloadFinalResultCompilation(payload: FinalResultDownloadRequest) {
    return postDownload({
      endpoint: endpoints.reports.academics.finalResultCompilation.download,
      body: payload,
      fallbackFileName: 'final-result-compilation.pdf',
    });
  },

  downloadSemesterGrade(payload: SemesterGradeDownloadRequest) {
    return postDownload({
      endpoint: endpoints.reports.academics.semesterGrade.download,
      body: payload,
      fallbackFileName: payload.ocIds.length > 1 ? 'semester-grade-batch.zip' : 'semester-grade.pdf',
    });
  },

  downloadPtAssessment(payload: PtAssessmentDownloadRequest) {
    return postDownload({
      endpoint: endpoints.reports.milTraining.physicalAssessment.download,
      body: payload,
      fallbackFileName: 'physical-assessment.pdf',
    });
  },

  downloadCourseWisePerformance(payload: CourseWisePerformanceDownloadRequest) {
    return postDownload({
      endpoint: endpoints.reports.overallTraining.courseWisePerformance.download,
      body: payload,
      fallbackFileName: 'course-wise-performance.pdf',
    });
  },

  downloadCourseWiseFinalPerformance(payload: CourseWiseFinalPerformanceDownloadRequest) {
    return postDownload({
      endpoint: endpoints.reports.overallTraining.courseWiseFinalPerformance.download,
      body: payload,
      fallbackFileName: 'course-wise-final-performance.pdf',
    });
  },
};

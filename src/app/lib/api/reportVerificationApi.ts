import { api } from '@/app/lib/apiClient';
import { baseURL, endpoints } from '@/constants/endpoints';
import type { ReportVerificationRequest, ReportVerificationResult } from '@/types/report-verification';

type ReportVerificationResponse = {
  message: string;
  data: ReportVerificationResult;
};

export async function verifyReportPdfAuthenticity(payload: ReportVerificationRequest) {
  const formData = new FormData();
  formData.set('versionId', payload.versionId);
  if (payload.file) {
    formData.set('file', payload.file);
  }

  return api.post<ReportVerificationResponse>(endpoints.admin.reports.verification.verify, formData, {
    baseURL,
  });
}

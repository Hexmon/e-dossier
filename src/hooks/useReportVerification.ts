"use client";

import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ApiClientError } from '@/app/lib/apiClient';
import { verifyReportPdfAuthenticity } from '@/app/lib/api/reportVerificationApi';
import type { ReportVerificationRequest } from '@/types/report-verification';

function resolveErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiClientError) return error.message || fallback;
  if (error instanceof Error) return error.message || fallback;
  return fallback;
}

export function useReportVerification() {
  const verifyMutation = useMutation({
    mutationFn: (payload: ReportVerificationRequest) => verifyReportPdfAuthenticity(payload),
    onError: (error) => {
      toast.error(resolveErrorMessage(error, 'Failed to verify report PDF.'));
    },
  });

  return {
    verifyReport: verifyMutation.mutateAsync,
    isVerifying: verifyMutation.isPending,
    verificationResult: verifyMutation.data?.data ?? null,
    verificationMessage: verifyMutation.data?.message ?? null,
  };
}

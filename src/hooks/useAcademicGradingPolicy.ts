"use client";

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ApiClientError } from '@/app/lib/apiClient';
import {
  getAcademicGradingPolicyApi,
  recalculateAcademicGradingPolicyApi,
  updateAcademicGradingPolicyApi,
} from '@/app/lib/api/academicGradingPolicyApi';
import type {
  AcademicGradingPolicyRecalculateRequest,
  AcademicGradingPolicyRecalculateResult,
  AcademicGradingPolicyUpdateRequest,
} from '@/types/academic-grading-policy';

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiClientError) return error.message || fallback;
  if (error instanceof Error) return error.message || fallback;
  return fallback;
}

export const academicGradingPolicyQueryKey = ['admin', 'academics', 'grading-policy'] as const;

export function useAcademicGradingPolicy() {
  const queryClient = useQueryClient();

  const policyQuery = useQuery({
    queryKey: academicGradingPolicyQueryKey,
    queryFn: getAcademicGradingPolicyApi,
    staleTime: 15_000,
  });

  const updatePolicyMutation = useMutation({
    mutationFn: (payload: AcademicGradingPolicyUpdateRequest) => updateAcademicGradingPolicyApi(payload),
    onSuccess: async (response) => {
      toast.success(response.message || 'Grading policy updated successfully.');
      await queryClient.invalidateQueries({ queryKey: academicGradingPolicyQueryKey });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Failed to update grading policy.'));
    },
  });

  const recalculateMutation = useMutation({
    mutationFn: (payload: AcademicGradingPolicyRecalculateRequest) =>
      recalculateAcademicGradingPolicyApi(payload),
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Failed to recalculate academic grading.'));
    },
  });

  const previewChanges = async (
    payload: Omit<AcademicGradingPolicyRecalculateRequest, 'dryRun'>
  ): Promise<AcademicGradingPolicyRecalculateResult> => {
    const response = await recalculateMutation.mutateAsync({
      ...payload,
      dryRun: true,
    });
    toast.success(response.message || 'Recalculation preview completed.');
    return response;
  };

  const applyChanges = async (
    payload: Omit<AcademicGradingPolicyRecalculateRequest, 'dryRun'>
  ): Promise<AcademicGradingPolicyRecalculateResult> => {
    const response = await recalculateMutation.mutateAsync({
      ...payload,
      dryRun: false,
    });
    toast.success(response.message || 'Recalculation applied successfully.');
    return response;
  };

  return {
    policy: policyQuery.data?.policy ?? null,
    loading: policyQuery.isLoading,
    refetchPolicy: policyQuery.refetch,
    updatePolicy: updatePolicyMutation.mutateAsync,
    previewChanges,
    applyChanges,
    isSavingPolicy: updatePolicyMutation.isPending,
    isRunningRecalculation: recalculateMutation.isPending,
  };
}

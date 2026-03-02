"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  relegationApi,
  type RelegationEnrollmentModuleKey,
  type RelegationHistoryParams,
  type RelegationOcOptionsParams,
  type RelegationPdfPresignRequest,
  type RelegationPromoteCourseRequest,
  type RelegationTransferRequest,
  type RelegationVoidPromotionRequest,
} from "@/app/lib/api/relegationApi";

export const relegationQueryKeys = {
  all: ["relegation"] as const,
  ocs: (params?: RelegationOcOptionsParams) =>
    [
      ...relegationQueryKeys.all,
      "ocs",
      params?.courseId ?? "all",
      params?.q ?? "",
      String(Boolean(params?.activeOnly)),
    ] as const,
  nextCourses: (currentCourseId: string | null) =>
    [...relegationQueryKeys.all, "next-courses", currentCourseId ?? "none"] as const,
  history: (params?: RelegationHistoryParams) =>
    [
      ...relegationQueryKeys.all,
      "history",
      params?.q ?? "",
      params?.courseFromId ?? "all",
      params?.courseToId ?? "all",
      params?.movementKind ?? "all",
      params?.limit ?? 25,
      params?.offset ?? 0,
    ] as const,
  enrollments: (ocId: string | null) =>
    [...relegationQueryKeys.all, "enrollments", ocId ?? "none"] as const,
  enrollmentModules: (
    ocId: string | null,
    enrollmentId: string | null,
    module: RelegationEnrollmentModuleKey | null,
    semester?: number
  ) =>
    [
      ...relegationQueryKeys.all,
      "enrollment-modules",
      ocId ?? "none",
      enrollmentId ?? "none",
      module ?? "none",
      semester ?? "all",
    ] as const,
};

export function useRelegationModule(
  currentCourseId: string | null,
  ocParams?: RelegationOcOptionsParams
) {
  const queryClient = useQueryClient();

  const ocOptionsQuery = useQuery({
    queryKey: relegationQueryKeys.ocs(ocParams),
    queryFn: async () => {
      const response = await relegationApi.getOcOptions(ocParams);
      return response.items ?? [];
    },
  });

  const nextCoursesQuery = useQuery({
    queryKey: relegationQueryKeys.nextCourses(currentCourseId),
    enabled: Boolean(currentCourseId),
    queryFn: async () => {
      if (!currentCourseId) return [];
      const response = await relegationApi.getImmediateNextCourses(currentCourseId);
      return response.items ?? [];
    },
  });

  const presignMutation = useMutation({
    mutationFn: async (payload: RelegationPdfPresignRequest) => relegationApi.presignPdf(payload),
  });

  const transferMutation = useMutation({
    mutationFn: async (payload: RelegationTransferRequest) => relegationApi.applyTransfer(payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: relegationQueryKeys.all }),
        queryClient.invalidateQueries({ queryKey: ["oc"] }),
      ]);
    },
  });

  return {
    ocOptionsQuery,
    nextCoursesQuery,
    presignMutation,
    transferMutation,
  };
}

export function useRelegationHistory(params?: RelegationHistoryParams) {
  return useQuery({
    queryKey: relegationQueryKeys.history(params),
    queryFn: async () => relegationApi.getHistory(params),
  });
}

export function useRelegationActions() {
  const queryClient = useQueryClient();

  const exceptionMutation = useMutation({
    mutationFn: async (payload: RelegationTransferRequest) => relegationApi.applyException(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: relegationQueryKeys.all });
    },
  });

  const promoteCourseMutation = useMutation({
    mutationFn: async (payload: RelegationPromoteCourseRequest) => relegationApi.promoteCourse(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: relegationQueryKeys.all });
    },
  });

  const voidPromotionMutation = useMutation({
    mutationFn: async (payload: RelegationVoidPromotionRequest) => relegationApi.voidPromotion(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: relegationQueryKeys.all });
      await queryClient.invalidateQueries({ queryKey: ["oc"] });
    },
  });

  return {
    createException: exceptionMutation.mutateAsync,
    promoteCourse: promoteCourseMutation.mutateAsync,
    voidPromotion: voidPromotionMutation.mutateAsync,
    exceptionMutation,
    promoteCourseMutation,
    voidPromotionMutation,
  };
}

export function useRelegationEnrollments(ocId: string | null) {
  return useQuery({
    queryKey: relegationQueryKeys.enrollments(ocId),
    enabled: Boolean(ocId),
    queryFn: async () => {
      if (!ocId) return [];
      const response = await relegationApi.getEnrollments(ocId);
      return response.items ?? [];
    },
  });
}

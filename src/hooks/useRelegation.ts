"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  relegationApi,
  type RelegationTransferRequest,
  type RelegationPdfPresignRequest,
} from "@/app/lib/api/relegationApi";

export const relegationQueryKeys = {
  all: ["relegation"] as const,
  ocs: () => [...relegationQueryKeys.all, "ocs"] as const,
  nextCourses: (currentCourseId: string | null) =>
    [...relegationQueryKeys.all, "next-courses", currentCourseId ?? "none"] as const,
};

export function useRelegationModule(currentCourseId: string | null) {
  const queryClient = useQueryClient();

  const ocOptionsQuery = useQuery({
    queryKey: relegationQueryKeys.ocs(),
    queryFn: async () => {
      const response = await relegationApi.getOcOptions();
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
        queryClient.invalidateQueries({ queryKey: relegationQueryKeys.ocs() }),
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

"use client";

import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listSemesters,
  getSemesterById,
  updateSemesterSummary as updateSemesterSummaryApi,
  updateSubjectMarks as updateSubjectMarksApi,
  deleteSemester as deleteSemesterApi,
  deleteSubject as deleteSubjectApi,
  SemesterData,
  SubjectMarks,
  SemesterGPAUpdate,
  DeleteOptions,
  AcademicsSemesterDeleteResponse,
  AcademicsSubjectDeleteResponse,
  AcademicsSemesterResponse,
} from "@/app/lib/api/academics";

type SubjectMutationPayload = {
  semester: number;
  subjectId: string;
  marks: SubjectMarks;
};

type SubjectDeletePayload = {
  semester: number;
  subjectId: string;
  options?: DeleteOptions;
};

type SemesterDeletePayload = {
  semester: number;
  options?: DeleteOptions;
};

export function useAcademics(ocId: string, semester: number) {
  const queryClient = useQueryClient();

  const semesterQuery = useQuery({
    queryKey: ["oc-academics", ocId, semester],
    queryFn: async () => {
      const response = await getSemesterById(ocId, semester);
      return response.data;
    },
    enabled: Boolean(ocId) && Number.isFinite(semester),
  });

  const updateSemesterMutation = useMutation({
    mutationFn: async ({
      semester: targetSemester,
      payload,
    }: {
      semester: number;
      payload: SemesterGPAUpdate;
    }) => updateSemesterSummaryApi(ocId, targetSemester, payload),
    onSuccess: async (_response, variables) => {
      await queryClient.invalidateQueries({
        queryKey: ["oc-academics", ocId, variables.semester],
      });
      await queryClient.invalidateQueries({
        queryKey: ["oc-academics-list", ocId],
      });
    },
  });

  const updateSubjectMutation = useMutation({
    mutationFn: async ({ semester: targetSemester, subjectId, marks }: SubjectMutationPayload) =>
      updateSubjectMarksApi(ocId, targetSemester, subjectId, marks),
    onSuccess: async (_response, variables) => {
      await queryClient.invalidateQueries({
        queryKey: ["oc-academics", ocId, variables.semester],
      });
    },
  });

  const deleteSemesterMutation = useMutation({
    mutationFn: async ({ semester: targetSemester, options }: SemesterDeletePayload) =>
      deleteSemesterApi(ocId, targetSemester, options),
    onSuccess: async (_response, variables) => {
      await queryClient.invalidateQueries({
        queryKey: ["oc-academics", ocId, variables.semester],
      });
      await queryClient.invalidateQueries({
        queryKey: ["oc-academics-list", ocId],
      });
    },
  });

  const deleteSubjectMutation = useMutation({
    mutationFn: async ({ semester: targetSemester, subjectId, options }: SubjectDeletePayload) =>
      deleteSubjectApi(ocId, targetSemester, subjectId, options),
    onSuccess: async (_response, variables) => {
      await queryClient.invalidateQueries({
        queryKey: ["oc-academics", ocId, variables.semester],
      });
    },
  });

  const getSemesterList = useCallback(
    async (targetSemester?: number): Promise<SemesterData[]> => {
      const response = await queryClient.fetchQuery({
        queryKey: ["oc-academics-list", ocId, targetSemester ?? "all"],
        queryFn: async () => {
          const apiResponse = await listSemesters(ocId, {
            semester: targetSemester,
          });
          return apiResponse.items;
        },
      });
      return response ?? [];
    },
    [ocId, queryClient]
  );

  const getSpecificSemester = useCallback(
    async (targetSemester: number): Promise<SemesterData | null> => {
      try {
        return await queryClient.fetchQuery({
          queryKey: ["oc-academics", ocId, targetSemester],
          queryFn: async () => {
            const response = await getSemesterById(ocId, targetSemester);
            return response.data;
          },
        });
      } catch {
        return null;
      }
    },
    [ocId, queryClient]
  );

  const updateSemesterGPA = useCallback(
    async (
      targetSemester: number,
      data: SemesterGPAUpdate
    ): Promise<AcademicsSemesterResponse> => {
      return await updateSemesterMutation.mutateAsync({
        semester: targetSemester,
        payload: data,
      });
    },
    [updateSemesterMutation]
  );

  const updateSubjectMarks = useCallback(
    async (
      targetSemester: number,
      subjectId: string,
      marks: SubjectMarks
    ): Promise<AcademicsSemesterResponse> => {
      return await updateSubjectMutation.mutateAsync({
        semester: targetSemester,
        subjectId,
        marks,
      });
    },
    [updateSubjectMutation]
  );

  const deleteSemester = useCallback(
    async (
      targetSemester: number,
      options?: DeleteOptions
    ): Promise<AcademicsSemesterDeleteResponse> => {
      return await deleteSemesterMutation.mutateAsync({
        semester: targetSemester,
        options,
      });
    },
    [deleteSemesterMutation]
  );

  const deleteSubject = useCallback(
    async (
      targetSemester: number,
      subjectId: string,
      options?: DeleteOptions
    ): Promise<AcademicsSubjectDeleteResponse> => {
      return await deleteSubjectMutation.mutateAsync({
        semester: targetSemester,
        subjectId,
        options,
      });
    },
    [deleteSubjectMutation]
  );

  const loading =
    semesterQuery.isLoading ||
    updateSemesterMutation.isPending ||
    updateSubjectMutation.isPending ||
    deleteSemesterMutation.isPending ||
    deleteSubjectMutation.isPending;

  const error = semesterQuery.error instanceof Error ? semesterQuery.error.message : null;

  const isSaving = updateSemesterMutation.isPending || updateSubjectMutation.isPending;
  const isDeleting = deleteSemesterMutation.isPending || deleteSubjectMutation.isPending;

  const resetMutationState = useCallback(() => {
    updateSemesterMutation.reset();
    updateSubjectMutation.reset();
    deleteSemesterMutation.reset();
    deleteSubjectMutation.reset();
  }, [
    updateSemesterMutation,
    updateSubjectMutation,
    deleteSemesterMutation,
    deleteSubjectMutation,
  ]);

  return {
    loading,
    error,
    queryError: semesterQuery.error ?? null,
    isSaving,
    isDeleting,
    semesterData: semesterQuery.data ?? null,
    refetchSemester: semesterQuery.refetch,
    getSemesterList,
    getSpecificSemester,
    updateSemesterGPA,
    updateSubjectMarks,
    deleteSemester,
    deleteSubject,
    resetMutationState,
  };
}

export type { SemesterData, SubjectMarks, SemesterGPAUpdate, DeleteOptions };

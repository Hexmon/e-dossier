"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ApiClientError } from "@/app/lib/apiClient";
import { getAllCourses, type CourseResponse } from "@/app/lib/api/courseApi";
import {
  copyOlqAdminTemplate,
  createOlqAdminCategory,
  createOlqAdminSubtitle,
  deleteOlqAdminCategory,
  deleteOlqAdminSubtitle,
  listOlqAdminCategories,
  listOlqAdminSubtitles,
  updateOlqAdminCategory,
  updateOlqAdminSubtitle,
} from "@/app/lib/api/olqAdminApi";
import type {
  OlqAdminCategoryCreateInput,
  OlqAdminCategoryUpdateInput,
  OlqAdminCopyTemplateInput,
  OlqAdminSubtitleCreateInput,
  OlqAdminSubtitleUpdateInput,
} from "@/types/olq-admin";

type UseOlqAdminTemplateMgmtParams = {
  courseId?: string | null;
  subtitleCategoryId?: string | null;
  includeSubtitles?: boolean;
  isActive?: boolean;
};

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiClientError) {
    const detail =
      typeof error.extras?.detail === "string" ? (error.extras.detail as string) : null;
    return detail || error.message || fallback;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

function assertCourseId(courseId: string | null | undefined): asserts courseId is string {
  if (!courseId) {
    throw new Error("Select a course first.");
  }
}

export const olqAdminQueryKeys = {
  courses: ["olq-admin-courses"] as const,
  categories: (courseId: string, includeSubtitles: boolean, isActive: boolean) =>
    ["olq-admin-categories", courseId, includeSubtitles, isActive] as const,
  subtitles: (courseId: string, categoryId: string | null, isActive: boolean) =>
    ["olq-admin-subtitles", courseId, categoryId, isActive] as const,
};

export function useOlqAdminTemplateMgmt(params: UseOlqAdminTemplateMgmtParams = {}) {
  const queryClient = useQueryClient();
  const courseId = params.courseId ?? null;
  const subtitleCategoryId = params.subtitleCategoryId ?? null;
  const includeSubtitles = params.includeSubtitles ?? true;
  const isActive = params.isActive ?? true;

  const coursesQuery = useQuery({
    queryKey: olqAdminQueryKeys.courses,
    queryFn: async () => {
      const response = await getAllCourses();
      return (response.items ?? []).filter((course) => !course.deleted_at);
    },
    staleTime: 60_000,
  });

  const categoriesQuery = useQuery({
    queryKey: olqAdminQueryKeys.categories(courseId ?? "", includeSubtitles, isActive),
    queryFn: async () => {
      assertCourseId(courseId);
      const response = await listOlqAdminCategories(courseId, {
        includeSubtitles,
        isActive,
      });
      return response.items ?? [];
    },
    enabled: Boolean(courseId),
    staleTime: 15_000,
  });

  const subtitlesQuery = useQuery({
    queryKey: olqAdminQueryKeys.subtitles(courseId ?? "", subtitleCategoryId, isActive),
    queryFn: async () => {
      assertCourseId(courseId);
      const response = await listOlqAdminSubtitles(courseId, {
        categoryId: subtitleCategoryId ?? undefined,
        isActive,
      });
      return response.items ?? [];
    },
    enabled: Boolean(courseId),
    staleTime: 15_000,
  });

  const createCategoryMutation = useMutation({
    mutationFn: async (payload: OlqAdminCategoryCreateInput) => {
      assertCourseId(courseId);
      return createOlqAdminCategory(courseId, payload);
    },
    onSuccess: async (result) => {
      toast.success(result.message || "Category created successfully.");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["olq-admin-categories"] }),
        queryClient.invalidateQueries({ queryKey: ["olq-admin-subtitles"] }),
      ]);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Failed to create category."));
    },
  });

  const updateCategoryMutation = useMutation({
    mutationFn: async ({
      categoryId,
      payload,
    }: {
      categoryId: string;
      payload: OlqAdminCategoryUpdateInput;
    }) => {
      assertCourseId(courseId);
      return updateOlqAdminCategory(courseId, categoryId, payload);
    },
    onSuccess: async (result) => {
      toast.success(result.message || "Category updated successfully.");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["olq-admin-categories"] }),
        queryClient.invalidateQueries({ queryKey: ["olq-admin-subtitles"] }),
      ]);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Failed to update category."));
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (categoryId: string) => {
      assertCourseId(courseId);
      return deleteOlqAdminCategory(courseId, categoryId, true);
    },
    onSuccess: async (result) => {
      toast.success(result.message || "Category deleted successfully.");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["olq-admin-categories"] }),
        queryClient.invalidateQueries({ queryKey: ["olq-admin-subtitles"] }),
      ]);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Failed to delete category."));
    },
  });

  const createSubtitleMutation = useMutation({
    mutationFn: async (payload: OlqAdminSubtitleCreateInput) => {
      assertCourseId(courseId);
      return createOlqAdminSubtitle(courseId, payload);
    },
    onSuccess: async (result) => {
      toast.success(result.message || "Subtitle created successfully.");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["olq-admin-categories"] }),
        queryClient.invalidateQueries({ queryKey: ["olq-admin-subtitles"] }),
      ]);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Failed to create subtitle."));
    },
  });

  const updateSubtitleMutation = useMutation({
    mutationFn: async ({
      subtitleId,
      payload,
    }: {
      subtitleId: string;
      payload: OlqAdminSubtitleUpdateInput;
    }) => {
      assertCourseId(courseId);
      return updateOlqAdminSubtitle(courseId, subtitleId, payload);
    },
    onSuccess: async (result) => {
      toast.success(result.message || "Subtitle updated successfully.");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["olq-admin-categories"] }),
        queryClient.invalidateQueries({ queryKey: ["olq-admin-subtitles"] }),
      ]);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Failed to update subtitle."));
    },
  });

  const deleteSubtitleMutation = useMutation({
    mutationFn: async (subtitleId: string) => {
      assertCourseId(courseId);
      return deleteOlqAdminSubtitle(courseId, subtitleId, true);
    },
    onSuccess: async (result) => {
      toast.success(result.message || "Subtitle deleted successfully.");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["olq-admin-categories"] }),
        queryClient.invalidateQueries({ queryKey: ["olq-admin-subtitles"] }),
      ]);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Failed to delete subtitle."));
    },
  });

  const copyTemplateMutation = useMutation({
    mutationFn: async ({
      targetCourseId,
      sourceCourseId,
      mode,
    }: {
      targetCourseId: string;
      sourceCourseId: string;
      mode: OlqAdminCopyTemplateInput["mode"];
    }) => {
      return copyOlqAdminTemplate(targetCourseId, { sourceCourseId, mode });
    },
    onSuccess: async (result) => {
      toast.success(result.message || "Template copied successfully.");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["olq-admin-categories"] }),
        queryClient.invalidateQueries({ queryKey: ["olq-admin-subtitles"] }),
      ]);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Failed to copy template."));
    },
  });

  return {
    courses: (coursesQuery.data ?? []) as CourseResponse[],
    coursesLoading: coursesQuery.isLoading,
    categories: categoriesQuery.data ?? [],
    categoriesLoading: categoriesQuery.isLoading,
    subtitles: subtitlesQuery.data ?? [],
    subtitlesLoading: subtitlesQuery.isLoading,
    categoriesError: categoriesQuery.error,
    subtitlesError: subtitlesQuery.error,
    createCategory: createCategoryMutation.mutateAsync,
    updateCategory: (categoryId: string, payload: OlqAdminCategoryUpdateInput) =>
      updateCategoryMutation.mutateAsync({ categoryId, payload }),
    deleteCategory: deleteCategoryMutation.mutateAsync,
    createSubtitle: createSubtitleMutation.mutateAsync,
    updateSubtitle: (subtitleId: string, payload: OlqAdminSubtitleUpdateInput) =>
      updateSubtitleMutation.mutateAsync({ subtitleId, payload }),
    deleteSubtitle: deleteSubtitleMutation.mutateAsync,
    copyTemplate: (
      targetCourseId: string,
      sourceCourseId: string,
      mode: OlqAdminCopyTemplateInput["mode"] = "replace"
    ) => copyTemplateMutation.mutateAsync({ targetCourseId, sourceCourseId, mode }),
    isCreatingCategory: createCategoryMutation.isPending,
    isUpdatingCategory: updateCategoryMutation.isPending,
    isDeletingCategory: deleteCategoryMutation.isPending,
    isCreatingSubtitle: createSubtitleMutation.isPending,
    isUpdatingSubtitle: updateSubtitleMutation.isPending,
    isDeletingSubtitle: deleteSubtitleMutation.isPending,
    isCopyingTemplate: copyTemplateMutation.isPending,
  };
}

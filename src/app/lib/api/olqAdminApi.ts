import { api } from "@/app/lib/apiClient";
import { endpoints } from "@/constants/endpoints";
import type {
  OlqAdminCategoryCreateInput,
  OlqAdminCategoryListResponse,
  OlqAdminCategoryResponse,
  OlqAdminCategoryUpdateInput,
  OlqAdminCopyTemplateInput,
  OlqAdminCopyTemplateResponse,
  OlqAdminDeleteResponse,
  OlqAdminSubtitleCreateInput,
  OlqAdminSubtitleListResponse,
  OlqAdminSubtitleResponse,
  OlqAdminSubtitleUpdateInput,
} from "@/types/olq-admin";

type ListCategoriesParams = {
  includeSubtitles?: boolean;
  isActive?: boolean;
};

type ListSubtitlesParams = {
  categoryId?: string;
  isActive?: boolean;
};

export async function listOlqAdminCategories(
  courseId: string,
  params?: ListCategoriesParams
): Promise<OlqAdminCategoryListResponse> {
  return api.get<OlqAdminCategoryListResponse>(endpoints.admin.olq.categories(courseId), {
    query: {
      includeSubtitles: params?.includeSubtitles,
      isActive: params?.isActive,
    },
  });
}

export async function createOlqAdminCategory(
  courseId: string,
  payload: OlqAdminCategoryCreateInput
): Promise<OlqAdminCategoryResponse> {
  return api.post<OlqAdminCategoryResponse, OlqAdminCategoryCreateInput>(
    endpoints.admin.olq.categories(courseId),
    payload
  );
}

export async function updateOlqAdminCategory(
  courseId: string,
  categoryId: string,
  payload: OlqAdminCategoryUpdateInput
): Promise<OlqAdminCategoryResponse> {
  return api.patch<OlqAdminCategoryResponse, OlqAdminCategoryUpdateInput>(
    endpoints.admin.olq.categoryById(courseId, categoryId),
    payload
  );
}

export async function deleteOlqAdminCategory(
  courseId: string,
  categoryId: string,
  hard = true
): Promise<OlqAdminDeleteResponse> {
  return api.request<OlqAdminDeleteResponse, { hard: boolean }>({
    method: "DELETE",
    endpoint: endpoints.admin.olq.categoryById(courseId, categoryId),
    body: { hard },
  });
}

export async function listOlqAdminSubtitles(
  courseId: string,
  params?: ListSubtitlesParams
): Promise<OlqAdminSubtitleListResponse> {
  return api.get<OlqAdminSubtitleListResponse>(endpoints.admin.olq.subtitles(courseId), {
    query: {
      categoryId: params?.categoryId,
      isActive: params?.isActive,
    },
  });
}

export async function createOlqAdminSubtitle(
  courseId: string,
  payload: OlqAdminSubtitleCreateInput
): Promise<OlqAdminSubtitleResponse> {
  return api.post<OlqAdminSubtitleResponse, OlqAdminSubtitleCreateInput>(
    endpoints.admin.olq.subtitles(courseId),
    payload
  );
}

export async function updateOlqAdminSubtitle(
  courseId: string,
  subtitleId: string,
  payload: OlqAdminSubtitleUpdateInput
): Promise<OlqAdminSubtitleResponse> {
  return api.patch<OlqAdminSubtitleResponse, OlqAdminSubtitleUpdateInput>(
    endpoints.admin.olq.subtitleById(courseId, subtitleId),
    payload
  );
}

export async function deleteOlqAdminSubtitle(
  courseId: string,
  subtitleId: string,
  hard = true
): Promise<OlqAdminDeleteResponse> {
  return api.request<OlqAdminDeleteResponse, { hard: boolean }>({
    method: "DELETE",
    endpoint: endpoints.admin.olq.subtitleById(courseId, subtitleId),
    body: { hard },
  });
}

export async function copyOlqAdminTemplate(
  targetCourseId: string,
  payload: OlqAdminCopyTemplateInput
): Promise<OlqAdminCopyTemplateResponse> {
  return api.post<OlqAdminCopyTemplateResponse, OlqAdminCopyTemplateInput>(
    endpoints.admin.olq.copy(targetCourseId),
    payload
  );
}

import { api } from "@/app/lib/apiClient";
import { baseURL } from "@/constants/endpoints";

export type SiteSettingsModel = {
  id: string;
  singletonKey: string;
  logoUrl: string | null;
  logoObjectKey: string | null;
  heroTitle: string;
  heroDescription: string;
  commandersSectionTitle: string;
  awardsSectionTitle: string;
  historySectionTitle: string;
  updatedBy: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type SiteCommanderModel = {
  id: string;
  name: string;
  designation: string;
  imageUrl: string | null;
  imageObjectKey?: string | null;
  tenure: string;
  description: string;
  sortOrder: number;
  isDeleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type SiteAwardModel = {
  id: string;
  title: string;
  description: string;
  imageUrl: string | null;
  imageObjectKey?: string | null;
  category: string;
  sortOrder: number;
  isDeleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type SiteHistoryModel = {
  id: string;
  incidentDate: string;
  description: string;
  isDeleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type SiteSettingsUpdatePayload = Partial<{
  logoUrl: string | null;
  logoObjectKey: string | null;
  heroTitle: string;
  heroDescription: string;
  commandersSectionTitle: string;
  awardsSectionTitle: string;
  historySectionTitle: string;
}>;

export type PresignPayload = {
  contentType: "image/png" | "image/jpeg" | "image/webp";
  sizeBytes: number;
};

export type PresignResponse = {
  uploadUrl: string;
  publicUrl: string;
  objectKey: string;
  expiresInSeconds: number;
};

export const siteSettingsAdminApi = {
  getSettings: () =>
    api.get<{ settings: SiteSettingsModel }>("/api/v1/admin/site-settings", { baseURL }),

  updateSettings: (payload: SiteSettingsUpdatePayload) =>
    api.put<{ settings: SiteSettingsModel }, SiteSettingsUpdatePayload>(
      "/api/v1/admin/site-settings",
      payload,
      { baseURL }
    ),

  deleteLogo: () => api.delete<{ settings: SiteSettingsModel }>("/api/v1/admin/site-settings/logo", { baseURL }),

  presignLogo: (payload: PresignPayload) =>
    api.post<PresignResponse, PresignPayload>("/api/v1/admin/site-settings/logo/presign", payload, {
      baseURL,
    }),

  listCommanders: () =>
    api.get<{ items: SiteCommanderModel[] }>("/api/v1/admin/site-settings/commanders", {
      baseURL,
    }),

  getCommander: (id: string) =>
    api.get<{ item: SiteCommanderModel }>(`/api/v1/admin/site-settings/commanders/${id}`, { baseURL }),

  createCommander: (payload: Omit<SiteCommanderModel, "id" | "sortOrder"> & { sortOrder?: number }) =>
    api.post<{ item: SiteCommanderModel }, typeof payload>(
      "/api/v1/admin/site-settings/commanders",
      payload,
      { baseURL }
    ),

  updateCommander: (
    id: string,
    payload: Partial<Omit<SiteCommanderModel, "id" | "sortOrder">> & { sortOrder?: number }
  ) =>
    api.put<{ item: SiteCommanderModel }, typeof payload>(
      `/api/v1/admin/site-settings/commanders/${id}`,
      payload,
      { baseURL }
    ),

  deleteCommander: (id: string) =>
    api.delete<{ item: SiteCommanderModel }>(`/api/v1/admin/site-settings/commanders/${id}`, { baseURL }),

  hardDeleteCommander: (id: string) =>
    api.delete<{ id: string }>(`/api/v1/admin/site-settings/commanders/${id}/hard`, { baseURL }),

  listAwards: () =>
    api.get<{ items: SiteAwardModel[] }>("/api/v1/admin/site-settings/awards", {
      baseURL,
    }),

  getAward: (id: string) =>
    api.get<{ item: SiteAwardModel }>(`/api/v1/admin/site-settings/awards/${id}`, { baseURL }),

  createAward: (payload: Omit<SiteAwardModel, "id" | "sortOrder"> & { sortOrder?: number }) =>
    api.post<{ item: SiteAwardModel }, typeof payload>("/api/v1/admin/site-settings/awards", payload, {
      baseURL,
    }),

  updateAward: (
    id: string,
    payload: Partial<Omit<SiteAwardModel, "id" | "sortOrder">> & { sortOrder?: number }
  ) =>
    api.put<{ item: SiteAwardModel }, typeof payload>(
      `/api/v1/admin/site-settings/awards/${id}`,
      payload,
      { baseURL }
    ),

  deleteAward: (id: string) =>
    api.delete<{ item: SiteAwardModel }>(`/api/v1/admin/site-settings/awards/${id}`, { baseURL }),

  hardDeleteAward: (id: string) =>
    api.delete<{ id: string }>(`/api/v1/admin/site-settings/awards/${id}/hard`, { baseURL }),

  reorderAwards: (orderedIds: string[]) =>
    api.patch<{ items: SiteAwardModel[] }, { orderedIds: string[] }>(
      "/api/v1/admin/site-settings/awards/reorder",
      { orderedIds },
      { baseURL }
    ),

  listHistory: (sort: "asc" | "desc" = "asc") =>
    api.get<{ items: SiteHistoryModel[] }>("/api/v1/admin/site-settings/history", {
      baseURL,
      query: { sort },
    }),

  getHistory: (id: string) =>
    api.get<{ item: SiteHistoryModel }>(`/api/v1/admin/site-settings/history/${id}`, { baseURL }),

  createHistory: (payload: Omit<SiteHistoryModel, "id">) =>
    api.post<{ item: SiteHistoryModel }, typeof payload>("/api/v1/admin/site-settings/history", payload, {
      baseURL,
    }),

  updateHistory: (id: string, payload: Partial<Omit<SiteHistoryModel, "id">>) =>
    api.put<{ item: SiteHistoryModel }, typeof payload>(
      `/api/v1/admin/site-settings/history/${id}`,
      payload,
      { baseURL }
    ),

  deleteHistory: (id: string) =>
    api.delete<{ item: SiteHistoryModel }>(`/api/v1/admin/site-settings/history/${id}`, { baseURL }),

  hardDeleteHistory: (id: string) =>
    api.delete<{ id: string }>(`/api/v1/admin/site-settings/history/${id}/hard`, { baseURL }),
};

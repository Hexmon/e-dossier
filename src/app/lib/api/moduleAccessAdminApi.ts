import { api } from "@/app/lib/apiClient";
import { baseURL, endpoints } from "@/constants/endpoints";
import type { ModuleAccessSettingsInput } from "@/app/lib/validators.module-access";

export type ModuleAccessSettingsResponse = {
  message: string;
  settings: {
    id: string;
    singletonKey: string;
    adminCanAccessDossier: boolean;
    adminCanAccessBulkUpload: boolean;
    adminCanAccessReports: boolean;
    updatedBy: string | null;
    createdAt: string | null;
    updatedAt: string | null;
  };
};

export const moduleAccessAdminApi = {
  getSettings: async () => {
    return api.get<ModuleAccessSettingsResponse>(endpoints.admin.moduleAccess, {
      baseURL,
    });
  },
  updateSettings: async (body: ModuleAccessSettingsInput) => {
    return api.put<ModuleAccessSettingsResponse>(endpoints.admin.moduleAccess, body, {
      baseURL,
    });
  },
};

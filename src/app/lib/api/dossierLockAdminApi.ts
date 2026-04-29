import { api } from "@/app/lib/apiClient";
import { baseURL } from "@/constants/endpoints";

export type DossierLockSettingsResponse = {
  settings: {
    id: string;
    singletonKey: string;
    lockPolicy: "DEFAULT" | "FREEZE_ALL" | "UNFREEZE_ALL";
    updatedBy: string | null;
    createdAt: string | null;
    updatedAt: string | null;
  };
};

export type DossierLockSettingsInput = {
  lockPolicy: "DEFAULT" | "FREEZE_ALL" | "UNFREEZE_ALL";
};

export const dossierLockAdminApi = {
  getSettings: () => api.get<DossierLockSettingsResponse>("/api/v1/admin/dossier-lock", { baseURL }),
  updateSettings: (payload: DossierLockSettingsInput) =>
    api.put<DossierLockSettingsResponse, DossierLockSettingsInput>("/api/v1/admin/dossier-lock", payload, {
      baseURL,
    }),
};

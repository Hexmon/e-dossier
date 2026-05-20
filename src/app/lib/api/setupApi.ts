import { api } from "@/app/lib/apiClient";
import { baseURL, endpoints } from "@/constants/endpoints";
import type { SetupStatus } from "@/app/lib/setup-status";

export type SetupStatusResponse = {
  message: string;
  setup: SetupStatus;
};

export type BootstrapSuperAdminPayload = {
  username: string;
  email: string;
  password: string;
  name?: string;
  phone?: string;
  rank?: string;
};

export type BootstrapSuperAdminResponse = {
  message: string;
  user: {
    id: string;
    username: string;
    email: string;
  };
  appointmentId: string;
};

export type BootstrapTemplatePayload = {
  module: "pt" | "camp" | "platoon" | "appointment";
  profile?: "default";
  dryRun?: boolean;
};

export type BootstrapTemplateStats = {
  created: number;
  updated: number;
  skipped: number;
};

export type BootstrapTemplateResponse = {
  message: string;
  module: string;
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
  warnings: string[];
  stats?: Record<string, BootstrapTemplateStats>;
};

export async function fetchSetupStatus(): Promise<SetupStatus> {
  const response = await api.get<SetupStatusResponse>(endpoints.setup.status, {
    baseURL,
    skipAuth: true,
  });

  return response.setup;
}

export async function bootstrapSuperAdmin(
  payload: BootstrapSuperAdminPayload
): Promise<BootstrapSuperAdminResponse> {
  return api.post<BootstrapSuperAdminResponse, BootstrapSuperAdminPayload>(
    endpoints.bootstrap.superAdmin,
    payload,
    {
      baseURL,
      skipAuth: true,
      skipCsrf: true,
    }
  );
}

export async function applyBootstrapTemplate(
  payload: BootstrapTemplatePayload
): Promise<BootstrapTemplateResponse> {
  return api.post<BootstrapTemplateResponse, BootstrapTemplatePayload>(
    endpoints.admin.bootstrapTemplateApply,
    payload,
    { baseURL }
  );
}

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

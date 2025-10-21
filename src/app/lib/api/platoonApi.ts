import { api } from "@/app/lib/apiClient";
import { baseURL, endpoints } from "@/constants/endpoints";

export interface Platoon {
  id: string;
  key: string;
  name: string;
  about: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

interface PlatoonResponse {
  status: number;
  ok: boolean;
  items: Platoon[];
}

export async function getPlatoons(): Promise<Platoon[]> {
  const response = await api.get<PlatoonResponse>(
    endpoints.admin.platoons,
    { baseURL }
  );

  return response.items;
}

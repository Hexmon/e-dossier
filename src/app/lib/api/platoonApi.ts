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

export async function fetchPlatoonByKey(key: string) {
  if (!key) throw new Error("Missing platoon key");
  const res = await api.get<{
    status: number;
    ok: boolean;
    items: { id: string; key: string; name: string }[];
  }>(endpoints.admin.platoons, {
    baseURL,
    query: { q: key },
  });

  if (!res.items?.length) throw new Error("Platoon not found");
  return res.items[0];
}
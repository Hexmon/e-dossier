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

export interface PlatoonCreatePayload {
  key: string;
  name: string;
  about: string;
}

export interface PlatoonUpdatePayload {
  name: string;
  about: string;
}

interface PlatoonResponse {
  status: number;
  ok: boolean;
  items: Platoon[];
}

interface SinglePlatoonResponse {
  status: number;
  ok: boolean;
  item: Platoon;
}

export async function getPlatoons(): Promise<Platoon[]> {
  const response = await api.get<PlatoonResponse>(
    endpoints.admin.platoons,
    { baseURL }
  );

  return response.items ?? [];
}

export async function fetchPlatoonByKey(key: string): Promise<Platoon> {
  if (!key) throw new Error("Missing platoon key");

  const response = await api.get<PlatoonResponse>(
    endpoints.admin.platoons,
    {
      baseURL,
      query: { q: key },
    }
  );

  const { items = [] } = response;

  if (items.length === 0) {
    throw new Error("Platoon not found");
  }

  return items[0];
}

export async function createPlatoon(payload: PlatoonCreatePayload): Promise<Platoon> {
  const response = await api.post<SinglePlatoonResponse, PlatoonCreatePayload>(
    endpoints.admin.platoons,
    payload,
    { baseURL }
  );

  return response.item;
}

export async function updatePlatoon(
  key: string,
  payload: PlatoonUpdatePayload
): Promise<Platoon> {
  if (!key) throw new Error("Missing platoon key");

  const response = await api.patch<SinglePlatoonResponse, PlatoonUpdatePayload>(
    `${endpoints.admin.platoons}/${key}`,
    payload,
    { baseURL }
  );

  return response.item;
}

export async function deletePlatoon(id: string): Promise<void> {
  if (!id) throw new Error("Missing platoon ID");

  await api.delete(
    `${endpoints.admin.platoons}/${id}`,
    { baseURL }
  );
}
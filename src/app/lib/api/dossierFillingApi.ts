// src/app/lib/api/dossierFillingApi.ts
import { api } from "@/app/lib/apiClient";
import { baseURL } from "@/constants/endpoints";
import { DossierFormData } from "@/types/dossierFilling";

// Fetch dossier filling for one OC
export async function getDossierFilling(ocId: string): Promise<DossierFormData | null> {
    const res = await api.get(
        `${baseURL}/api/v1/oc/${ocId}/dossier-filling`
    ) as { data: DossierFormData | null };

    return res.data ?? null;
}

// Create dossier filling (POST)
export async function createDossierFilling(
    ocId: string,
    body: Partial<DossierFormData>
): Promise<DossierFormData> {
    const response = await api.post(
        `${baseURL}/api/v1/oc/${ocId}/dossier-filling`,
        body
    ) as { data: DossierFormData };

    return response.data;
}

// Update dossier filling (PATCH)
export async function updateDossierFilling(
    ocId: string,
    body: Partial<DossierFormData>
): Promise<DossierFormData> {
    const response = await api.patch(
        `${baseURL}/api/v1/oc/${ocId}/dossier-filling`,
        body
    ) as { data: DossierFormData };

    return response.data;
}

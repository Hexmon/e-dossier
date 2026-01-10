// src/app/lib/api/dossierSnapshotApi.ts
import { api } from "@/app/lib/apiClient";
import { baseURL } from "@/constants/endpoints";

// Type for dossier snapshot record
export interface DossierSnapshotRecord {
    arrivalPhoto?: string | Blob | null;
    departurePhoto?: string | Blob | null;
    tesNo?: string;
    name?: string;
    course?: string;
    pi?: string;
    dtOfArr?: string;
    relegated?: string;
    withdrawnOn?: string;
    dtOfPassingOut?: string;
    icNo?: string;
    orderOfMerit?: string;
    regtArm?: string;
    postedAtt?: string;
}

// Fetch dossier snapshot for one OC
export async function getDossierSnapshot(ocId: string) {
    const res = await api.get(
        `${baseURL}/api/v1/oc/${ocId}/dossier-snapshot`
    ) as { data: DossierSnapshotRecord };

    return res.data ?? null;
}

// Create dossier snapshot (POST)
export async function createDossierSnapshot(
    ocId: string,
    body: Partial<DossierSnapshotRecord> | FormData
): Promise<DossierSnapshotRecord> {
    const response = await api.post(
        `${baseURL}/api/v1/oc/${ocId}/dossier-snapshot`,
        body
    ) as { data: DossierSnapshotRecord };

    return response.data;
}

// Update dossier snapshot (PUT)
export async function updateDossierSnapshot(
    ocId: string,
    body: Partial<DossierSnapshotRecord> | FormData
): Promise<DossierSnapshotRecord> {
    const response = await api.patch(
        `${baseURL}/api/v1/oc/${ocId}/dossier-snapshot`,
        body
    ) as { data: DossierSnapshotRecord };

    return response.data;
}

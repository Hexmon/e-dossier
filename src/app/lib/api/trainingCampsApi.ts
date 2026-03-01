/**
 * API client for Training Camps
 */

import { apiRequest } from "@/app/lib/apiClient";
import { endpoints } from "@/constants/endpoints";

export interface TrainingCamp {
    id: string;
    name: string;
    semester: 1 | 2 | 3 | 4 | 5 | 6;
    sortOrder: number;
    maxTotalMarks: number;
    performanceTitle?: string | null;
    performanceGuidance?: string | null;
    signaturePrimaryLabel?: string | null;
    signatureSecondaryLabel?: string | null;
    noteLine1?: string | null;
    noteLine2?: string | null;
    showAggregateSummary: boolean;
    createdAt: string;
    updatedAt: string;
    deletedAt?: string | null;
    activities?: TrainingCampActivity[];
}

export interface TrainingCampActivity {
    id: string;
    trainingCampId: string;
    name: string;
    defaultMaxMarks: number;
    sortOrder: number;
    createdAt: string;
    updatedAt: string;
    deletedAt?: string | null;
}

export interface TrainingCampCreate {
    name: string;
    semester: 1 | 2 | 3 | 4 | 5 | 6;
    sortOrder?: number;
    maxTotalMarks: number;
    performanceTitle?: string | null;
    performanceGuidance?: string | null;
    signaturePrimaryLabel?: string | null;
    signatureSecondaryLabel?: string | null;
    noteLine1?: string | null;
    noteLine2?: string | null;
    showAggregateSummary?: boolean;
}

export interface TrainingCampUpdate {
    name?: string;
    semester?: 1 | 2 | 3 | 4 | 5 | 6;
    sortOrder?: number;
    maxTotalMarks?: number;
    performanceTitle?: string | null;
    performanceGuidance?: string | null;
    signaturePrimaryLabel?: string | null;
    signatureSecondaryLabel?: string | null;
    noteLine1?: string | null;
    noteLine2?: string | null;
    showAggregateSummary?: boolean;
}

export interface TrainingCampListResponse {
    status: number;
    ok: boolean;
    message: string;
    items: TrainingCamp[];
    count: number;
}

export interface TrainingCampResponse {
    status: number;
    ok: boolean;
    message: string;
    trainingCamp: TrainingCamp;
}

export interface TrainingCampSettings {
    maxCampsPerSemester: number;
}

/**
 * Fetch all training camps
 */
export async function fetchTrainingCamps(params?: {
    semester?: 1 | 2 | 3 | 4 | 5 | 6;
    includeActivities?: boolean;
    includeDeleted?: boolean;
}): Promise<TrainingCamp[]> {
    const query: Record<string, string> = {};
    if (params?.semester) query.semester = String(params.semester);
    if (params?.includeActivities) query.includeActivities = "true";
    if (params?.includeDeleted) query.includeDeleted = "true";

    const data = await apiRequest<TrainingCampListResponse>({
        method: "GET",
        endpoint: endpoints.admin.trainingCamps.list,
        query,
    });

    return data.items;
}

export async function fetchTrainingCampSettings(): Promise<TrainingCampSettings> {
    const data = await apiRequest<{ settings: TrainingCampSettings }>({
        method: "GET",
        endpoint: endpoints.admin.trainingCamps.settings,
    });
    return data.settings;
}

export async function updateTrainingCampSettings(
    updates: TrainingCampSettings,
): Promise<TrainingCampSettings> {
    const data = await apiRequest<{ settings: TrainingCampSettings }>({
        method: "PATCH",
        endpoint: endpoints.admin.trainingCamps.settings,
        body: updates,
    });
    return data.settings;
}

/**
 * Create a new training camp
 */
export async function createTrainingCamp(camp: TrainingCampCreate): Promise<TrainingCamp> {
    const data = await apiRequest<TrainingCampResponse>({
        method: "POST",
        endpoint: endpoints.admin.trainingCamps.create,
        body: camp,
    });

    return data.trainingCamp;
}

/**
 * Update a training camp
 */
export async function updateTrainingCamp(campId: string, updates: TrainingCampUpdate): Promise<TrainingCamp> {
    const data = await apiRequest<TrainingCampResponse>({
        method: "PATCH",
        endpoint: "/api/v1/admin/training-camps/{campId}",
        path: { campId },
        body: updates,
    });

    return data.trainingCamp;
}

/**
 * Delete a training camp (soft delete by default)
 */
export async function deleteTrainingCamp(campId: string, hard = false): Promise<{ deleted: string; hardDeleted: boolean }> {
    const data = await apiRequest<{ deleted: string; hardDeleted: boolean }>({
        method: "DELETE",
        endpoint: "/api/v1/admin/training-camps/{campId}",
        path: { campId },
        body: { hard },
    });

    return { deleted: data.deleted, hardDeleted: data.hardDeleted };
}

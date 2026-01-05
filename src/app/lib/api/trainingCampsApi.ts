/**
 * API client for Training Camps
 */

import { apiRequest } from "@/app/lib/apiClient";

export interface TrainingCamp {
    id: string;
    name: string;
    semester: "SEM5" | "SEM6A" | "SEM6B";
    maxTotalMarks: number;
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
    semester: "SEM5" | "SEM6A" | "SEM6B";
    maxTotalMarks: number;
}

export interface TrainingCampUpdate {
    name?: string;
    semester?: "SEM5" | "SEM6A" | "SEM6B";
    maxTotalMarks?: number;
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

/**
 * Fetch all training camps
 */
export async function fetchTrainingCamps(params?: {
    semester?: "SEM5" | "SEM6A" | "SEM6B";
    includeActivities?: boolean;
    includeDeleted?: boolean;
}): Promise<TrainingCamp[]> {
    const query: Record<string, string> = {};
    if (params?.semester) query.semester = params.semester;
    if (params?.includeActivities) query.includeActivities = "true";
    if (params?.includeDeleted) query.includeDeleted = "true";

    const data = await apiRequest<TrainingCampListResponse>({
        method: "GET",
        endpoint: "/api/v1/admin/training-camps",
        query,
    });

    return data.items;
}

/**
 * Create a new training camp
 */
export async function createTrainingCamp(camp: TrainingCampCreate): Promise<TrainingCamp> {
    const data = await apiRequest<TrainingCampResponse>({
        method: "POST",
        endpoint: "/api/v1/admin/training-camps",
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


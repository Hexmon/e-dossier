/**
 * API client for Training Camp Activities
 */

import { apiRequest } from "@/app/lib/apiClient";

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

export interface TrainingCampActivityCreate {
    name: string;
    defaultMaxMarks: number;
    sortOrder?: number;
}

export interface TrainingCampActivityUpdate {
    name?: string;
    defaultMaxMarks?: number;
    sortOrder?: number;
}

export interface TrainingCampActivityListResponse {
    status: number;
    ok: boolean;
    message: string;
    items: TrainingCampActivity[];
    count: number;
}

export interface TrainingCampActivityResponse {
    status: number;
    ok: boolean;
    message: string;
    activity: TrainingCampActivity;
}

/**
 * Fetch all activities for a training camp
 */
export async function fetchTrainingCampActivities(
    campId: string,
    params?: {
        includeDeleted?: boolean;
    }
): Promise<TrainingCampActivity[]> {
    const query: Record<string, string> = {};
    if (params?.includeDeleted) query.includeDeleted = "true";

    const data = await apiRequest<TrainingCampActivityListResponse>({
        method: "GET",
        endpoint: "/api/v1/admin/training-camps/{campId}/activities",
        path: { campId },
        query,
    });

    return data.items;
}

/**
 * Create a new training camp activity
 */
export async function createTrainingCampActivity(
    campId: string,
    activity: TrainingCampActivityCreate
): Promise<TrainingCampActivity> {
    const data = await apiRequest<TrainingCampActivityResponse>({
        method: "POST",
        endpoint: "/api/v1/admin/training-camps/{campId}/activities",
        path: { campId },
        body: activity,
    });

    return data.activity;
}

/**
 * Update a training camp activity
 */
export async function updateTrainingCampActivity(
    campId: string,
    activityId: string,
    updates: TrainingCampActivityUpdate
): Promise<TrainingCampActivity> {
    const data = await apiRequest<TrainingCampActivityResponse>({
        method: "PATCH",
        endpoint: "/api/v1/admin/training-camps/{campId}/activities/{activityId}",
        path: { campId, activityId },
        body: updates,
    });

    return data.activity;
}

/**
 * Delete a training camp activity (soft delete by default)
 */
export async function deleteTrainingCampActivity(
    campId: string,
    activityId: string,
    hard = false
): Promise<{ deleted: string; hardDeleted: boolean }> {
    const data = await apiRequest<{ deleted: string; hardDeleted: boolean }>({
        method: "DELETE",
        endpoint: "/api/v1/admin/training-camps/{campId}/activities/{activityId}",
        path: { campId, activityId },
        body: { hard },
    });

    return { deleted: data.deleted, hardDeleted: data.hardDeleted };
}


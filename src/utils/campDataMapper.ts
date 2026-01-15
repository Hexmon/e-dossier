// src/utils/campDataMapper.ts
// This file handles the mapping between backend and frontend data structures

import { OcCamp } from "@/app/lib/api/campApi";

// Frontend form structure
export interface FrontendActivity {
    trainingCampActivityId: string;
    name: string;
    marksScored: number | null;
    defaultMaxMarks: number;
    remark?: string | null;
    activityScoreId?: string; // Backend's activity ID for updates
}

// Backend API structure
export interface BackendActivity {
    id: string; // This is the activity score ID
    ocCampId: string;
    name: string;
    maxMarks: number;
    marksScored: number | null;
    remark?: string | null;
}

// Available training camp activities
export interface TrainingCampActivity {
    id: string; // This is the training camp activity ID
    name: string;
    defaultMaxMarks: number;
}

/**
 * Maps backend camp activities to frontend form structure
 */
export function mapBackendToFrontend(
    backendActivities: BackendActivity[],
    availableActivities: TrainingCampActivity[]
): FrontendActivity[] {
    return backendActivities.map((backendActivity) => {
        // Find the matching training camp activity by name
        const matchingActivity = availableActivities.find(
            (a) => a.name.trim().toLowerCase() === backendActivity.name.trim().toLowerCase()
        );

        if (!matchingActivity) {
            console.warn(`No matching training camp activity found for: ${backendActivity.name}`);
        }

        return {
            trainingCampActivityId: matchingActivity?.id || '',
            name: backendActivity.name,
            marksScored: backendActivity.marksScored ?? null,
            defaultMaxMarks: backendActivity.maxMarks, // Backend's maxMarks becomes defaultMaxMarks
            remark: backendActivity.remark || null,
            activityScoreId: backendActivity.id, // Store backend ID for updates
        };
    });
}

/**
 * Maps frontend form data to backend payload structure
 */
export function mapFrontendToBackend(
    frontendActivities: FrontendActivity[]
): Array<{
    trainingCampActivityId: string;
    marksScored: number | null;
    remark?: string | null;
}> {
    return frontendActivities
        .filter((activity) => activity.trainingCampActivityId) // Only include valid activities
        .map((activity) => ({
            trainingCampActivityId: activity.trainingCampActivityId,
            marksScored: activity.marksScored ?? null,
            remark: activity.remark || null,
        }));
}

/**
 * Initialize activities from available training camp activities (for new camps)
 */
export function initializeActivitiesFromTemplate(
    availableActivities: TrainingCampActivity[]
): FrontendActivity[] {
    return availableActivities.map((activity) => ({
        trainingCampActivityId: activity.id,
        name: activity.name,
        marksScored: null,
        defaultMaxMarks: activity.defaultMaxMarks,
        remark: null,
    }));
}
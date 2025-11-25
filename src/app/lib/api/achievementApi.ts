"use client";

import { api } from "../apiClient";
import { endpoints } from "@/constants/endpoints";

export interface AchievementPayload {
    achievement: string;
}

export interface AchievementResponse {
    id: string;
    achievement: string;
    createdAt: string;
    updatedAt: string;
}

export async function createOcAchievement(ocId: string, body: AchievementPayload) {
    return api.post<AchievementResponse>(endpoints.oc.achievements(ocId), body, {
        path: { ocId }
    });
}

export async function listOcAchievements(ocId: string) {
    return api.get<{
        items: AchievementResponse[];
    }>(endpoints.oc.clubAchievement(ocId), {
        path: { ocId }
    });
}

export async function updateOcAchievement(
    ocId: string,
    achievementId: string,
    body: AchievementPayload
) {
    return api.patch(
        endpoints.oc.achievementById(ocId, achievementId),
        body,
        { path: { ocId, achievementId } }
    );
}

export async function deleteOcAchievement(ocId: string, achievementId: string) {
    return api.delete(
        endpoints.oc.achievementById(ocId, achievementId),
        { path: { ocId, achievementId } }
    );
}

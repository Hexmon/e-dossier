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

type DataResponse<T> = {
    message?: string;
    data: T;
};

export async function createOcAchievement(ocId: string, body: AchievementPayload) {
    const res = await api.post<DataResponse<AchievementResponse>, AchievementPayload>(endpoints.oc.clubAchievement(ocId), body, {
        path: { ocId }
    });
    return res.data;
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
    const res = await api.patch<DataResponse<AchievementResponse>, AchievementPayload>(
        endpoints.oc.clubAchievementById(ocId, achievementId),
        body,
        { path: { ocId, achievementId } }
    );
    return res.data;
}

export async function deleteOcAchievement(ocId: string, achievementId: string) {
    return api.delete(
        endpoints.oc.clubAchievementById(ocId, achievementId),
        { path: { ocId, achievementId } }
    );
}

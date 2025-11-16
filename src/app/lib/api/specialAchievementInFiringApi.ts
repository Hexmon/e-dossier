import z from "zod";
import { api } from "@/app/lib/apiClient";
import { endpoints } from "@/constants/endpoints";
import {
    specialAchievementInFiringCreateSchema,
    specialAchievementInFiringUpdateSchema,
} from "@/app/lib/oc-validators";

export type SpecialAchievementInFiringCreate = z.infer<
    typeof specialAchievementInFiringCreateSchema
>;
export type SpecialAchievementInFiringUpdate = z.infer<
    typeof specialAchievementInFiringUpdateSchema
>;

export type SpecialAchievementInFiringRecord = SpecialAchievementInFiringCreate & {
    id: string;
    ocId: string;
};

export type ListParams = {
    limit?: number;
    offset?: number;
};

export async function listSpecialAchievementsInFiring(
    ocId: string,
    params?: ListParams,
): Promise<{ items: SpecialAchievementInFiringRecord[]; count: number }> {
    return await api.get(endpoints.oc.specialAchievementInFiring(ocId), {
        query: params,
    });
}

export async function getSpecialAchievementInFiring(
    ocId: string,
    id: string,
): Promise<SpecialAchievementInFiringRecord> {
    const res = await api.get<{ data: SpecialAchievementInFiringRecord }>(
        endpoints.oc.specialAchievementInFiringById(ocId, id),
    );
    return res.data;
}

export async function createSpecialAchievementInFiring(
    ocId: string,
    payload: SpecialAchievementInFiringCreate,
): Promise<SpecialAchievementInFiringRecord> {
    const res = await api.post<
        { data: SpecialAchievementInFiringRecord },
        SpecialAchievementInFiringCreate
    >(endpoints.oc.specialAchievementInFiring(ocId), payload);
    return res.data;
}

export async function updateSpecialAchievementInFiring(
    ocId: string,
    id: string,
    payload: SpecialAchievementInFiringUpdate,
): Promise<SpecialAchievementInFiringRecord> {
    const res = await api.patch<
        { data: SpecialAchievementInFiringRecord },
        SpecialAchievementInFiringUpdate
    >(endpoints.oc.specialAchievementInFiringById(ocId, id), payload);
    return res.data;
}

export async function deleteSpecialAchievementInFiring(
    ocId: string,
    id: string,
    hard?: boolean,
): Promise<{ id: string; message: string }> {
    const query = hard ? { hard: "true" } : undefined;
    return await api.delete(
        endpoints.oc.specialAchievementInFiringById(ocId, id),
        { query },
    );
}


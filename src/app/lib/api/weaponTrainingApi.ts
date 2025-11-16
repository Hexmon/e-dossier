import z from "zod";
import { api } from "@/app/lib/apiClient";
import { endpoints } from "@/constants/endpoints";
import {
    weaponTrainingCreateSchema,
    weaponTrainingUpdateSchema,
} from "@/app/lib/oc-validators";

export type WeaponTrainingCreate = z.infer<typeof weaponTrainingCreateSchema>;
export type WeaponTrainingUpdate = z.infer<typeof weaponTrainingUpdateSchema>;

export type WeaponTrainingRecord = WeaponTrainingCreate & {
    id: string;
    ocId: string;
};

export type ListParams = {
    limit?: number;
    offset?: number;
};

export async function listWeaponTraining(
    ocId: string,
    params?: ListParams,
): Promise<{ items: WeaponTrainingRecord[]; count: number }> {
    return await api.get(endpoints.oc.weaponTraining(ocId), {
        query: params,
    });
}

export async function getWeaponTraining(
    ocId: string,
    id: string,
): Promise<WeaponTrainingRecord> {
    const res = await api.get<{ data: WeaponTrainingRecord }>(
        endpoints.oc.weaponTrainingById(ocId, id),
    );
    return res.data;
}

export async function createWeaponTraining(
    ocId: string,
    payload: WeaponTrainingCreate,
): Promise<WeaponTrainingRecord> {
    const res = await api.post<{ data: WeaponTrainingRecord }, WeaponTrainingCreate>(
        endpoints.oc.weaponTraining(ocId),
        payload,
    );
    return res.data;
}

export async function updateWeaponTraining(
    ocId: string,
    id: string,
    payload: WeaponTrainingUpdate,
): Promise<WeaponTrainingRecord> {
    const res = await api.patch<{ data: WeaponTrainingRecord }, WeaponTrainingUpdate>(
        endpoints.oc.weaponTrainingById(ocId, id),
        payload,
    );
    return res.data;
}

export async function deleteWeaponTraining(
    ocId: string,
    id: string,
    hard?: boolean,
): Promise<{ id: string; message: string }> {
    const query = hard ? { hard: "true" } : undefined;
    return await api.delete(endpoints.oc.weaponTrainingById(ocId, id), {
        query,
    });
}


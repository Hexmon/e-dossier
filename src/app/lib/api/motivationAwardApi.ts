import z from "zod";
import { api } from "@/app/lib/apiClient";
import { endpoints } from "@/constants/endpoints";
import {
    motivationAwardCreateSchema,
    motivationAwardUpdateSchema,
} from "@/app/lib/oc-validators";

export type MotivationAwardCreate = z.infer<typeof motivationAwardCreateSchema>;
export type MotivationAwardUpdate = z.infer<typeof motivationAwardUpdateSchema>;

export type MotivationAward = MotivationAwardCreate & {
    id: string;
    ocId: string;
};

export type ListParams = {
    limit?: number;
    offset?: number;
};

export async function listMotivationAwards(
    ocId: string,
    params?: ListParams,
): Promise<{ items: MotivationAward[]; count: number }> {
    return await api.get(endpoints.oc.motivationAwards(ocId), {
        query: params,
    });
}

export async function getMotivationAward(
    ocId: string,
    id: string,
): Promise<MotivationAward> {
    const res = await api.get<{ data: MotivationAward }>(
        endpoints.oc.motivationAwardById(ocId, id),
    );
    return res.data;
}

export async function createMotivationAward(
    ocId: string,
    payload: MotivationAwardCreate,
): Promise<MotivationAward> {
    const res = await api.post<{ data: MotivationAward }, MotivationAwardCreate>(
        endpoints.oc.motivationAwards(ocId),
        payload,
    );
    return res.data;
}

export async function updateMotivationAward(
    ocId: string,
    id: string,
    payload: MotivationAwardUpdate,
): Promise<MotivationAward> {
    const res = await api.patch<{ data: MotivationAward }, MotivationAwardUpdate>(
        endpoints.oc.motivationAwardById(ocId, id),
        payload,
    );
    return res.data;
}

export async function deleteMotivationAward(
    ocId: string,
    id: string,
    hard?: boolean,
): Promise<{ id: string; message: string }> {
    const query = hard ? { hard: "true" } : undefined;
    return await api.delete(endpoints.oc.motivationAwardById(ocId, id), {
        query,
    });
}


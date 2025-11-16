import z from "zod";
import { api } from "@/app/lib/apiClient";
import { endpoints } from "@/constants/endpoints";
import { speedMarchCreateSchema, speedMarchUpdateSchema } from "@/app/lib/oc-validators";

export type SpeedMarchCreate = z.infer<typeof speedMarchCreateSchema>;
export type SpeedMarchUpdate = z.infer<typeof speedMarchUpdateSchema>;

export type SpeedMarchRecord = SpeedMarchCreate & {
    id: string;
    ocId: string;
};

export type ListParams = {
    limit?: number;
    offset?: number;
};

export async function listSpeedMarch(
    ocId: string,
    params?: ListParams,
): Promise<{ items: SpeedMarchRecord[]; count: number }> {
    return await api.get(endpoints.oc.speedMarch(ocId), {
        query: params,
    });
}

export async function getSpeedMarch(
    ocId: string,
    id: string,
): Promise<SpeedMarchRecord> {
    const res = await api.get<{ data: SpeedMarchRecord }>(
        endpoints.oc.speedMarchById(ocId, id),
    );
    return res.data;
}

export async function createSpeedMarch(
    ocId: string,
    payload: SpeedMarchCreate,
): Promise<SpeedMarchRecord> {
    const res = await api.post<{ data: SpeedMarchRecord }, SpeedMarchCreate>(
        endpoints.oc.speedMarch(ocId),
        payload,
    );
    return res.data;
}

export async function updateSpeedMarch(
    ocId: string,
    id: string,
    payload: SpeedMarchUpdate,
): Promise<SpeedMarchRecord> {
    const res = await api.patch<{ data: SpeedMarchRecord }, SpeedMarchUpdate>(
        endpoints.oc.speedMarchById(ocId, id),
        payload,
    );
    return res.data;
}

export async function deleteSpeedMarch(
    ocId: string,
    id: string,
    hard?: boolean,
): Promise<{ id: string; message: string }> {
    const query = hard ? { hard: "true" } : undefined;
    return await api.delete(endpoints.oc.speedMarchById(ocId, id), {
        query,
    });
}


import z from "zod";
import { api } from "@/app/lib/apiClient";
import { endpoints } from "@/constants/endpoints";
import {
    obstacleTrainingCreateSchema,
    obstacleTrainingUpdateSchema,
} from "@/app/lib/oc-validators";

export type ObstacleTrainingCreate = z.infer<typeof obstacleTrainingCreateSchema>;
export type ObstacleTrainingUpdate = z.infer<typeof obstacleTrainingUpdateSchema>;

export type ObstacleTrainingRecord = ObstacleTrainingCreate & {
    id: string;
    ocId: string;
};

export type ListParams = {
    limit?: number;
    offset?: number;
};

export async function listObstacleTraining(
    ocId: string,
    params?: ListParams,
): Promise<{ items: ObstacleTrainingRecord[]; count: number }> {
    return await api.get(endpoints.oc.obstacleTraining(ocId), {
        query: params,
    });
}

export async function getObstacleTraining(
    ocId: string,
    id: string,
): Promise<ObstacleTrainingRecord> {
    const res = await api.get<{ data: ObstacleTrainingRecord }>(
        endpoints.oc.obstacleTrainingById(ocId, id),
    );
    return res.data;
}

export async function createObstacleTraining(
    ocId: string,
    payload: ObstacleTrainingCreate,
): Promise<ObstacleTrainingRecord> {
    const res = await api.post<{ data: ObstacleTrainingRecord }, ObstacleTrainingCreate>(
        endpoints.oc.obstacleTraining(ocId),
        payload,
    );
    return res.data;
}

export async function updateObstacleTraining(
    ocId: string,
    id: string,
    payload: ObstacleTrainingUpdate,
): Promise<ObstacleTrainingRecord> {
    const res = await api.patch<{ data: ObstacleTrainingRecord }, ObstacleTrainingUpdate>(
        endpoints.oc.obstacleTrainingById(ocId, id),
        payload,
    );
    return res.data;
}

export async function deleteObstacleTraining(
    ocId: string,
    id: string,
    hard?: boolean,
): Promise<{ id: string; message: string }> {
    const query = hard ? { hard: "true" } : undefined;
    return await api.delete(endpoints.oc.obstacleTrainingById(ocId, id), {
        query,
    });
}


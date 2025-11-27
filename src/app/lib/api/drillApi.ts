"use client";

import { endpoints } from "@/constants/endpoints";
import { api } from "../apiClient";

export interface DrillPayload {
    semester: number;
    maxMarks: number;
    m1Marks: number;
    m2Marks: number;
    a1c1Marks: number;
    a2c2Marks: number;
    remark?: string;
}

export interface DrillResponse {
    id: string;
    semester: number;
    maxMarks: number;
    m1Marks: number;
    m2Marks: number;
    a1c1Marks: number;
    a2c2Marks: number;
    remark: string | null;
    createdAt: string;
    updatedAt: string;
}

export async function createOcDrill(ocId: string, body: DrillPayload) {
    return api.post<DrillResponse, DrillPayload>(
        endpoints.oc.drill(ocId),
        body,
        { path: { ocId } }
    );
}

export async function listOcDrill(ocId: string, limit = 50, offset = 0) {
    return api.get<{
        items: DrillResponse[];
        total: number;
        limit: number;
        offset: number;
    }>(endpoints.oc.drill(ocId), {
        path: { ocId },
        query: { limit, offset },
    });
}

export async function updateOcDrill(ocId: string, drillId: string, body: Partial<DrillPayload>) {
    return api.patch<DrillResponse, Partial<DrillPayload>>(
        endpoints.oc.drillById(ocId, drillId),
        body,
        { path: { ocId, drillId } }
    );
}

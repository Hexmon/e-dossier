// /app/lib/api/hikeApi.ts
"use client";

import { api } from "../apiClient";
import { endpoints } from "@/constants/endpoints";

export interface HikePayload {
    semester: number;
    reason: string;
    type: string;
    dateFrom: string;
    dateTo: string;
    remark: string;
}

export async function createOcHikeRecord(ocId: string, body: HikePayload) {
    return api.post(endpoints.oc.leaveRecord(ocId), body, { path: { ocId } });
}

export async function listOcHikeRecords(ocId: string) {
    return api.get<{ items: any[] }>(endpoints.oc.leaveRecord(ocId), {
        path: { ocId },
    });
}

export async function updateOcHikeRecord(
    ocId: string,
    recordId: string,
    body: Partial<HikePayload>
) {
    return api.patch(endpoints.oc.leaveRecordById(ocId, recordId), body, {
        path: { ocId, recordId },
    });
}

export async function deleteOcHikeRecord(ocId: string, recordId: string) {
    return api.delete(endpoints.oc.leaveRecordById(ocId, recordId), {
        path: { ocId, recordId },
    });
}

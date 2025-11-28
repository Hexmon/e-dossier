"use client";

import { api } from "../apiClient";
import { endpoints } from "@/constants/endpoints";

export interface DetentionPayload {
    semester: number;
    reason: string;
    type: string;
    dateFrom: string;
    dateTo: string;
    remark: string;
}

export async function createOcDetentionRecord(ocId: string, body: DetentionPayload) {
    return api.post(endpoints.oc.leaveRecord(ocId), body, { path: { ocId } });
}

export async function listOcDetentionRecords(ocId: string) {
    return api.get<{ items: any[] }>(endpoints.oc.leaveRecord(ocId), {
        path: { ocId },
    });
}

export async function updateOcDetentionRecord(ocId: string, recordId: string, body: Partial<DetentionPayload>) {
    return api.patch(endpoints.oc.leaveRecordById(ocId, recordId), body, {
        path: { ocId, recordId },
    });
}

export async function deleteOcDetentionRecord(ocId: string, recordId: string) {
    return api.delete(endpoints.oc.leaveRecordById(ocId, recordId), {
        path: { ocId, recordId },
    });
}

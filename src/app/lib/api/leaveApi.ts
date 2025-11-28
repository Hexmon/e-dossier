"use client";

import { api } from "../apiClient";
import { endpoints } from "@/constants/endpoints";

export interface LeavePayload {
    semester: number;
    reason: string;
    type: string;
    dateFrom: string;
    dateTo: string;
    remark: string;
}

export async function createOcLeaveRecord(ocId: string, body: LeavePayload) {
    return api.post(endpoints.oc.leaveRecord(ocId), body, {
        path: { ocId },
    });
}

export async function listOcLeaveRecords(ocId: string) {
    return api.get<{ items: any[] }>(endpoints.oc.leaveRecord(ocId), {
        path: { ocId },
    });
}

export async function updateOcLeaveRecord(
    ocId: string,
    id: string,
    body: Partial<LeavePayload>
) {
    return api.patch(endpoints.oc.leaveRecordById(ocId, id), body, {
        path: { ocId, id },
    });
}

export async function deleteOcLeaveRecord(ocId: string, id: string) {
    return api.delete(endpoints.oc.leaveRecordById(ocId, id), {
        path: { ocId, id },
    });
}

"use client";

import { api } from "@/app/lib/apiClient";
import { endpoints } from "@/constants/endpoints";

export async function getSpr(ocId: string, semester: number) {
    return api.get(endpoints.oc.spr(ocId), {
        path: { ocId },
        query: { semester },
    });
}

export async function upsertSpr(
    ocId: string,
    semester: number,
    body: {
        cdrMarks?: number;
        subjectRemarks?: Record<string, string> | Array<{ subjectKey: string; remarks: string }>;
        performanceReportRemarks?: {
            platoonCommanderRemarks?: string;
            deputyCommanderRemarks?: string;
            commanderRemarks?: string;
        };
    },
) {
    return api.patch(endpoints.oc.spr(ocId), body, {
        path: { ocId },
        query: { semester },
    });
}

export async function getFpr(ocId: string) {
    return api.get(endpoints.oc.fpr(ocId), { path: { ocId } });
}

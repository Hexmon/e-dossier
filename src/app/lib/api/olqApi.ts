"use client";

import { api } from "../apiClient";
import { endpoints } from "@/constants/endpoints";

export interface OlqScore {
    subtitleId: string;
    marksScored: number;
}

export interface OlqPayload {
    semester: number;
    remarks: string;
    scores: OlqScore[];
    deleteSubtitleIds?: string[];
}

/* ------------------- CREATE ------------------- */
export async function createOcOlqRecord(ocId: string, body: OlqPayload) {
    return api.post(endpoints.oc.olq(ocId), body, {
        path: { ocId }
    });
}

/* ------------------- LIST / GET ------------------- */
export async function listOcOlqRecords(ocId: string, semester: number) {
    return api.get(endpoints.oc.olqBySemester(ocId, semester), {
        path: { ocId }
    });
}

/* ------------------- UPDATE (PATCH) ------------------- */
export async function updateOcOlqRecord(
    ocId: string,
    body: OlqPayload
) {
    return api.patch(endpoints.oc.olq(ocId), body, {
        path: { ocId }
    });
}

/* ------------------- DELETE ENTIRE SEMESTER ------------------- */
export async function deleteOcOlqRecordsForSemester(
    ocId: string,
    semester: number
) {
    return api.delete(endpoints.oc.olqDeleteSemester(ocId, semester), {
        path: { ocId }
    });
}

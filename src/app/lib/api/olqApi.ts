// /app/lib/api/olqApi.ts
"use client";

import { api } from "../apiClient";
import { endpoints } from "@/constants/endpoints";

/**
 * List categories with subtitles (returns backend structure)
 */
export async function listOlqCategories(ocId: string) {
    return api.get(endpoints.oc.olqCategories(ocId), { path: { ocId } });
}

/**
 * List OLQ records for a semester (returns items)
 */
export async function listOlqRecords(ocId: string, semester: number) {
    return api.get(endpoints.oc.olq(ocId), {
        path: { ocId },
        query: { semester, includeCategories: true },
    });
}

/**
 * Create an OLQ record (payload: { semester, scores: [{ subtitleId, marksScored }] })
 */
export async function createOcOlqRecord(ocId: string, body: { semester: number; scores: { subtitleId: string; marksScored: number }[] }) {
    return api.post(endpoints.oc.olq(ocId), body, { path: { ocId } });
}

/**
 * Update OLQ records for a semester (backend expects semester + scores + optional deleteSubtitleIds)
 */
export async function updateOcOlqRecord(ocId: string, body: { semester: number; scores: { subtitleId: string; marksScored: number }[]; deleteSubtitleIds?: string[] }) {
    return api.patch(endpoints.oc.olq(ocId), body, { path: { ocId } });
}

/**
 * Delete OLQ records for a semester
 */
export async function deleteOcOlqSemester(ocId: string, semester: number) {
    return api.delete(endpoints.oc.olq(ocId), {
        path: { ocId },
        query: { semester },
    });
}

// /hooks/useOlqActions.ts
"use client";

import { toast } from "sonner";
import {
    listOlqCategories,
    listOlqRecords,
    createOcOlqRecord,
    updateOcOlqRecord,
    deleteOcOlqSemester,
} from "@/app/lib/api/olqApi";

/**
 * Hook that wraps olq API functions and returns small helpers.
 * selectedCadet: object that contains ocId
 */
export const useOlqActions = (selectedCadet: any) => {
    const ocId = selectedCadet?.ocId;

    const fetchCategories = async () => {
        if (!ocId) return [];
        const res = await listOlqCategories(ocId);
        console.log("🟣 RAW SEMESTER RESPONSE:", res);
        console.log("🟢 (OLD) res.items:", res.items);
        return res.items ?? [];
    };

    const fetchSemester = async (semester: number) => {
        if (!ocId) return [];
        console.log(`🔵 Fetching OLQ semester records for ocId=${ocId}, semester=${semester}`);

        const res = await listOlqRecords(ocId, semester);

        console.log("🟣 RAW SEMESTER RESPONSE:", res);
        console.log("🟢 (OLD) res.items:", res.items);
        const categories = res?.data?.categories ?? [];
        console.log("🟢 EXTRACTED categories from res.data.categories:", categories);

        return categories;
    };

    const createRecord = async (payload: { semester: number; scores: { subtitleId: string; marksScored: number }[] }) => {
        if (!ocId) { toast.error("No cadet selected"); return null; }
        try {
            const res = await createOcOlqRecord(ocId, payload);
            return res;
        } catch (err) {
            console.error(err);
            toast.error("Failed to create OLQ record");
            throw err;
        }
    };

    const updateRecord = async (payload: { semester: number; scores: { subtitleId: string; marksScored: number }[]; deleteSubtitleIds?: string[] }) => {
        if (!ocId) { toast.error("No cadet selected"); return null; }
        try {
            const res = await updateOcOlqRecord(ocId, payload);
            return res;
        } catch (err) {
            console.error(err);
            toast.error("Failed to update OLQ record");
            throw err;
        }
    };

    const deleteSemester = async (semester: number) => {
        if (!ocId) { toast.error("No cadet selected"); return false; }
        try {
            await deleteOcOlqSemester(ocId, semester);
            toast.success("OLQ semester deleted");
            return true;
        } catch (err) {
            console.error(err);
            toast.error("Failed to delete semester");
            return false;
        }
    };

    return {
        fetchCategories,
        fetchSemester,
        createRecord,
        updateRecord,
        deleteSemester,
    };
};

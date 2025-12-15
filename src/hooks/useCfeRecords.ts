"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";

import {
    listCreditForExcellence,
    createCreditForExcellence,
    updateCreditForExcellence,
    deleteCreditForExcellence,
    CfeItem,
    CfeRecord,
} from "@/app/lib/api/cfeApi";

import type { cfeRow } from "@/types/cfe";

/**
 * Hook: useCfeRecords
 * - ocId: dynamic oc id
 * - semestersCount: number of semester buckets
 *
 * groups: cfeRow[][] where index = semesterIndex (semester-1)
 * 
 * KEY FIX: saveSemesterPayload now MERGES existing records with new ones
 * instead of replacing them. This ensures old records are preserved.
 */
export function useCfeRecords(ocId: string, semestersCount = 6) {
    const [groups, setGroups] = useState<cfeRow[][]>(Array.from({ length: semestersCount }, () => []));
    const [loading, setLoading] = useState(false);

    const fetchAll = useCallback(async () => {
        if (!ocId) return;
        setLoading(true);
        try {
            const resp = await listCreditForExcellence(ocId);

            const buckets: cfeRow[][] = Array.from({ length: semestersCount }, () => []);

            const items = resp?.items ?? [];

            for (const rec of items as CfeRecord[]) {
                const semester = Math.max(1, Number(rec.semester ?? 1));
                const idx = Math.min(Math.max(0, semester - 1), semestersCount - 1);

                const dataArray = Array.isArray(rec.data) ? rec.data : [];

                const rows: cfeRow[] = dataArray.map((it: CfeItem, index: number) => {
                    const { cat = "", marks = 0, remarks = "" } = it ?? {};
                    return {
                        id: rec.id ?? undefined,
                        serialNo: String(index + 1),
                        cat,
                        mks: String(marks),
                        remarks: remarks ?? rec.remark ?? "",
                    };
                });

                // append rows to bucket (there may be multiple records per semester)
                buckets[idx] = [...buckets[idx], ...rows];
            }

            setGroups(buckets);
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : "Failed to load CFE data");
        } finally {
            setLoading(false);
        }
    }, [ocId, semestersCount]);

    /**
     * Save new records for a semester by MERGING with existing records
     * dataRows: array of { cat, mks, remarks } coming from the form
     * 
     * KEY FIX: This function now:
     * 1. Gets all existing records for the semester from 'groups' state
     * 2. Converts them to CfeItem format
     * 3. Combines existing items + new items
     * 4. Sends the complete merged list to the backend
     * 5. Calls fetchAll() to refresh all data
     * 
     * Result: All previous records are preserved + new ones are added
     */
    const saveSemesterPayload = useCallback(
        async (semesterIndex: number, dataRows: Array<{ cat: string; mks: string; remarks?: string }>) => {
            if (!ocId) return null;
            setLoading(true);
            try {
                const semester = semesterIndex + 1;

                // Transform NEW form rows to CfeItem
                const newItems: CfeItem[] = dataRows
                    .filter((r) => r.cat && r.mks)
                    .map((r) => ({ cat: r.cat, marks: Number(r.mks) || 0, remarks: r.remarks ?? "" }));

                if (newItems.length === 0) {
                    toast.error("Please provide at least one valid row");
                    return null;
                }

                // Get EXISTING records for this semester from state
                const existingRows = groups[semesterIndex] ?? [];

                // Convert existing cfeRow[] to CfeItem[]
                const existingItems: CfeItem[] = existingRows
                    .map((row) => ({
                        cat: row.cat ?? "",
                        marks: Number(row.mks) || 0,
                        remarks: row.remarks ?? "",
                    }));

                // MERGE: Combine existing items with new items
                // This preserves all previous records while adding new ones
                const allItems: CfeItem[] = [...existingItems, ...newItems];

                // Send the complete merged list to backend
                const payload = { semester, data: allItems, remark: "" };

                const resp = await createCreditForExcellence(ocId, [payload]);

                if (!resp) {
                    toast.error("Save failed");
                    return null;
                }

                toast.success("Saved successfully");
                await fetchAll();
                return resp;
            } catch (err: unknown) {
                toast.error(err instanceof Error ? err.message : "Failed to save CFE data");
                return null;
            } finally {
                setLoading(false);
            }
        },
        [ocId, groups, fetchAll]  // Added 'groups' to dependencies so we get fresh existing data
    );

    /**
     * Replace entire semester's items with given items (used by inline edit)
     * items param: array of { cat, marks, remarks }
     * 
     * This completely replaces all records for a semester with the provided items.
     * Used when user edits existing records in the table.
     */
    const replaceSemesterPayload = useCallback(
        async (semesterIndex: number, items: Array<{ cat: string; marks: number; remarks?: string }>) => {
            if (!ocId) return null;
            setLoading(true);
            try {
                const semester = semesterIndex + 1;
                const payload = {
                    semester,
                    data: items.map((it) => ({
                        cat: it.cat,
                        marks: Number(it.marks) || 0,
                        remarks: it.remarks ?? "",
                    })),
                    remark: "",
                };

                // Create with the complete set of items for this semester
                const resp = await createCreditForExcellence(ocId, [payload]);

                if (!resp) {
                    toast.error("Update failed");
                    return null;
                }

                toast.success("Updated successfully");
                await fetchAll();
                return resp;
            } catch (err: unknown) {
                toast.error(err instanceof Error ? err.message : "Failed to update semester payload");
                return null;
            } finally {
                setLoading(false);
            }
        },
        [ocId, fetchAll]
    );

    const deleteRecordById = useCallback(
        async (id: string) => {
            if (!ocId) return false;
            setLoading(true);
            try {
                const resp = await deleteCreditForExcellence(ocId, id);
                if (!resp) {
                    toast.error("Delete failed");
                    return false;
                }
                toast.success("Deleted");
                await fetchAll();
                return true;
            } catch (err: unknown) {
                toast.error(err instanceof Error ? err.message : "Failed to delete record");
                return false;
            } finally {
                setLoading(false);
            }
        },
        [ocId, fetchAll]
    );

    return {
        groups,
        loading,
        fetchAll,
        saveSemesterPayload,
        replaceSemesterPayload,
        deleteRecordById,
    };
}
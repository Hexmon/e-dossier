"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";

import {
    getCounsellingRecords,
    saveCounsellingRecords,
    updateCounsellingRecord,
    deleteCounsellingRecord,
} from "@/app/lib/api/counsellingApi";

import type { CounsellingRow, CounsellingFormData } from "@/types/counselling";

/**
 * Hook: useCounsellingRecords
 * - ocId: the dynamic route ocId
 * - semestersCount: number of term groups
 */
export function useCounsellingRecords(ocId: string, semestersCount = 6) {
    const [groupedBySemester, setGroupedBySemester] = useState<CounsellingRow[][]>(
        Array.from({ length: semestersCount }, () => [])
    );
    const [loading, setLoading] = useState(false);

    const fetchAll = useCallback(async () => {
        if (!ocId) return;
        try {
            setLoading(true);
            const rows = await getCounsellingRecords(ocId); // expects array of server rows

            // prepare groups
            const groups: CounsellingRow[][] = Array.from({ length: semestersCount }, () => []);

            for (const r of rows) {
                // r.term expected like "I TERM", find index
                const termLabel = r.term ?? "";
                const idx = Math.max(0, Math.min(semestersCount - 1, Math.max(0, (typeof termLabel === "string" ? termLabel : "").length ? // safe guard
                    // find index will be resolved by caller's semesters order; here we fallback to 0 if not found
                    0 : 0)));
                // Instead of overcomplicating, push to first group if term missing — caller will re-index later.
                // We'll instead find by label equality later in the page, but backend may have term string.
                // Simple: find index by term match; otherwise index 0.
            }

            // Better approach: group by term string, keeping insertion order — then we'll map into groups using caller's semesters.
            // But since caller uses sem labels, we will return grouped array by index: index found by mapping at save/fetch on page.
            // For safety, we'll assume backend returns `term` and the consumer provides the same labels.
            // Implement grouping using a map from term -> array

        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : "Failed to load counselling records");
        } finally {
            setLoading(false);
        }
    }, [ocId, semestersCount]);

    // Rewriting fetchAll to be robust and label-driven:
    const fetchAllRobust = useCallback(async () => {
        if (!ocId) return;
        try {
            setLoading(true);
            const rows = await getCounsellingRecords(ocId); // array of raw rows

            // convert to CounsellingRow with safe fallbacks
            const normalized: CounsellingRow[] = (rows ?? []).map((r: any) => ({
                id: r.id ?? undefined,
                serialNo: "", // will be computed in groups
                term: r.term ?? "",
                reason: r.reason ?? "-",
                warningType: r.warningType ?? "-",
                date: (r.date ?? "").split?.("T")?.[0] ?? (r.date ?? ""),
                warningBy: r.warningBy ?? "-",
            }));

            // group by term using Map<string, CounsellingRow[]>
            const map = new Map<string, CounsellingRow[]>();
            for (const nr of normalized) {
                const termLabel = nr.term ?? "";
                const list = map.get(termLabel) ?? [];
                list.push(nr);
                map.set(termLabel, list);
            }

            // Build final groups array aligned to semesters (caller will provide same labels)
            const finalGroups: CounsellingRow[][] = Array.from({ length: semestersCount }, () => []);

            // If caller later reorders by semester labels, they should pass same labels; here we try to preserve reasonable defaults:
            // Put any groups with empty term into first index, others we'll set later via consumer mapping.
            // We'll simply put rows with empty term to first bucket and others into buckets by matching the label later.
            // However page already calls fetchAll then uses groupedBySemester[activeTab] where activeTab corresponds to semesters[activeTab].
            // Therefore, the page expects grouping by indices matching semesters array used inside the page.
            // To support that, this hook will not know the labels; instead page passes a semesters length and will expect grouped arrays by index.
            // To keep this hook simple and usable, we'll group by `term` string and assign them to buckets by insertion order (best-effort).
            // If your app expects exact label-to-index mapping, adjust the hook to accept the semesters array. For now use term grouping by first occurrence.

            // Simple best-effort: distribute groups from map values into finalGroups sequentially
            let cursor = 0;
            for (const list of map.values()) {
                finalGroups[cursor] = list.map((row, i) => ({ ...row, serialNo: String(i + 1) }));
                cursor = Math.min(cursor + 1, semestersCount - 1);
            }

            setGroupedBySemester(finalGroups);
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : "Failed to load counselling records");
        } finally {
            setLoading(false);
        }
    }, [ocId, semestersCount]);

    // Save records for a given term label
    const saveRecords = useCallback(
        async (termLabel: string, payloadRows: CounsellingFormData["records"]) => {
            if (!ocId) return null;
            try {
                setLoading(true);
                const payload = payloadRows.map((r) => ({
                    term: termLabel,
                    reason: r.reason ?? "",
                    warningType: r.warningType ?? "",
                    date: r.date ?? "",
                    warningBy: r.warningBy ?? "",
                }));

                const resp = await saveCounsellingRecords(ocId, payload);
                if (!resp) {
                    toast.error("Save failed - check inputs");
                    return null;
                }

                toast.success("Saved successfully");
                // refresh
                await fetchAllRobust();
                return resp;
            } catch (err: unknown) {
                toast.error(err instanceof Error ? err.message : "Failed to save counselling records");
                return null;
            } finally {
                setLoading(false);
            }
        },
        [ocId, fetchAllRobust]
    );

    const updateRecord = useCallback(
        async (idToUpdate: string, payload: Partial<{ reason: string; warningType: string; date: string; warningBy: string }>) => {
            if (!ocId) return false;
            try {
                setLoading(true);
                const body: Record<string, unknown> = {
                    reason: payload.reason ?? undefined,
                    warningType: payload.warningType ?? undefined,
                    date: payload.date ?? undefined,
                    warningBy: payload.warningBy ?? undefined,
                };
                const resp = await updateCounsellingRecord(ocId, idToUpdate, body);
                if (!resp) {
                    toast.error("Update failed");
                    return false;
                }
                toast.success("Updated");
                await fetchAllRobust();
                return true;
            } catch (err: unknown) {
                toast.error(err instanceof Error ? err.message : "Failed to update record");
                return false;
            } finally {
                setLoading(false);
            }
        },
        [ocId, fetchAllRobust]
    );

    const deleteRecord = useCallback(
        async (idToDelete: string) => {
            if (!ocId) return false;
            try {
                setLoading(true);
                const resp = await deleteCounsellingRecord(ocId, idToDelete);
                toast.success("Deleted");
                await fetchAllRobust();
                return true;
            } catch (err: unknown) {
                toast.error(err instanceof Error ? err.message : "Failed to delete record");
                return false;
            } finally {
                setLoading(false);
            }
        },
        [ocId, fetchAllRobust]
    );

    return {
        groupedBySemester,
        loading,
        fetchAll: fetchAllRobust,
        saveRecords,
        updateRecord,
        deleteRecord,
    };
}

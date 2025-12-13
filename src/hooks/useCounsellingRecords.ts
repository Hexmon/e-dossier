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
 * - semesters: array of semester labels (e.g., ["I TERM", "II TERM", ...])
 */
export function useCounsellingRecords(ocId: string, semesters: string[]) {
    const [groupedBySemester, setGroupedBySemester] = useState<CounsellingRow[][]>(
        Array.from({ length: semesters.length }, () => [])
    );
    const [loading, setLoading] = useState(false);

    // Helper function to normalize warningType for backend
    const normalizeWarningTypeForBackend = (value: string): string => {
        const lowerValue = value.toLowerCase().trim();
        if (lowerValue === "relegation") return "Relegation";
        if (lowerValue === "withdrawal") return "Withdrawal";
        return "Other";
    };

    const fetchAllRobust = useCallback(async () => {
        if (!ocId) return;
        try {
            setLoading(true);
            const rows = await getCounsellingRecords(ocId); // array of raw rows

            // convert to CounsellingRow with safe fallbacks
            const normalized: CounsellingRow[] = (rows ?? []).map((r: any) => {
                // Determine display value for warningType
                let displayWarningType = r.warningType ?? "-";
                
                // If backend returns "Other", check if there's a stored original value
                if (r.warningType === "Other" && r.warningTypeOriginal) {
                    displayWarningType = r.warningTypeOriginal;
                } else if (r.warningType === "Relegation") {
                    displayWarningType = "Relegation";
                } else if (r.warningType === "Withdrawal") {
                    displayWarningType = "Withdrawal";
                } else if (r.warningType === "Other") {
                    displayWarningType = r.warningTypeOriginal || "Other";
                }

                return {
                    id: r.id ?? undefined,
                    serialNo: "", // will be computed in groups
                    term: r.term ?? "",
                    reason: r.reason ?? "-",
                    warningType: displayWarningType,
                    date: (r.date ?? "").split?.("T")?.[0] ?? (r.date ?? ""),
                    warningBy: r.warningBy ?? "-",
                };
            });

            // Build final groups array aligned to semesters by matching term label
            const finalGroups: CounsellingRow[][] = Array.from({ length: semesters.length }, () => []);

            // Group records by matching term label to semester array
            for (const nr of normalized) {
                const termLabel = nr.term ?? "";
                const semesterIndex = semesters.findIndex(sem => sem === termLabel);
                
                if (semesterIndex !== -1) {
                    finalGroups[semesterIndex].push(nr);
                }
            }

            // Compute serial numbers for each group
            finalGroups.forEach((group) => {
                group.forEach((row, i) => {
                    row.serialNo = String(i + 1);
                });
            });

            setGroupedBySemester(finalGroups);
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : "Failed to load counselling records");
        } finally {
            setLoading(false);
        }
    }, [ocId, semesters]);

    // Save records for a given term label
    const saveRecords = useCallback(
        async (termLabel: string, payloadRows: CounsellingFormData["records"]) => {
            if (!ocId) return null;
            try {
                setLoading(true);
                const payload = payloadRows.map((r) => {
                    const userEnteredValue = r.warningType ?? "";
                    const normalizedType = normalizeWarningTypeForBackend(userEnteredValue);
                    
                    return {
                        term: termLabel,
                        reason: r.reason ?? "",
                        warningType: normalizedType,
                        warningTypeOriginal: userEnteredValue, // Always store the original user input
                        date: r.date ?? "",
                        warningBy: r.warningBy ?? "",
                    };
                });

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
                const userEnteredValue = payload.warningType ?? "";
                const normalizedType = userEnteredValue ? normalizeWarningTypeForBackend(userEnteredValue) : undefined;
                
                const body: Record<string, unknown> = {
                    reason: payload.reason ?? undefined,
                    warningType: normalizedType,
                    warningTypeOriginal: userEnteredValue || undefined, // Store original value
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

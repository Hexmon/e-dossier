"use client";

import { useCallback, useState, useRef } from "react";
import { toast } from "sonner";

import { getAllDisciplineRecords, updateAdminDisciplineRecord, deleteAdminDisciplineRecord } from "@/app/lib/api/disciplineApi";

export interface AdminDisciplineRow {
    id: string;
    ocId: string;
    ocName: string;
    ocNo: string;
    semester?: number;
    punishment: string;
    points: number;
    dateOfOffence: string;
    offence: string;
    dateOfAward: string;
    byWhomAwarded: string;
}

export function useDisciplineRecordsAdmin() {
    const [records, setRecords] = useState<AdminDisciplineRow[]>([]);
    const [loading, setLoading] = useState(false);
    const hasFetchedRef = useRef(false);

    const fetchAll = useCallback(async () => {
        if (hasFetchedRef.current) return;

        try {
            setLoading(true);
            hasFetchedRef.current = true;

            const discRecords = await getAllDisciplineRecords();

            const allRecords: AdminDisciplineRow[] = discRecords.map(rec => ({
                id: rec.id || `${rec.ocId}-${rec.semester}-${rec.dateOfOffence}`,
                ocId: rec.ocId || "",
                ocName: rec.ocName || "",
                ocNo: rec.ocNo || "",
                semester: rec.semester,
                punishment: rec.punishmentAwarded || "-",
                points: rec.pointsDelta || 0,
                dateOfOffence: rec.dateOfOffence || "-",
                offence: rec.offence || "-",
                dateOfAward: rec.awardedOn || "-",
                byWhomAwarded: rec.awardedBy || "-",
            }));

            setRecords(allRecords);
        } catch (err) {
            toast.error("Failed to load discipline records");
            console.error(err);
            hasFetchedRef.current = false; // Allow retry on error
        } finally {
            setLoading(false);
        }
    }, []);

    const updateRecord = useCallback(async (id: string, payload: Record<string, unknown>) => {
        try {
            await updateAdminDisciplineRecord(id, payload);
            toast.success("Discipline record updated successfully");
            // Refetch to get updated data
            hasFetchedRef.current = false;
            await fetchAll();
        } catch (err) {
            toast.error("Failed to update discipline record");
            console.error(err);
        }
    }, [fetchAll]);

    const deleteRecord = useCallback(async (id: string) => {
        try {
            await deleteAdminDisciplineRecord(id);
            toast.success("Discipline record deleted successfully");
            // Refetch to get updated data
            hasFetchedRef.current = false;
            await fetchAll();
        } catch (err) {
            toast.error("Failed to delete discipline record");
            console.error(err);
        }
    }, [fetchAll]);

    return {
        records,
        loading,
        fetchAll,
        updateRecord,
        deleteRecord,
    };
}

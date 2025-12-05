"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";

import {
    getDisciplineRecords,
    saveDisciplineRecords,
    updateDisciplineRecord,
    deleteDisciplineRecord,
} from "@/app/lib/api/disciplineApi";

import type { DisciplineRow as RawDisciplineRow, DisciplineForm } from "@/types/dicp-records";

/**
 * Normalized row used by UI
 */
export type DisciplineRow = {
    id?: string;
    serialNo: string;
    dateOfOffence: string;
    offence: string;
    punishmentAwarded: string;
    dateOfAward: string;
    byWhomAwarded: string;
    negativePts: string;
    cumulative: string;
    semester?: number;
};

export function useDisciplineRecords(ocId: string, semestersCount = 6) {
    const [groupedBySemester, setGroupedBySemester] = useState<DisciplineRow[][]>(
        Array.from({ length: semestersCount }, () => [])
    );
    const [loading, setLoading] = useState(false);

    const fetchAll = useCallback(async () => {
        if (!ocId) return;
        try {
            setLoading(true);
            const rows = await getDisciplineRecords(ocId); // expected array of raw rows

            // prepare empty groups
            const groups: DisciplineRow[][] = Array.from({ length: semestersCount }, () => []);

            for (const r of rows) {
                const sem = Math.max(1, Number(r.semester ?? 1));
                const idx = Math.min(sem - 1, semestersCount - 1);

                const prev = groups[idx];
                const prevCumulative = prev.length ? Number(prev[prev.length - 1].cumulative) || 0 : 0;
                const pointsDelta = Number(r.pointsDelta ?? 0);
                const newCumulative = prevCumulative + pointsDelta;

                groups[idx].push({
                    id: r.id,
                    serialNo: String(prev.length + 1),
                    dateOfOffence: (r.dateOfOffence ?? "").split("T")[0] || "-",
                    offence: r.offence ?? "-",
                    punishmentAwarded: r.punishmentAwarded ?? "-",
                    dateOfAward: (r.awardedOn ?? "").split("T")[0] || "-",
                    byWhomAwarded: r.awardedBy ?? "-",
                    negativePts: String(r.pointsDelta ?? "0"),
                    cumulative: String(newCumulative),
                    semester: sem,
                });
            }

            setGroupedBySemester(groups);
        } catch (err) {
            toast.error("Failed to load discipline records");
        } finally {
            setLoading(false);
        }
    }, [ocId, semestersCount]);

    const saveRecords = useCallback(
        async (semester: number, payloadRows: DisciplineForm["records"]) => {
            if (!ocId) return null;

            try {
                const payload = payloadRows.map((r) => ({
                    semester,
                    dateOfOffence: r.dateOfOffence ?? "",
                    offence: r.offence ?? "",
                    punishmentAwarded: r.punishmentAwarded ?? null,
                    awardedOn: r.dateOfAward ?? null,
                    awardedBy: r.byWhomAwarded ?? null,
                    pointsDelta: r.negativePts ? Number(r.negativePts) : 0,
                    pointsCumulative: r.cumulative ? Number(r.cumulative) : 0,
                }));

                const resp = await saveDisciplineRecords(ocId, payload);
                if (!resp?.ok) {
                    toast.error("Please check your inputs and try again");
                    return null;
                }
                toast.success("Saved successfully");
                await fetchAll();
                return resp;
            } catch(err) {
                toast.error("Failed to save discipline records");
                return null;
            }
        },
        [ocId, fetchAll]
    );

    const update = useCallback(
        async (id: string, payload: Partial<RawDisciplineRow>) => {
            if (!ocId) return null;
            try {
                const body: Record<string, unknown> = {
                    punishmentAwarded: payload.punishmentAwarded ?? undefined,
                    pointsDelta: payload.pointsDelta !== undefined ? Number(payload.pointsDelta) : undefined,
                    awardedOn: payload.awardedOn ?? undefined,
                    awardedBy: payload.awardedBy ?? undefined,
                    dateOfOffence: payload.dateOfOffence ?? undefined,
                    offence: payload.offence ?? undefined,
                };

                const resp = await updateDisciplineRecord(ocId, id, body);;

                if (!resp) {
                    toast.error("Failed to update record");
                    return false;
                }

                toast.success("Record updated");
                await fetchAll();
                return true;

            } catch {
                toast.error("Failed to update record");
                return false;
            }
        },
        [ocId, fetchAll]
    );

    const remove = useCallback(
        async (id: string) => {
            if (!ocId) return false;
            try {
                const resp = await deleteDisciplineRecord(ocId, id);
                if (!resp) {
                    toast.error("Failed to delete");
                    return false;
                }
                toast.success("Deleted");
                await fetchAll();
                return true;
            } catch {
                toast.error("Failed to delete record");
                return false;
            }
        },
        [ocId, fetchAll]
    );

    return {
        groupedBySemester,
        loading,
        fetchAll,
        saveRecords,
        updateRecord: update,
        deleteRecord: remove,
    };
}

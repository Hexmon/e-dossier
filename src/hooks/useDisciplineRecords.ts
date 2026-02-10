"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useCallback } from "react";

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
    punishmentId?: string;
    numberOfPunishments: number;
    dateOfAward: string;
    byWhomAwarded: string;
    negativePts: string;
    cumulative: string;
    semester?: number;
};

export function useDisciplineRecords(ocId: string, semestersCount = 6) {
    const queryClient = useQueryClient();

    // Fetch all discipline records with React Query
    const { data: groupedBySemester = Array.from({ length: semestersCount }, () => []), isLoading: loading } = useQuery({
        queryKey: ["disciplineRecords", ocId],
        queryFn: async () => {
            if (!ocId) return Array.from({ length: semestersCount }, () => []);

            const rows = await getDisciplineRecords(ocId);
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
                    punishmentId: r.punishmentId ? "" : undefined,
                    numberOfPunishments: r.numberOfPunishments ?? 1,
                    dateOfAward: (r.awardedOn ?? "").split("T")[0] || "-",
                    byWhomAwarded: r.awardedBy ?? "-",
                    negativePts: String(r.pointsDelta ?? "0"),
                    cumulative: String(newCumulative),
                    semester: sem,
                });
            }

            return groups;
        },
        enabled: !!ocId,
        staleTime: 5 * 60 * 1000,
    });

    // Save mutation
    const saveMutation = useMutation({
        mutationFn: async ({ semester, payloadRows }: { semester: number; payloadRows: DisciplineForm["records"] }) => {
            if (!ocId) throw new Error("No OC ID");

            const payload = payloadRows.map((r) => ({
                semester,
                dateOfOffence: r.dateOfOffence ?? "",
                offence: r.offence ?? "",
                punishmentAwarded: r.punishmentAwarded ?? null,
                punishmentId: r.punishmentId ?? null,
                numberOfPunishments: r.numberOfPunishments ?? 1,
                awardedOn: r.dateOfAward ?? null,
                awardedBy: r.byWhomAwarded ?? null,
                pointsDelta: r.negativePts ? Number(r.negativePts) : 0,
                pointsCumulative: r.cumulative ? Number(r.cumulative) : 0,
            }));

            return await saveDisciplineRecords(ocId, payload);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["disciplineRecords", ocId] });
            toast.success("Saved successfully");
        },
        onError: () => {
            toast.error("Failed to save discipline records");
        },
    });

    // Update mutation
    const updateMutation = useMutation({
        mutationFn: async ({ id, payload }: { id: string; payload: Partial<RawDisciplineRow> }) => {
            if (!ocId) throw new Error("No OC ID");

            const body: Record<string, unknown> = {
                punishmentAwarded: payload.punishmentAwarded ?? undefined,
                punishmentId: payload.punishmentId ?? undefined,
                numberOfPunishments: payload.numberOfPunishments ?? undefined,
                pointsDelta: payload.pointsDelta !== undefined ? Number(payload.pointsDelta) : undefined,
                awardedOn: payload.awardedOn ?? undefined,
                awardedBy: payload.awardedBy ?? undefined,
                dateOfOffence: payload.dateOfOffence ?? undefined,
                offence: payload.offence ?? undefined,
            };

            return await updateDisciplineRecord(ocId, id, body);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["disciplineRecords", ocId] });
            toast.success("Record updated");
        },
        onError: () => {
            toast.error("Failed to update record");
        },
    });

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            if (!ocId) throw new Error("No OC ID");
            return await deleteDisciplineRecord(ocId, id);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["disciplineRecords", ocId] });
            toast.success("Deleted");
        },
        onError: () => {
            toast.error("Failed to delete record");
        },
    });

    // Memoize fetchAll to prevent unnecessary re-renders
    const fetchAll = useCallback(() => {
        queryClient.invalidateQueries({ queryKey: ["disciplineRecords", ocId] });
    }, [queryClient, ocId]);

    return {
        groupedBySemester,
        loading,
        fetchAll,
        saveRecords: (semester: number, payloadRows: DisciplineForm["records"]) =>
            saveMutation.mutateAsync({ semester, payloadRows }),
        updateRecord: (id: string, payload: Partial<RawDisciplineRow>) =>
            updateMutation.mutateAsync({ id, payload }),
        deleteRecord: deleteMutation.mutateAsync,
    };
}
"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
    getAllDisciplineRecords,
    updateAdminDisciplineRecord,
    deleteAdminDisciplineRecord,
} from "@/app/lib/api/disciplineApi";

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
    const queryClient = useQueryClient();

    const { data: records = [], isLoading: loading } = useQuery({
        queryKey: ["disciplineRecords"],
        queryFn: async () => {
            try {
                const discRecords = await getAllDisciplineRecords();

                const allRecords: AdminDisciplineRow[] = discRecords.map((rec) => ({
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

                return allRecords;
            } catch (err) {
                toast.error("Failed to load discipline records");
                console.error(err);
                return [];
            }
        },
        staleTime: 5 * 60 * 1000,
    });

    const updateMutation = useMutation({
        mutationFn: async ({
            id,
            payload,
        }: {
            id: string;
            payload: Record<string, unknown>;
        }) => {
            return await updateAdminDisciplineRecord(id, payload);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["disciplineRecords"] });
            toast.success("Discipline record updated successfully");
        },
        onError: (err) => {
            toast.error("Failed to update discipline record");
            console.error(err);
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            return await deleteAdminDisciplineRecord(id);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["disciplineRecords"] });
            toast.success("Discipline record deleted successfully");
        },
        onError: (err) => {
            toast.error("Failed to delete discipline record");
            console.error(err);
        },
    });

    return {
        records,
        loading,
        fetchAll: () => queryClient.invalidateQueries({ queryKey: ["disciplineRecords"] }),
        updateRecord: (id: string, payload: Record<string, unknown>) =>
            updateMutation.mutateAsync({ id, payload }),
        deleteRecord: deleteMutation.mutateAsync,
    };
}
"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
    createPunishment,
    deletePunishment,
    getPunishmentById,
    Punishment,
    PunishmentCreate,
    PunishmentUpdate,
    listPunishments,
    ListPunishmentsParams,
    updatePunishment
} from "@/app/lib/api/punishmentsApi";

export function usePunishments(params?: ListPunishmentsParams) {
    const queryClient = useQueryClient();

    // Fetch punishments with React Query
    const { data: punishments = [], isLoading: loading } = useQuery({
        queryKey: ["punishments", params],
        queryFn: async () => {
            const data = await listPunishments(params);
            return data?.punishments || [];
        },
        staleTime: 10 * 60 * 1000, // 10 minutes - punishments rarely change
    });

    // Get punishment by ID
    const fetchPunishmentById = async (punishmentId: string) => {
        return await queryClient.fetchQuery({
            queryKey: ["punishment", punishmentId],
            queryFn: async () => {
                const punishment = await getPunishmentById(punishmentId);
                return punishment || null;
            },
            staleTime: 10 * 60 * 1000,
        });
    };

    // Create mutation
    const createMutation = useMutation({
        mutationFn: (punishment: PunishmentCreate) => createPunishment(punishment),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["punishments"] });
            toast.success("Punishment created successfully");
        },
        onError: () => {
            toast.error("Failed to create punishment");
        },
    });

    // Update mutation
    const updateMutation = useMutation({
        mutationFn: ({ id, updates }: { id: string; updates: PunishmentUpdate }) =>
            updatePunishment(id, updates),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["punishments"] });
            toast.success("Punishment updated successfully");
        },
        onError: () => {
            toast.error("Failed to update punishment");
        },
    });

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: ({ id, hard }: { id: string; hard?: boolean }) => deletePunishment(id, hard ?? true),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["punishments"] });
            toast.success("Punishment deleted successfully");
        },
        onError: () => {
            toast.error("Failed to delete punishment");
        },
    });

    return {
        loading,
        punishments,
        fetchPunishments: () => queryClient.invalidateQueries({ queryKey: ["punishments"] }),
        fetchPunishmentById,
        addPunishment: createMutation.mutateAsync,
        editPunishment: (punishmentId: string, updates: PunishmentUpdate) =>
            updateMutation.mutateAsync({ id: punishmentId, updates }),
        removePunishment: (punishmentId: string, hard: boolean = true) =>
            deleteMutation.mutateAsync({ id: punishmentId, hard }),
    };
}
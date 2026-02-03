"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
    fetchOCsWithCount,
    createOC,
    updateOC,
    deleteOC,
    type OCListRow,
    type OCRecord,
    type FetchOCParams,
} from "@/app/lib/api/ocApi";

export function useOCs(params?: FetchOCParams) {
    const queryClient = useQueryClient();

    // Fetch OCs with React Query
    const {
        data = { items: [], count: 0 },
        isLoading: loading,
        refetch,
    } = useQuery({
        queryKey: ["ocs", params],
        queryFn: async () => {
            const res = await fetchOCsWithCount<OCListRow>(params || {});
            return {
                items: res.items ?? [],
                count: res.count ?? 0,
            };
        },
        staleTime: 5 * 60 * 1000, // 5 minutes
        enabled: !!params, // Only fetch when params are provided
    });

    // Add OC mutation
    const addOCMutation = useMutation({
        mutationFn: async (payload: Omit<OCRecord, "id" | "uid" | "createdAt">) => {
            return await createOC(payload);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["ocs"] });
            toast.success("OC added successfully");
        },
        onError: (error: any) => {
            toast.error(error.message || "Failed to add OC");
        },
    });

    // Edit OC mutation
    const editOCMutation = useMutation({
        mutationFn: async ({ id, payload }: { id: string; payload: Partial<OCRecord> }) => {
            return await updateOC(id, payload);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["ocs"] });
            toast.success("OC updated successfully");
        },
        onError: (error: any) => {
            toast.error(error.message || "Failed to update OC");
        },
    });

    // Delete OC mutation
    const removeOCMutation = useMutation({
        mutationFn: async (id: string) => {
            await deleteOC(id);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["ocs"] });
            toast.success("OC deleted successfully");
        },
        onError: (error: any) => {
            toast.error(error.message || "Failed to delete OC");
        },
    });

    return {
        ocList: data.items,
        totalCount: data.count,
        loading,
        fetchOCs: (newParams: FetchOCParams) => {
            queryClient.invalidateQueries({ queryKey: ["ocs", newParams] });
        },
        addOC: addOCMutation.mutateAsync,
        editOC: (id: string, payload: Partial<OCRecord>) =>
            editOCMutation.mutateAsync({ id, payload }),
        removeOC: removeOCMutation.mutateAsync,
        setOcList: () => {
        },
        refetch,
    };
}
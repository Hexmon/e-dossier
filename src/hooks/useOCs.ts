// hooks/useOCs.ts
"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useMemo } from "react";
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

    // Extract filter params for client-side filtering
    const {
        platoonId: filterPlatoonId,
        branch: filterBranch,
        status: filterStatus,
        q: filterQuery,
        courseId: filterCourseId,
        ...backendParams
    } = params || {};

    // Fetch ALL OCs from backend (without filters that backend ignores)
    const {
        data: rawData = { items: [], count: 0 },
        isLoading: loading,
        refetch,
        error,
    } = useQuery({
        queryKey: ["ocs", backendParams], // Only use pagination params for cache key
        queryFn: async () => {
            try {
                // Only send pagination to backend since it ignores other filters anyway
                const res = await fetchOCsWithCount<OCListRow>({
                    limit: backendParams.limit,
                    offset: backendParams.offset,
                });
                return {
                    items: res.items ?? [],
                    count: res.count ?? 0,
                };
            } catch (err) {
                toast.error("Failed to load OCs");
                return { items: [], count: 0 };
            }
        },
        staleTime: 5 * 60 * 1000, // 5 minutes
        enabled: !!params,
        retry: 2,
    });

    // CLIENT-SIDE FILTERING
    const filteredData = useMemo(() => {
        let filtered = [...rawData.items];

        // Apply search filter (q)
        if (filterQuery && filterQuery.trim()) {
            const query = filterQuery.toLowerCase().trim();
            filtered = filtered.filter((oc) => {
                const nameMatch = oc.name?.toLowerCase().includes(query);
                const ocNoMatch = oc.ocNo?.toLowerCase().includes(query);
                return nameMatch || ocNoMatch;
            });
        }

        // Apply course filter
        if (filterCourseId && filterCourseId.trim()) {
            filtered = filtered.filter((oc) => oc.courseId === filterCourseId);
        }

        // Apply platoon filter
        if (filterPlatoonId && filterPlatoonId.trim()) {
            filtered = filtered.filter((oc) => oc.platoonId === filterPlatoonId);
        }

        // Apply branch filter
        if (filterBranch && filterBranch.trim()) {
            filtered = filtered.filter((oc) => oc.branch === filterBranch);
        }

        // Apply status filter
        if (filterStatus) {
            switch (filterStatus) {
                case 'ACTIVE':
                    filtered = filtered.filter((oc) => !oc.withdrawnOn);
                    break;
                case 'WITHDRAWN':
                    filtered = filtered.filter((oc) => oc.withdrawnOn);
                    break;
                case 'DELEGATED':
                    filtered = filtered.filter((oc) => oc.status === 'DELEGATED');
                    break;
                case 'PASSED_OUT':
                    filtered = filtered.filter((oc) => oc.status === 'PASSED_OUT');
                    break;
            }
        }


        return {
            items: filtered,
            count: filtered.length,
        };
    }, [rawData.items, filterPlatoonId, filterBranch, filterStatus, filterQuery, filterCourseId]);

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
        ocList: filteredData.items,
        totalCount: filteredData.count,
        loading,
        error,
        fetchOCs: (newParams: FetchOCParams) => {
            queryClient.invalidateQueries({ queryKey: ["ocs"] });
        },
        addOC: addOCMutation.mutateAsync,
        editOC: (id: string, payload: Partial<OCRecord>) =>
            editOCMutation.mutateAsync({ id, payload }),
        removeOC: removeOCMutation.mutateAsync,
        setOcList: () => {
            // Kept for backward compatibility
        },
        refetch,
    };
}
// hooks/useOCs.ts
"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useCallback, useMemo } from "react";
import {
    fetchOCsWithCount,
    createOC,
    updateOC,
    deleteOC,
    type OCListRow,
    type OCRecord,
    type FetchOCParams,
} from "@/app/lib/api/ocApi";
import { getFriendlyApiErrorMessage } from "@/app/lib/apiClient";

const OCS_QUERY_KEY = ["ocs"] as const;

export type OCSemesterFilter = 1 | 2 | 3 | 4 | 5 | 6;

type UseOCsParams = FetchOCParams & {
    semester?: OCSemesterFilter;
};

type OCManagementFilters = {
    platoonId?: string;
    branch?: FetchOCParams["branch"];
    status?: FetchOCParams["status"];
    q?: string;
    courseId?: string;
    semester?: OCSemesterFilter;
};

export function filterOCsForManagement(items: OCListRow[], filters: OCManagementFilters): OCListRow[] {
    let filtered = [...items];

    // Apply search filter (q)
    if (filters.q && filters.q.trim()) {
        const query = filters.q.toLowerCase().trim();
        filtered = filtered.filter((oc) => {
            const nameMatch = oc.name?.toLowerCase().includes(query);
            const ocNoMatch = oc.ocNo?.toLowerCase().includes(query);
            return nameMatch || ocNoMatch;
        });
    }

    // Apply course filter
    if (filters.courseId && filters.courseId.trim()) {
        filtered = filtered.filter((oc) => oc.courseId === filters.courseId);
    }

    // Apply platoon filter
    if (filters.platoonId && filters.platoonId.trim()) {
        filtered = filtered.filter((oc) => oc.platoonId === filters.platoonId);
    }

    // Apply branch filter
    if (filters.branch && filters.branch.trim()) {
        filtered = filtered.filter((oc) => oc.branch === filters.branch);
    }

    // Apply status filter
    if (filters.status) {
        switch (filters.status) {
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

    // Apply current semester filter.
    if (filters.semester) {
        filtered = filtered.filter((oc) => Number(oc.currentSemester ?? 1) === filters.semester);
    }

    return filtered;
}

export function useOCs(params?: UseOCsParams) {
    const queryClient = useQueryClient();
    const refreshOCs = useCallback(async () => {
        await queryClient.invalidateQueries({
            queryKey: OCS_QUERY_KEY,
            refetchType: "active",
        });
    }, [queryClient]);

    // Extract filter params for client-side filtering
    const {
        platoonId: filterPlatoonId,
        branch: filterBranch,
        status: filterStatus,
        q: filterQuery,
        courseId: filterCourseId,
        semester: filterSemester,
        ...backendParams
    } = params || {};

    // Fetch ALL OCs from backend (without filters that backend ignores)
    const {
        data: rawData = { items: [], count: 0 },
        isLoading: loading,
        refetch,
        error,
    } = useQuery({
        queryKey: [...OCS_QUERY_KEY, backendParams], // Backend controls affect the cache key.
        queryFn: async () => {
            try {
                // Only send backend-supported list controls. Other filters are applied client-side below.
                const res = await fetchOCsWithCount<OCListRow>({
                    limit: backendParams.limit,
                    offset: backendParams.offset,
                    sort: backendParams.sort,
                });
                return {
                    items: res.items ?? [],
                    count: res.count ?? 0,
                };
            } catch (err) {
                toast.error(getFriendlyApiErrorMessage(err, "Failed to load OCs"));
                return { items: [], count: 0 };
            }
        },
        staleTime: 5 * 60 * 1000, // 5 minutes
        enabled: !!params,
        retry: 2,
    });

    // CLIENT-SIDE FILTERING
    const filteredData = useMemo(() => {
        const filtered = filterOCsForManagement(rawData.items, {
            platoonId: filterPlatoonId,
            branch: filterBranch,
            status: filterStatus,
            q: filterQuery,
            courseId: filterCourseId,
            semester: filterSemester,
        });


        return {
            items: filtered,
            count: filtered.length,
        };
    }, [rawData.items, filterPlatoonId, filterBranch, filterStatus, filterQuery, filterCourseId, filterSemester]);

    // Add OC mutation
    const addOCMutation = useMutation({
        mutationFn: async (payload: Omit<OCRecord, "id" | "uid" | "createdAt">) => {
            return await createOC(payload);
        },
        onSuccess: async () => {
            await refreshOCs();
            toast.success("OC added successfully");
        },
        onError: (error: any) => {
            toast.error(getFriendlyApiErrorMessage(error, "Failed to add OC"));
        },
    });

    // Edit OC mutation
    const editOCMutation = useMutation({
        mutationFn: async ({ id, payload }: { id: string; payload: Partial<OCRecord> }) => {
            return await updateOC(id, payload);
        },
        onSuccess: async () => {
            await refreshOCs();
            toast.success("OC updated successfully");
        },
        onError: (error: any) => {
            toast.error(getFriendlyApiErrorMessage(error, "Failed to update OC"));
        },
    });

    // Delete OC mutation
    const removeOCMutation = useMutation({
        mutationFn: async (id: string) => {
            await deleteOC(id);
        },
        onSuccess: async () => {
            await refreshOCs();
            toast.success("OC deleted successfully");
        },
        onError: (error: any) => {
            toast.error(getFriendlyApiErrorMessage(error, "Failed to delete OC"));
        },
    });

    return {
        ocList: filteredData.items,
        totalCount: filteredData.count,
        loading,
        error,
        fetchOCs: (newParams: FetchOCParams) => {
            void newParams;
            return refreshOCs();
        },
        addOC: addOCMutation.mutateAsync,
        editOC: (id: string, payload: Partial<OCRecord>) =>
            editOCMutation.mutateAsync({ id, payload }),
        removeOC: removeOCMutation.mutateAsync,
        setOcList: () => {
            // Kept for backward compatibility
        },
        refreshOCs,
        refetch,
    };
}

"use client";

import { useCallback, useState } from "react";
import {
    fetchOCsWithCount,
    createOC,
    updateOC,
    deleteOC,
    type OCListRow,
    type OCRecord,
    type FetchOCParams,
} from "@/app/lib/api/ocApi";

export function useOCs() {
    const [ocList, setOcList] = useState<OCListRow[]>([]);
    const [totalCount, setTotalCount] = useState<number>(0);
    const [loading, setLoading] = useState<boolean>(false);

    const fetchOCs = useCallback(async (params: FetchOCParams) => {
        setLoading(true);
        try {
            const res = await fetchOCsWithCount<OCListRow>(params);
            setOcList(res.items ?? []);
            setTotalCount(res.count ?? 0);
            return res;
        } finally {
            setLoading(false);
        }
    }, []);

    const addOC = useCallback(
        async (payload: Omit<OCRecord, "id" | "uid" | "createdAt">) => {
            const created = await createOC(payload);
            setOcList((prev) => [...prev, created as OCListRow]);
            setTotalCount((t) => t + 1);
            return created;
        },
        []
    );

    const editOC = useCallback(async (id: string, payload: Partial<OCRecord>) => {
        const updated = await updateOC(id, payload);
        setOcList((prev) => prev.map((o) => (o.id === id ? updated as OCListRow : o)));
        return updated;
    }, []);

    const removeOC = useCallback(async (id: string) => {
        await deleteOC(id);
        setOcList((prev) => prev.filter((o) => o.id !== id));
        setTotalCount((t) => Math.max(0, t - 1));
    }, []);

    return {
        ocList,
        totalCount,
        loading,
        fetchOCs,
        addOC,
        editOC,
        removeOC,
        setOcList,
    };
}

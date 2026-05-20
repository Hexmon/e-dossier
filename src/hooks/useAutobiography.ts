// /hooks/useAutobiography.ts
"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";

import {
    getAutobiographyDetails,
    saveAutobiography,
    patchAutobiography,
    AutoBio,
    AutoBioPayload,
} from "@/app/lib/api/autobiographyApi";
import { ApiClientError } from "@/app/lib/apiClient";

export function useAutobiography(ocId: string) {
    const [autoBio, setAutoBio] = useState<AutoBio | null>(null);
    const [exists, setExists] = useState(false);
    const [hasFetched, setHasFetched] = useState(false);

    const fetchAutoBio = useCallback(async () => {
        if (!ocId) {
            setAutoBio(null);
            setExists(false);
            setHasFetched(true);
            return;
        }

        setHasFetched(false);

        try {
            const record = await getAutobiographyDetails(ocId);

            if (record) {
                setAutoBio(record);
                setExists(true);
            } else {
                setAutoBio(null);
                setExists(false);
            }
        } catch {
            toast.error("Failed to load autobiography.");
        } finally {
            setHasFetched(true);
        }
    }, [ocId]);

    const save = async (payload: AutoBioPayload) => {
        if (!ocId) return;

        try {
            const response = exists
                ? await patchAutobiography(ocId, payload)
                : await saveAutobiography(ocId, payload);

            if (!response?.data) {
                toast.error("Failed to save autobiography.");
                return null;
            }

            toast.success(exists ? "Autobiography updated" : "Autobiography created");
            return response.data;
        } catch (err) {
            // Rethrow ApiClientError so component can surface field-level errors
            if (err instanceof ApiClientError) throw err;
            toast.error("Unexpected error while saving.");
            return null;
        }
    };

    return {
        autoBio,
        exists,
        hasFetched,
        fetchAutoBio,
        save,
    };
}

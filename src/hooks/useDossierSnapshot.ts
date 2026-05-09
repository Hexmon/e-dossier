"use client";

import { useEffect, useState, useCallback } from "react";
import {
    getDossierSnapshot,
    createDossierSnapshot,
    updateDossierSnapshot,
    DossierSnapshotRecord,
} from "@/app/lib/api/dossierSnapshotApi";
import { ApiClientError } from "@/app/lib/apiClient";
import { DOSSIER_SNAPSHOT_PHOTO_SIZE_MESSAGE } from "@/lib/dossier-snapshot-photo";
import { toast } from "sonner";

function isSnapshotPhotoSizeError(error: unknown) {
    return (
        error instanceof ApiClientError &&
        error.status === 400 &&
        error.code === "bad_request" &&
        error.message === "Image size out of allowed range."
    );
}

export function useDossierSnapshot(ocId?: string | null) {
    const [dossierSnapshot, setDossierSnapshot] = useState<DossierSnapshotRecord | null>(null);
    const [loadingSnapshot, setLoadingSnapshot] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const loadSnapshot = useCallback(async () => {
        if (!ocId) return;
        setLoadingSnapshot(true);
        try {
            const response = await getDossierSnapshot(ocId);
            setDossierSnapshot(response);
        } catch (err) {
            toast.error("Failed to load dossier snapshot");
        } finally {
            setLoadingSnapshot(false);
        }
    }, [ocId]);

    useEffect(() => {
        loadSnapshot();
    }, [loadSnapshot]);

    const saveSnapshot = useCallback(
        async (payload: Partial<DossierSnapshotRecord> | FormData) => {
            if (!ocId) {
                toast.error("No cadet selected");
                return null;
            }
            setIsSaving(true);
            try {
                if (!dossierSnapshot) {
                    await createDossierSnapshot(ocId, payload);
                    toast.success("Created successfully!");
                } else {
                    await updateDossierSnapshot(ocId, payload);
                    toast.success("Updated successfully!");
                }
                // Reload the full snapshot data after save
                await loadSnapshot();
            } catch (err) {
                toast.error(
                    isSnapshotPhotoSizeError(err)
                        ? DOSSIER_SNAPSHOT_PHOTO_SIZE_MESSAGE
                        : "Error saving dossier snapshot"
                );
                throw err;
            } finally {
                setIsSaving(false);
            }
        },
        [ocId, dossierSnapshot, loadSnapshot]
    );

    return {
        ocId,
        dossierSnapshot,
        loadingSnapshot,
        isSaving,
        reload: loadSnapshot,
        loadSnapshot,
        saveSnapshot,
        setDossierSnapshot,
    };
}

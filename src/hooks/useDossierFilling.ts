"use client";

import { useEffect, useState, useCallback } from "react";
import {
    getDossierFilling,
    createDossierFilling,
    updateDossierFilling,
} from "@/app/lib/api/dossierFillingApi";
import { DossierFormData } from "@/types/dossierFilling";
import { toast } from "sonner";

export function useDossierFilling(ocId?: string | null) {
    const [dossierFilling, setDossierFilling] = useState<DossierFormData | null>(null);
    const [loading, setLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const loadDossierFilling = useCallback(async () => {
        if (!ocId) return;
        setLoading(true);
        try {
            const response = await getDossierFilling(ocId);
            setDossierFilling(response);
        } catch (err) {
            toast.error("Failed to load dossier filling");
        } finally {
            setLoading(false);
        }
    }, [ocId]);

    useEffect(() => {
        loadDossierFilling();
    }, [loadDossierFilling]);

    const saveDossierFilling = useCallback(
        async (payload: Partial<DossierFormData>) => {
            if (!ocId) {
                toast.error("No cadet selected");
                return null;
            }
            setIsSaving(true);
            try {
                if (!dossierFilling) {
                    await createDossierFilling(ocId, payload);
                    toast.success("Created successfully!");
                } else {
                    await updateDossierFilling(ocId, payload);
                    toast.success("Updated successfully!");
                }
                // Reload the full data after save
                await loadDossierFilling();
            } catch (err) {
                toast.error("Error saving dossier filling");
                throw err;
            } finally {
                setIsSaving(false);
            }
        },
        [ocId, dossierFilling, loadDossierFilling]
    );

    return {
        ocId,
        dossierFilling,
        loading,
        isSaving,
        reload: loadDossierFilling,
        loadDossierFilling,
        saveDossierFilling,
        setDossierFilling,
    };
}

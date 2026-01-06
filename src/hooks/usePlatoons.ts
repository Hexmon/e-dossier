import { useState, useCallback } from "react";
import { toast } from "sonner";
import {
    getPlatoons,
    createPlatoon,
    updatePlatoon,
    deletePlatoon,
    Platoon,
    PlatoonCreatePayload,
    PlatoonUpdatePayload,
} from "@/app/lib/api/platoonApi";

export function usePlatoons() {
    const [platoons, setPlatoons] = useState<Platoon[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchPlatoons = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            const data = await getPlatoons();
            setPlatoons(data);
            return data;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "Failed to fetch platoons";
            setError(errorMessage);
            toast.error(errorMessage);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, []);

    const addPlatoon = useCallback(async (payload: PlatoonCreatePayload) => {
        setIsLoading(true);
        setError(null);

        try {
            const newPlatoon = await createPlatoon(payload);
            toast.success("Platoon created successfully");
            return newPlatoon;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "Failed to create platoon";
            setError(errorMessage);
            toast.error(errorMessage);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, []);

    const editPlatoon = useCallback(async (key: string, payload: PlatoonUpdatePayload) => {
        setIsLoading(true);
        setError(null);

        try {
            const updatedPlatoon = await updatePlatoon(key, payload);
            toast.success("Platoon updated successfully");
            return updatedPlatoon;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "Failed to update platoon";
            setError(errorMessage);
            toast.error(errorMessage);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, []);

    const removePlatoon = useCallback(async (id: string) => {
        setIsLoading(true);
        setError(null);

        try {
            await deletePlatoon(id);
            toast.success("Platoon deleted successfully");
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "Failed to delete platoon";
            setError(errorMessage);
            toast.error(errorMessage);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, []);

    return {
        platoons,
        isLoading,
        error,
        fetchPlatoons,
        addPlatoon,
        editPlatoon,
        removePlatoon,
    };
}
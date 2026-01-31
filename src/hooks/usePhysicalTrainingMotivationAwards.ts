import { useState, useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { apiRequest } from '@/app/lib/apiClient';

interface PhysicalTrainingMotivationValue {
    id: string;
    fieldId: string;
    value?: string | null;
    fieldLabel: string;
    fieldSortOrder: number;
}

interface PTMotivationResponse {
    message: string;
    data: {
        semester?: number;
        values: PhysicalTrainingMotivationValue[];
    };
}

interface UsePTMotivationAwardsReturn {
    values: PhysicalTrainingMotivationValue[];
    loading: boolean;
    error: string | null;
    fetchValues: (semester: number) => Promise<void>;
    saveValues: (semester: number, values: Array<{ fieldId: string; value?: string | null }>) => Promise<void>;
    updateValues: (semester: number, values?: Array<{ fieldId: string; value?: string | null }>, deleteFieldIds?: string[]) => Promise<void>;
    deleteValues: (semester: number, fieldIds?: string[]) => Promise<void>;
}

export function usePhysicalTrainingMotivationAwards(ocId: string): UsePTMotivationAwardsReturn {
    const [values, setValues] = useState<PhysicalTrainingMotivationValue[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    const fetchValues = useCallback(
        async (semester: number) => {
            if (!ocId) {
                setError('OC ID is required');
                return;
            }

            try {
                setLoading(true);
                setError(null);

                // Cancel previous request if any
                if (abortControllerRef.current) {
                    abortControllerRef.current.abort();
                }

                abortControllerRef.current = new AbortController();

                const data: PTMotivationResponse = await apiRequest<PTMotivationResponse>({
                    method: 'GET',
                    endpoint: `/api/v1/oc/${ocId}/physical-training/motivation-awards`,
                    query: { semester },
                    signal: abortControllerRef.current.signal,
                });

                setValues(data.data.values || []);
            } catch (err) {
                if (err instanceof Error && err.name !== 'AbortError') {
                    const errorMsg = err.message || 'Failed to fetch physical training motivation awards';
                    setError(errorMsg);
                    console.error('Error fetching PT motivation awards:', err);
                }
            } finally {
                setLoading(false);
            }
        },
        [ocId]
    );

    const saveValues = useCallback(
        async (semester: number, valuesData: Array<{ fieldId: string; value?: string | null }>) => {
            if (!ocId) {
                toast.error('OC ID is required');
                return;
            }

            if (!valuesData || valuesData.length === 0) {
                return;
            }

            try {
                setLoading(true);
                setError(null);

                const data: PTMotivationResponse = await apiRequest<PTMotivationResponse, { semester: number; values: Array<{ fieldId: string; value?: string | null }> }>({
                    method: 'POST',
                    endpoint: `/api/v1/oc/${ocId}/physical-training/motivation-awards`,
                    body: {
                        semester,
                        values: valuesData,
                    },
                });

                setValues(data.data.values || []);
                toast.success('Physical training motivation awards saved successfully');
            } catch (err) {
                const errorMsg = err instanceof Error ? err.message : 'Failed to save physical training motivation awards';
                setError(errorMsg);
                toast.error(errorMsg);
                console.error('Error saving PT motivation awards:', err);
            } finally {
                setLoading(false);
            }
        },
        [ocId]
    );

    const updateValues = useCallback(
        async (semester: number, valuesData?: Array<{ fieldId: string; value?: string | null }>, deleteFieldIds?: string[]) => {
            if (!ocId) {
                toast.error('OC ID is required');
                return;
            }

            try {
                setLoading(true);
                setError(null);

                const data: PTMotivationResponse = await apiRequest<PTMotivationResponse, any>({
                    method: 'PATCH',
                    endpoint: `/api/v1/oc/${ocId}/physical-training/motivation-awards`,
                    body: {
                        semester,
                        values: valuesData && valuesData.length > 0 ? valuesData : undefined,
                        deleteFieldIds: deleteFieldIds && deleteFieldIds.length > 0 ? deleteFieldIds : undefined,
                    },
                });

                setValues(data.data.values || []);
                toast.success('Physical training motivation awards updated successfully');
            } catch (err) {
                const errorMsg = err instanceof Error ? err.message : 'Failed to update physical training motivation awards';
                setError(errorMsg);
                toast.error(errorMsg);
                console.error('Error updating PT motivation awards:', err);
            } finally {
                setLoading(false);
            }
        },
        [ocId]
    );

    const deleteValues = useCallback(
        async (semester: number, fieldIds?: string[]) => {
            if (!ocId) {
                toast.error('OC ID is required');
                return;
            }

            try {
                setLoading(true);
                setError(null);

                await apiRequest<PTMotivationResponse, any>({
                    method: 'DELETE',
                    endpoint: `/api/v1/oc/${ocId}/physical-training/motivation-awards`,
                    body: {
                        semester,
                        fieldIds: fieldIds && fieldIds.length > 0 ? fieldIds : undefined,
                    },
                });

                await fetchValues(semester);
                toast.success('Physical training motivation awards deleted successfully');
            } catch (err) {
                const errorMsg = err instanceof Error ? err.message : 'Failed to delete physical training motivation awards';
                setError(errorMsg);
                toast.error(errorMsg);
                console.error('Error deleting PT motivation awards:', err);
            } finally {
                setLoading(false);
            }
        },
        [ocId, fetchValues]
    );

    useEffect(() => {
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, []);

    return {
        values,
        loading,
        error,
        fetchValues,
        saveValues,
        updateValues,
        deleteValues,
    };
}

import { useState, useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { apiRequest } from '@/app/lib/apiClient';

export interface MotivationAward {
    id: string;
    title: string;
    description?: string;
    ocId: string;
    createdAt: string;
    updatedAt: string;
}

interface MotivationAwardsResponse {
    message: string;
    items: MotivationAward[];
    count: number;
}

interface CreateMotivationAwardDto {
    title: string;
    description?: string;
}

interface UseMotivationAwardsReturn {
    awards: MotivationAward[];
    loading: boolean;
    error: string | null;
    fetchAwards: (limit?: number, offset?: number) => Promise<void>;
    createAward: (dto: CreateMotivationAwardDto) => Promise<void>;
}

export function useMotivationAwards(ocId: string): UseMotivationAwardsReturn {
    const [awards, setAwards] = useState<MotivationAward[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    const fetchAwards = useCallback(
        async (limit: number = 100, offset: number = 0) => {
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

                const data: MotivationAwardsResponse = await apiRequest<MotivationAwardsResponse>({
                    method: 'GET',
                    endpoint: `/api/v1/oc/${ocId}/motivation-awards`,
                    query: { limit, offset },
                    signal: abortControllerRef.current.signal,
                });

                setAwards(data.items || []);
            } catch (err) {
                if (err instanceof Error && err.name !== 'AbortError') {
                    const errorMsg = err.message || 'Failed to fetch motivation awards';
                    setError(errorMsg);
                    console.error('Error fetching motivation awards:', err);
                }
            } finally {
                setLoading(false);
            }
        },
        [ocId]
    );

    const createAward = useCallback(
        async (dto: CreateMotivationAwardDto) => {
            if (!ocId) {
                toast.error('OC ID is required');
                return;
            }

            if (!dto.title || dto.title.trim() === '') {
                toast.error('Award title is required');
                return;
            }

            try {
                setLoading(true);
                setError(null);

                const data: any = await apiRequest<any, CreateMotivationAwardDto>({
                    method: 'POST',
                    endpoint: `/api/v1/oc/${ocId}/motivation-awards`,
                    body: dto,
                });

                setAwards((prev) => [data.data, ...prev]);
                toast.success('Motivation award created successfully');
            } catch (err) {
                const errorMsg = err instanceof Error ? err.message : 'Failed to create motivation award';
                setError(errorMsg);
                toast.error(errorMsg);
                console.error('Error creating motivation award:', err);
            } finally {
                setLoading(false);
            }
        },
        [ocId]
    );

    useEffect(() => {
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, []);

    return {
        awards,
        loading,
        error,
        fetchAwards,
        createAward,
    };
}

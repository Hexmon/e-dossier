import { useState, useCallback, useEffect } from 'react';
import { apiRequest } from '@/app/lib/apiClient';

interface IpetTemplate {
    ptTaskScoreId: string;
    taskTitle: string;
    maxMarks: number;
    semester: number;
    ptTypeCode: string;
    attemptCode: string;
    gradeCode: string;
}

interface UseIpetTemplatesReturn {
    templates: IpetTemplate[] | null;
    loading: boolean;
    error: string | null;
    fetchTemplates: (semester: number) => Promise<void>;
}

export function useIpetTemplates(): UseIpetTemplatesReturn {
    const [templates, setTemplates] = useState<IpetTemplate[] | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchTemplates = useCallback(async (semester: number) => {
        try {
            setLoading(true);
            setError(null);

            const data: any = await apiRequest<any>({
                method: 'GET',
                endpoint: '/api/v1/admin/physical-training/templates',
                query: { semester },
            });

            // Filter for IPET type only
            const ipetTemplates = data.data.types
                .filter((type: any) => type.code === 'IPET')
                .flatMap((type: any) =>
                    type.tasks.flatMap((task: any) =>
                        task.attempts.flatMap((attempt: any) =>
                            attempt.grades.map((grade: any) => ({
                                ptTaskScoreId: grade.scoreId,
                                taskTitle: task.title,
                                maxMarks: grade.maxMarks,
                                semester: type.semester,
                                ptTypeCode: type.code,
                                attemptCode: attempt.code,
                                gradeCode: grade.code,
                            }))
                        )
                    )
                );

            setTemplates(ipetTemplates);
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Failed to fetch IPET templates';
            setError(errorMsg);
            console.error('Error fetching IPET templates:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    return {
        templates,
        loading,
        error,
        fetchTemplates,
    };
}

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { academicsApi } from '@/app/lib/api/academicsMarksApi';
import { getPlatoons } from '@/app/lib/api/platoonApi';
import {
    physicalTrainingBulkApi,
    PTBulkGetResponse,
    PTBulkSaveRequest,
} from '@/app/lib/api/physicalTrainingBulkApi';

export type PTBulkFilters = {
    courseId: string;
    semester: number | null;
    active: boolean;
    q: string;
    platoon: string;
};

export type PTScoreDraftValues = Record<string, Record<string, string>>;
export type PTMotivationDraftValues = Record<string, Record<string, string>>;
export type PTClearSelections = Record<string, string[]>;

type BuildRequestArgs = {
    filters: PTBulkFilters;
    data: PTBulkGetResponse | null | undefined;
    scoreDraftValues: PTScoreDraftValues;
    motivationDraftValues: PTMotivationDraftValues;
    clearScoreIds: PTClearSelections;
    clearMotivationFieldIds: PTClearSelections;
};

function normalizeText(value: string | null | undefined) {
    return (value ?? '').trim();
}

export function buildBulkPTSaveRequest({
    filters,
    data,
    scoreDraftValues,
    motivationDraftValues,
    clearScoreIds,
    clearMotivationFieldIds,
}: BuildRequestArgs): PTBulkSaveRequest | null {
    if (!filters.courseId || !filters.semester || !data) return null;

    const initialScoreValue = new Map<string, number>();
    const initialMotivationValue = new Map<string, string>();

    for (const item of data.items) {
        for (const score of item.scores) {
            initialScoreValue.set(`${item.oc.id}:${score.ptTaskScoreId}`, score.marksScored);
        }
        for (const value of item.motivationValues) {
            initialMotivationValue.set(`${item.oc.id}:${value.fieldId}`, normalizeText(value.value));
        }
    }

    const items: PTBulkSaveRequest['items'] = [];

    for (const item of data.items) {
        const ocId = item.oc.id;
        const scoreUpsert: Array<{ ptTaskScoreId: string; marksScored: number }> = [];
        const motivationUpsert: Array<{ fieldId: string; value?: string | null }> = [];

        const scoreDraftForOc = scoreDraftValues[ocId] ?? {};
        for (const [ptTaskScoreId, raw] of Object.entries(scoreDraftForOc)) {
            const trimmed = raw.trim();
            if (!trimmed) continue;
            const numeric = Number(trimmed);
            if (!Number.isFinite(numeric)) continue;
            const rounded = Math.trunc(numeric);
            const initial = initialScoreValue.get(`${ocId}:${ptTaskScoreId}`);
            if (initial !== undefined && initial === rounded) continue;
            scoreUpsert.push({ ptTaskScoreId, marksScored: rounded });
        }

        const motivationDraftForOc = motivationDraftValues[ocId] ?? {};
        for (const [fieldId, raw] of Object.entries(motivationDraftForOc)) {
            const trimmed = normalizeText(raw);
            if (!trimmed) continue;
            const initial = initialMotivationValue.get(`${ocId}:${fieldId}`) ?? '';
            if (initial === trimmed) continue;
            motivationUpsert.push({ fieldId, value: trimmed });
        }

        const clearScores = Array.from(new Set(clearScoreIds[ocId] ?? []));
        const clearMotivation = Array.from(new Set(clearMotivationFieldIds[ocId] ?? []));

        if (!scoreUpsert.length && !motivationUpsert.length && !clearScores.length && !clearMotivation.length) {
            continue;
        }

        items.push({
            ocId,
            scoresUpsert: scoreUpsert.length ? scoreUpsert : undefined,
            motivationUpsert: motivationUpsert.length ? motivationUpsert : undefined,
            clearScoreIds: clearScores.length ? clearScores : undefined,
            clearMotivationFieldIds: clearMotivation.length ? clearMotivation : undefined,
        });
    }

    if (!items.length) return null;

    return {
        courseId: filters.courseId,
        semester: filters.semester,
        items,
        failFast: false,
    };
}

export function usePhysicalTrainingBulk(filters: PTBulkFilters) {
    const queryClient = useQueryClient();

    const coursesQuery = useQuery({
        queryKey: ['courses'],
        queryFn: () => academicsApi.getCourses().then((res) => res.items ?? []),
    });

    const platoonsQuery = useQuery({
        queryKey: ['platoons'],
        queryFn: () => getPlatoons(),
    });

    const bulkQuery = useQuery({
        queryKey: ['pt-bulk', filters.courseId, filters.semester, filters.active, filters.q, filters.platoon],
        queryFn: () =>
            physicalTrainingBulkApi.getBulkPT({
                courseId: filters.courseId,
                semester: filters.semester!,
                active: filters.active,
                q: filters.q.trim() || undefined,
                platoon: filters.platoon || undefined,
            }),
        enabled: Boolean(filters.courseId && filters.semester),
    });

    const saveMutation = useMutation({
        mutationFn: (payload: PTBulkSaveRequest) => physicalTrainingBulkApi.saveBulkPT(payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pt-bulk'] });
        },
    });

    return {
        coursesQuery,
        platoonsQuery,
        bulkQuery,
        saveMutation,
    };
}

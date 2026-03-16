import { api } from '@/app/lib/apiClient';
import { endpoints } from '@/constants/endpoints';
import type { PTTemplate } from '@/app/lib/api/Physicaltrainingapi';

export type PTBulkOc = {
    id: string;
    ocNo: string;
    name: string;
    branch: string | null;
    platoonId: string | null;
    platoonKey: string | null;
    platoonName: string | null;
};

export type PTBulkScoreRecord = {
    id: string;
    ocId: string;
    semester: number;
    ptTaskScoreId: string;
    ptTaskId: string;
    marksScored: number;
    remark: string | null;
    templateMaxMarks: number;
    ptTypeCode: string;
    ptTypeTitle: string;
    taskTitle: string;
    attemptCode: string;
    gradeCode: string;
};

export type PTBulkMotivationRecord = {
    id: string;
    ocId: string;
    semester: number;
    fieldId: string;
    value: string | null;
    fieldLabel: string;
    fieldSortOrder: number;
};

export type PTBulkGetItem = {
    oc: PTBulkOc;
    scores: PTBulkScoreRecord[];
    motivationValues: PTBulkMotivationRecord[];
};

export type PTBulkGetResponse = {
    message: string;
    template: PTTemplate;
    items: PTBulkGetItem[];
    count: number;
    successCount: number;
    errorCount: number;
};

export type PTBulkSaveItem = {
    ocId: string;
    scoresUpsert?: Array<{ ptTaskScoreId: string; marksScored: number; remark?: string | null }>;
    motivationUpsert?: Array<{ fieldId: string; value?: string | null }>;
    clearScoreIds?: string[];
    clearMotivationFieldIds?: string[];
};

export type PTBulkSaveRequest = {
    courseId: string;
    semester: number;
    items: PTBulkSaveItem[];
    failFast?: boolean;
};

export type PTBulkSaveResult = {
    index: number;
    ocId: string;
    status: 'ok' | 'error';
    scoreUpserts: number;
    scoreClears: number;
    motivationUpserts: number;
    motivationClears: number;
    error?: { status: number; code: string; message: string; extras?: Record<string, unknown> };
};

export type PTBulkSaveResponse = {
    message: string;
    items: PTBulkSaveResult[];
    count: number;
    successCount: number;
    errorCount: number;
};

export type PTBulkGetParams = {
    courseId: string;
    semester: number;
    active?: boolean;
    q?: string;
    platoon?: string;
};

export const physicalTrainingBulkApi = {
    getBulkPT: async (params: PTBulkGetParams): Promise<PTBulkGetResponse> => {
        return api.get<PTBulkGetResponse>(endpoints.oc.physicalTraining.bulk, {
            query: {
                courseId: params.courseId,
                semester: params.semester,
                active: params.active ?? true,
                q: params.q || undefined,
                platoon: params.platoon || undefined,
            },
        });
    },

    saveBulkPT: async (payload: PTBulkSaveRequest): Promise<PTBulkSaveResponse> => {
        return api.post<PTBulkSaveResponse, PTBulkSaveRequest>(endpoints.oc.physicalTraining.bulk, payload);
    },
};

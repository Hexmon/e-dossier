import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET, POST } from '@/app/api/v1/oc/physical-training/bulk/route';
import { makeJsonRequest } from '../utils/next';
import { ApiError } from '@/app/lib/http';

vi.mock('@/app/lib/acx/feature-flag', () => ({
    isAuthzV2Enabled: () => false,
}));

vi.mock('@/app/api/v1/oc/_checks', () => ({
    mustBeAuthed: vi.fn(),
}));

vi.mock('@/app/services/marksReviewWorkflow', () => ({
    assertWorkflowDirectWriteAllowed: vi.fn(),
}));

vi.mock('@/app/db/queries/oc', () => ({
    listOCsBasic: vi.fn(),
}));

vi.mock('@/app/db/queries/physicalTraining', () => ({
    getPtTemplateBySemester: vi.fn(),
}));

vi.mock('@/app/db/queries/physicalTrainingOc', () => ({
    listTemplateScoresByIds: vi.fn(),
    listMotivationFieldsByIds: vi.fn(),
    listOcPtScoresByOcIds: vi.fn(),
    listOcPtMotivationValuesByOcIds: vi.fn(),
    upsertOcPtScores: vi.fn(),
    deleteOcPtScoresByTaskScoreIds: vi.fn(),
    upsertOcPtMotivationValues: vi.fn(),
    deleteOcPtMotivationValuesByFieldIds: vi.fn(),
}));

import { mustBeAuthed } from '@/app/api/v1/oc/_checks';
import { assertWorkflowDirectWriteAllowed } from '@/app/services/marksReviewWorkflow';
import { listOCsBasic } from '@/app/db/queries/oc';
import { getPtTemplateBySemester } from '@/app/db/queries/physicalTraining';
import {
    listTemplateScoresByIds,
    listMotivationFieldsByIds,
    listOcPtScoresByOcIds,
    listOcPtMotivationValuesByOcIds,
    upsertOcPtScores,
    deleteOcPtScoresByTaskScoreIds,
    upsertOcPtMotivationValues,
    deleteOcPtMotivationValuesByFieldIds,
} from '@/app/db/queries/physicalTrainingOc';

function attachAudit(req: any) {
    req.audit = { log: vi.fn(async () => undefined) };
    return req;
}

describe('PT bulk API', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (mustBeAuthed as any).mockResolvedValue({ userId: 'u-1' });
        (assertWorkflowDirectWriteAllowed as any).mockResolvedValue(undefined);
    });

    it('GET returns template and per-oc items', async () => {
        (getPtTemplateBySemester as any).mockResolvedValue({
            semester: 1,
            types: [],
            motivationFields: [],
        });
        (listOCsBasic as any).mockResolvedValue([
            {
                id: '11111111-1111-4111-8111-111111111111',
                ocNo: 'OC-01',
                name: 'OC One',
                branch: 'E',
                platoonId: null,
                platoonKey: null,
                platoonName: null,
            },
        ]);
        (listOcPtScoresByOcIds as any).mockResolvedValue([]);
        (listOcPtMotivationValuesByOcIds as any).mockResolvedValue([]);

        const req = attachAudit(
            makeJsonRequest({
                method: 'GET',
                path: '/api/v1/oc/physical-training/bulk?courseId=22222222-2222-4222-8222-222222222222&semester=1',
            })
        );

        const res = await GET(req as any, { params: Promise.resolve({}) } as any);
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.ok).toBe(true);
        expect(body.items).toHaveLength(1);
        expect(body.successCount).toBe(1);
        expect(body.errorCount).toBe(0);
    });

    it('GET returns 400 on invalid query', async () => {
        const req = attachAudit(
            makeJsonRequest({ method: 'GET', path: '/api/v1/oc/physical-training/bulk?semester=1' })
        );

        const res = await GET(req as any, { params: Promise.resolve({}) } as any);
        expect(res.status).toBe(400);
    });

    it('POST supports partial success', async () => {
        const ocId = '11111111-1111-4111-8111-111111111111';
        const scoreId = '33333333-3333-4333-8333-333333333333';
        const fieldId = '44444444-4444-4444-8444-444444444444';

        (listOCsBasic as any).mockResolvedValue([
            {
                id: ocId,
                courseId: '22222222-2222-4222-8222-222222222222',
            },
        ]);

        (listTemplateScoresByIds as any).mockResolvedValue([
            {
                ptTaskScoreId: scoreId,
                maxMarks: 100,
                attemptCode: 'B1',
                semester: 1,
                typeDeletedAt: null,
                taskDeletedAt: null,
                attemptDeletedAt: null,
                gradeDeletedAt: null,
                typeIsActive: true,
                attemptIsActive: true,
                gradeIsActive: true,
            },
        ]);

        (listMotivationFieldsByIds as any).mockResolvedValue([
            {
                id: fieldId,
                semester: 1,
                isActive: true,
                deletedAt: null,
            },
        ]);

        (upsertOcPtScores as any).mockResolvedValue([]);
        (deleteOcPtScoresByTaskScoreIds as any).mockResolvedValue([]);
        (upsertOcPtMotivationValues as any).mockResolvedValue([]);
        (deleteOcPtMotivationValuesByFieldIds as any).mockResolvedValue([]);

        const req = attachAudit(
            makeJsonRequest({
                method: 'POST',
                path: '/api/v1/oc/physical-training/bulk',
                body: {
                    courseId: '22222222-2222-4222-8222-222222222222',
                    semester: 1,
                    failFast: false,
                    items: [
                        {
                            ocId,
                            scoresUpsert: [{ ptTaskScoreId: scoreId, marksScored: 80 }],
                            motivationUpsert: [{ fieldId, value: 'Excellent' }],
                        },
                        {
                            ocId: '55555555-5555-4555-8555-555555555555',
                            scoresUpsert: [{ ptTaskScoreId: scoreId, marksScored: 60 }],
                        },
                    ],
                },
            })
        );

        const res = await POST(req as any, { params: Promise.resolve({}) } as any);
        expect(res.status).toBe(200);
        const body = await res.json();

        expect(body.ok).toBe(true);
        expect(body.successCount).toBe(1);
        expect(body.errorCount).toBe(1);
        expect(body.items[0].status).toBe('ok');
        expect(body.items[1].status).toBe('error');
    });

    it('POST allows manual marks above template max for free-entry PT attempts', async () => {
        const ocId = '11111111-1111-4111-8111-111111111111';
        const scoreId = '33333333-3333-4333-8333-333333333333';

        (listOCsBasic as any).mockResolvedValue([
            {
                id: ocId,
                courseId: '22222222-2222-4222-8222-222222222222',
            },
        ]);

        (listTemplateScoresByIds as any).mockResolvedValue([
            {
                ptTaskScoreId: scoreId,
                maxMarks: 26,
                attemptCode: 'A1/C1',
                semester: 1,
                typeDeletedAt: null,
                taskDeletedAt: null,
                attemptDeletedAt: null,
                gradeDeletedAt: null,
                typeIsActive: true,
                attemptIsActive: true,
                gradeIsActive: true,
            },
        ]);

        (listMotivationFieldsByIds as any).mockResolvedValue([]);
        (upsertOcPtScores as any).mockResolvedValue([]);

        const req = attachAudit(
            makeJsonRequest({
                method: 'POST',
                path: '/api/v1/oc/physical-training/bulk',
                body: {
                    courseId: '22222222-2222-4222-8222-222222222222',
                    semester: 1,
                    failFast: false,
                    items: [
                        {
                            ocId,
                            scoresUpsert: [{ ptTaskScoreId: scoreId, marksScored: 40 }],
                        },
                    ],
                },
            })
        );

        const res = await POST(req as any, { params: Promise.resolve({}) } as any);
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.successCount).toBe(1);
        expect(body.errorCount).toBe(0);
        expect(upsertOcPtScores).toHaveBeenCalledWith(ocId, 1, [{ ptTaskScoreId: scoreId, marksScored: 40 }]);
    });

    it('POST returns workflow_required when workflow is active', async () => {
        (assertWorkflowDirectWriteAllowed as any).mockRejectedValueOnce(
            new ApiError(409, 'Workflow required', 'workflow_required'),
        );

        const req = attachAudit(
            makeJsonRequest({
                method: 'POST',
                path: '/api/v1/oc/physical-training/bulk',
                body: {
                    courseId: '22222222-2222-4222-8222-222222222222',
                    semester: 1,
                    items: [
                        {
                            ocId: '11111111-1111-4111-8111-111111111111',
                            scoresUpsert: [
                                {
                                    ptTaskScoreId: '33333333-3333-4333-8333-333333333333',
                                    marksScored: 10,
                                },
                            ],
                        },
                    ],
                },
            }),
        );

        const res = await POST(req as any, { params: Promise.resolve({}) } as any);
        const body = await res.json();

        expect(res.status).toBe(409);
        expect(body.error).toBe('workflow_required');
    });
});

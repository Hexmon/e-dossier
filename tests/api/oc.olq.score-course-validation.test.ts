import { beforeEach, describe, expect, it, vi } from 'vitest';

import { POST as postOlq, PATCH as patchOlq } from '@/app/api/v1/oc/[ocId]/olq/route';
import { ApiError } from '@/app/lib/http';
import { makeJsonRequest, createRouteContext } from '../utils/next';

import * as ocChecks from '@/app/api/v1/oc/_checks';
import * as olqQueries from '@/app/db/queries/olq';

vi.mock('@/app/api/v1/oc/_checks', () => ({
    mustBeAuthed: vi.fn(),
    parseParam: vi.fn(),
    ensureOcExists: vi.fn(),
}));

vi.mock('@/app/db/queries/olq', () => ({
    getOlqSheet: vi.fn(),
    getOlqScore: vi.fn(),
    upsertOlqWithScores: vi.fn(),
    updateOlqWithScores: vi.fn(),
    deleteOlqHeader: vi.fn(),
    deleteOlqScore: vi.fn(),
    recomputeOlqTotal: vi.fn(),
}));

const ocId = '11111111-1111-4111-8111-111111111111';
const subtitleId = '22222222-2222-4222-8222-222222222222';

beforeEach(() => {
    vi.clearAllMocks();
    (ocChecks.mustBeAuthed as any).mockResolvedValue({ userId: 'u-1', roles: ['ADMIN'] });
    (ocChecks.ensureOcExists as any).mockResolvedValue(undefined);
    (ocChecks.parseParam as any).mockImplementation(async ({ params }: any, schema: any) => schema.parse(await params));
});

describe('OC OLQ score writes validate current course template', () => {
    it('POST returns 400 when subtitle does not belong to OC course template', async () => {
        (olqQueries.upsertOlqWithScores as any).mockRejectedValueOnce(
            new ApiError(400, 'Subtitle does not belong to OC course template', 'bad_request')
        );

        const req = makeJsonRequest({
            method: 'POST',
            path: `/api/v1/oc/${ocId}/olq`,
            body: {
                semester: 1,
                scores: [{ subtitleId, marksScored: 10 }],
            },
        });
        const res = await postOlq(req as any, createRouteContext({ ocId }) as any);
        const body = await res.json();

        expect(res.status).toBe(400);
        expect(body.error).toBe('bad_request');
    });

    it('POST returns 201 for valid subtitle in current course template', async () => {
        (olqQueries.upsertOlqWithScores as any).mockResolvedValueOnce({ id: 'sheet-1' });
        (olqQueries.getOlqSheet as any).mockResolvedValueOnce({
            id: 'sheet-1',
            ocId,
            semester: 1,
            totalMarks: 10,
            remarks: null,
            categories: [],
        });

        const req = makeJsonRequest({
            method: 'POST',
            path: `/api/v1/oc/${ocId}/olq`,
            body: {
                semester: 1,
                scores: [{ subtitleId, marksScored: 10 }],
            },
        });
        const res = await postOlq(req as any, createRouteContext({ ocId }) as any);
        const body = await res.json();

        expect(res.status).toBe(201);
        expect(body.data.id).toBe('sheet-1');
    });

    it('PATCH returns 400 when subtitle is not in active course template', async () => {
        (olqQueries.updateOlqWithScores as any).mockRejectedValueOnce(
            new ApiError(400, 'Subtitle is inactive in current course template', 'bad_request')
        );

        const req = makeJsonRequest({
            method: 'PATCH',
            path: `/api/v1/oc/${ocId}/olq`,
            body: {
                semester: 1,
                scores: [{ subtitleId, marksScored: 12 }],
            },
        });
        const res = await patchOlq(req as any, createRouteContext({ ocId }) as any);
        expect(res.status).toBe(400);
    });

    it('PATCH returns 200 when subtitle is valid in active course template', async () => {
        (olqQueries.updateOlqWithScores as any).mockResolvedValueOnce({ id: 'sheet-1' });
        (olqQueries.getOlqSheet as any).mockResolvedValueOnce({
            id: 'sheet-1',
            ocId,
            semester: 1,
            totalMarks: 12,
            remarks: null,
            categories: [],
        });

        const req = makeJsonRequest({
            method: 'PATCH',
            path: `/api/v1/oc/${ocId}/olq`,
            body: {
                semester: 1,
                scores: [{ subtitleId, marksScored: 12 }],
            },
        });
        const res = await patchOlq(req as any, createRouteContext({ ocId }) as any);
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.data.id).toBe('sheet-1');
    });
});

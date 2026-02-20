import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GET as getCategories, POST as postCategories } from '@/app/api/v1/oc/[ocId]/olq/categories/route';
import { PATCH as patchCategoryById } from '@/app/api/v1/oc/[ocId]/olq/categories/[categoryId]/route';
import { GET as getSubtitles, POST as postSubtitles } from '@/app/api/v1/oc/[ocId]/olq/subtitles/route';
import { DELETE as deleteSubtitleById } from '@/app/api/v1/oc/[ocId]/olq/subtitles/[subtitleId]/route';
import { makeJsonRequest, createRouteContext } from '../utils/next';

import * as ocChecks from '@/app/api/v1/oc/_checks';
import * as ocQueries from '@/app/db/queries/oc';
import * as olqQueries from '@/app/db/queries/olq';

vi.mock('@/app/api/v1/oc/_checks', () => ({
    mustBeAuthed: vi.fn(),
    parseParam: vi.fn(),
    ensureOcExists: vi.fn(),
}));

vi.mock('@/app/db/queries/oc', () => ({
    getOcCourseInfo: vi.fn(),
}));

vi.mock('@/app/db/queries/olq', () => ({
    getCourseTemplateCategories: vi.fn(),
    getCourseTemplateSubtitles: vi.fn(),
    getOlqCategory: vi.fn(),
    getOlqSubtitle: vi.fn(),
}));

const ocId = '11111111-1111-4111-8111-111111111111';
const courseId = '22222222-2222-4222-8222-222222222222';
const categoryId = '33333333-3333-4333-8333-333333333333';
const subtitleId = '44444444-4444-4444-8444-444444444444';

beforeEach(() => {
    vi.clearAllMocks();
    (ocChecks.mustBeAuthed as any).mockResolvedValue({ userId: 'u-1', roles: ['ADMIN'] });
    (ocChecks.ensureOcExists as any).mockResolvedValue(undefined);
    (ocChecks.parseParam as any).mockImplementation(async ({ params }: any, schema: any) => schema.parse(await params));
    (ocQueries.getOcCourseInfo as any).mockResolvedValue({ id: ocId, courseId, branch: 'O' });
});

describe('OC OLQ template routes (read-only)', () => {
    it('GET categories resolves by OC course template', async () => {
        (olqQueries.getCourseTemplateCategories as any).mockResolvedValueOnce([
            { id: categoryId, code: 'LDR', title: 'Leadership', subtitles: [] },
        ]);

        const req = makeJsonRequest({
            method: 'GET',
            path: `/api/v1/oc/${ocId}/olq/categories?includeSubtitles=true&isActive=true`,
        });
        const res = await getCategories(req as any, createRouteContext({ ocId }) as any);
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.count).toBe(1);
        expect(olqQueries.getCourseTemplateCategories).toHaveBeenCalledWith({
            courseId,
            includeSubtitles: true,
            isActive: true,
            fallbackToLegacyGlobal: true,
        });
    });

    it('GET subtitles resolves by OC course template', async () => {
        (olqQueries.getCourseTemplateSubtitles as any).mockResolvedValueOnce([
            { id: subtitleId, categoryId, subtitle: 'Initiative', maxMarks: 20 },
        ]);

        const req = makeJsonRequest({
            method: 'GET',
            path: `/api/v1/oc/${ocId}/olq/subtitles?categoryId=${categoryId}&isActive=true`,
        });
        const res = await getSubtitles(req as any, createRouteContext({ ocId }) as any);
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.count).toBe(1);
        expect(olqQueries.getCourseTemplateSubtitles).toHaveBeenCalledWith({
            courseId,
            categoryId,
            isActive: true,
            fallbackToLegacyGlobal: true,
        });
    });

    it('POST categories is blocked with 403', async () => {
        const req = makeJsonRequest({
            method: 'POST',
            path: `/api/v1/oc/${ocId}/olq/categories`,
            body: { code: 'LDR', title: 'Leadership' },
        });
        const res = await postCategories(req as any, createRouteContext({ ocId }) as any);
        expect(res.status).toBe(403);
    });

    it('PATCH category detail is blocked with 403', async () => {
        const req = makeJsonRequest({
            method: 'PATCH',
            path: `/api/v1/oc/${ocId}/olq/categories/${categoryId}`,
            body: { title: 'Updated' },
        });
        const res = await patchCategoryById(
            req as any,
            createRouteContext({ ocId, categoryId }) as any
        );
        expect(res.status).toBe(403);
    });

    it('POST subtitles is blocked with 403', async () => {
        const req = makeJsonRequest({
            method: 'POST',
            path: `/api/v1/oc/${ocId}/olq/subtitles`,
            body: { categoryId, subtitle: 'Initiative' },
        });
        const res = await postSubtitles(req as any, createRouteContext({ ocId }) as any);
        expect(res.status).toBe(403);
    });

    it('DELETE subtitle detail is blocked with 403', async () => {
        const req = makeJsonRequest({
            method: 'DELETE',
            path: `/api/v1/oc/${ocId}/olq/subtitles/${subtitleId}`,
        });
        const res = await deleteSubtitleById(
            req as any,
            createRouteContext({ ocId, subtitleId }) as any
        );
        expect(res.status).toBe(403);
    });
});

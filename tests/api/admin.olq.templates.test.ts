import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GET as getCategories, POST as postCategories } from '@/app/api/v1/admin/olq/courses/[courseId]/categories/route';
import { PATCH as patchCategoryById } from '@/app/api/v1/admin/olq/courses/[courseId]/categories/[categoryId]/route';
import { GET as getSubtitles } from '@/app/api/v1/admin/olq/courses/[courseId]/subtitles/route';
import { DELETE as deleteSubtitleById } from '@/app/api/v1/admin/olq/courses/[courseId]/subtitles/[subtitleId]/route';
import { POST as postCopyTemplate } from '@/app/api/v1/admin/olq/courses/[targetCourseId]/copy/route';
import { ApiError } from '@/app/lib/http';
import { makeJsonRequest, createRouteContext } from '../utils/next';

import * as authz from '@/app/lib/authz';
import * as olqQueries from '@/app/db/queries/olq';

vi.mock('@/app/lib/authz', () => ({
    requireAdmin: vi.fn(),
}));

vi.mock('@/app/db/queries/olq', () => ({
    listOlqCategories: vi.fn(),
    createOlqCategory: vi.fn(),
    getOlqCategory: vi.fn(),
    updateOlqCategory: vi.fn(),
    deleteOlqCategory: vi.fn(),
    listOlqSubtitles: vi.fn(),
    createOlqSubtitle: vi.fn(),
    getOlqSubtitle: vi.fn(),
    updateOlqSubtitle: vi.fn(),
    deleteOlqSubtitle: vi.fn(),
    copyOlqTemplateToCourse: vi.fn(),
}));

const courseId = '11111111-1111-4111-8111-111111111111';
const categoryId = '22222222-2222-4222-8222-222222222222';
const subtitleId = '33333333-3333-4333-8333-333333333333';
const targetCourseId = '44444444-4444-4444-8444-444444444444';
const sourceCourseId = '55555555-5555-4555-8555-555555555555';

beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(authz.requireAdmin).mockResolvedValue({
        userId: 'admin-1',
        roles: ['ADMIN'],
        claims: {},
    } as Awaited<ReturnType<typeof authz.requireAdmin>>);
});

describe('Admin OLQ template APIs', () => {
    it('GET categories returns course-scoped categories', async () => {
        vi.mocked(olqQueries.listOlqCategories).mockResolvedValueOnce([
            { id: categoryId, courseId, code: 'LDR', title: 'Leadership', subtitles: [] },
        ] as any);

        const req = makeJsonRequest({
            method: 'GET',
            path: `/api/v1/admin/olq/courses/${courseId}/categories?includeSubtitles=true&isActive=true`,
        });
        const res = await getCategories(req as any, createRouteContext({ courseId }) as any);
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.count).toBe(1);
        expect(olqQueries.listOlqCategories).toHaveBeenCalledWith({
            courseId,
            includeSubtitles: true,
            isActive: true,
        });
    });

    it('POST categories creates category for a course', async () => {
        vi.mocked(olqQueries.createOlqCategory).mockResolvedValueOnce({
            id: categoryId,
            courseId,
            code: 'LDR',
            title: 'Leadership',
            description: null,
            displayOrder: 1,
            isActive: true,
        } as any);

        const req = makeJsonRequest({
            method: 'POST',
            path: `/api/v1/admin/olq/courses/${courseId}/categories`,
            body: { code: 'LDR', title: 'Leadership', displayOrder: 1 },
        });
        const res = await postCategories(req as any, createRouteContext({ courseId }) as any);
        const body = await res.json();

        expect(res.status).toBe(201);
        expect(body.category.id).toBe(categoryId);
        expect(olqQueries.createOlqCategory).toHaveBeenCalledWith(
            courseId,
            expect.objectContaining({ code: 'LDR', title: 'Leadership' })
        );
    });

    it('PATCH category by id updates course-scoped category', async () => {
        vi.mocked(olqQueries.updateOlqCategory).mockResolvedValueOnce({
            id: categoryId,
            courseId,
            code: 'LDR',
            title: 'Leadership Updated',
            isActive: true,
        } as any);

        const req = makeJsonRequest({
            method: 'PATCH',
            path: `/api/v1/admin/olq/courses/${courseId}/categories/${categoryId}`,
            body: { title: 'Leadership Updated' },
        });
        const res = await patchCategoryById(
            req as any,
            createRouteContext({ courseId, categoryId }) as any
        );
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.category.title).toBe('Leadership Updated');
        expect(olqQueries.updateOlqCategory).toHaveBeenCalledWith(
            courseId,
            categoryId,
            expect.objectContaining({ title: 'Leadership Updated' })
        );
    });

    it('GET subtitles lists course-scoped subtitles', async () => {
        vi.mocked(olqQueries.listOlqSubtitles).mockResolvedValueOnce([
            { id: subtitleId, categoryId, subtitle: 'Initiative', maxMarks: 20 },
        ] as any);

        const req = makeJsonRequest({
            method: 'GET',
            path: `/api/v1/admin/olq/courses/${courseId}/subtitles?categoryId=${categoryId}&isActive=true`,
        });
        const res = await getSubtitles(req as any, createRouteContext({ courseId }) as any);
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.count).toBe(1);
        expect(olqQueries.listOlqSubtitles).toHaveBeenCalledWith({
            courseId,
            categoryId,
            isActive: true,
        });
    });

    it('DELETE subtitle by id removes course-scoped subtitle', async () => {
        vi.mocked(olqQueries.deleteOlqSubtitle).mockResolvedValueOnce({
            id: subtitleId,
            categoryId,
            subtitle: 'Initiative',
        } as any);

        const req = makeJsonRequest({
            method: 'DELETE',
            path: `/api/v1/admin/olq/courses/${courseId}/subtitles/${subtitleId}`,
        });
        const res = await deleteSubtitleById(
            req as any,
            createRouteContext({ courseId, subtitleId }) as any
        );
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.deleted).toBe(subtitleId);
        expect(olqQueries.deleteOlqSubtitle).toHaveBeenCalledWith(courseId, subtitleId, { hard: false });
    });

    it('POST copy template replaces target course template', async () => {
        vi.mocked(olqQueries.copyOlqTemplateToCourse).mockResolvedValueOnce({
            sourceCourseId,
            targetCourseId,
            categoriesCopied: 3,
            subtitlesCopied: 12,
            mode: 'replace',
        });

        const req = makeJsonRequest({
            method: 'POST',
            path: `/api/v1/admin/olq/courses/${targetCourseId}/copy`,
            body: { sourceCourseId, mode: 'replace' },
        });
        const res = await postCopyTemplate(
            req as any,
            createRouteContext({ targetCourseId }) as any
        );
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.categoriesCopied).toBe(3);
        expect(olqQueries.copyOlqTemplateToCourse).toHaveBeenCalledWith({
            sourceCourseId,
            targetCourseId,
            mode: 'replace',
        });
    });

    it('returns 401 when admin auth fails', async () => {
        vi.mocked(authz.requireAdmin).mockRejectedValueOnce(
            new ApiError(401, 'Unauthorized', 'unauthorized')
        );

        const req = makeJsonRequest({
            method: 'GET',
            path: `/api/v1/admin/olq/courses/${courseId}/categories`,
        });
        const res = await getCategories(req as any, createRouteContext({ courseId }) as any);
        expect(res.status).toBe(401);
    });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { POST as postPtCopy } from '@/app/api/v1/admin/physical-training/templates/copy/route';
import { POST as postCampCopy } from '@/app/api/v1/admin/training-camps/copy/route';
import { POST as postInterviewCopy } from '@/app/api/v1/admin/interview/templates/copy/route';
import { ApiError } from '@/app/lib/http';
import { makeJsonRequest, createRouteContext } from '../utils/next';

import * as authz from '@/app/lib/authz';
import * as physicalTrainingQueries from '@/app/db/queries/physicalTraining';
import * as trainingCampQueries from '@/app/db/queries/trainingCamps';
import * as interviewTemplateQueries from '@/app/db/queries/interviewTemplates';

vi.mock('@/app/lib/authz', () => ({
    requireAdmin: vi.fn(),
}));

vi.mock('@/app/db/queries/physicalTraining', () => ({
    copyPtTemplateToCourse: vi.fn(),
}));

vi.mock('@/app/db/queries/trainingCamps', () => ({
    copyTrainingCampTemplateSemester: vi.fn(),
}));

vi.mock('@/app/db/queries/interviewTemplates', () => ({
    copyInterviewTemplatesToCourse: vi.fn(),
}));

describe('Admin template copy APIs', () => {
    const sourceCourseId = '11111111-1111-4111-8111-111111111111';
    const targetCourseId = '22222222-2222-4222-8222-222222222222';

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(authz.requireAdmin).mockResolvedValue({
            userId: 'admin-1',
            roles: ['ADMIN'],
            claims: {},
        } as Awaited<ReturnType<typeof authz.requireAdmin>>);
    });

    it('copies PT template between courses for a semester', async () => {
        vi.mocked(physicalTrainingQueries.copyPtTemplateToCourse).mockResolvedValueOnce({
            sourceCourseId,
            targetCourseId,
            semester: 2,
            mode: 'replace',
            createdCount: 8,
            updatedCount: 4,
            deactivatedCount: 2,
            deletedCount: 1,
            preservedCount: 0,
            warnings: [],
            stats: {
                types: { created: 1, updated: 1, deactivated: 0, deleted: 0, preserved: 0 },
                attempts: { created: 1, updated: 1, deactivated: 0, deleted: 0, preserved: 0 },
                grades: { created: 2, updated: 1, deactivated: 1, deleted: 0, preserved: 0 },
                tasks: { created: 2, updated: 1, deactivated: 1, deleted: 0, preserved: 0 },
                taskScores: { created: 1, updated: 0, deactivated: 0, deleted: 1, preserved: 0 },
                motivationFields: { created: 1, updated: 0, deactivated: 0, deleted: 0, preserved: 0 },
            },
        });

        const req = makeJsonRequest({
            method: 'POST',
            path: '/api/v1/admin/physical-training/templates/copy',
            body: { sourceCourseId, targetCourseId, semester: 2, mode: 'replace' },
        });
        const res = await postPtCopy(req as any, createRouteContext() as any);
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.createdCount).toBe(8);
        expect(physicalTrainingQueries.copyPtTemplateToCourse).toHaveBeenCalledWith({
            sourceCourseId,
            targetCourseId,
            semester: 2,
            mode: 'replace',
        });
    });

    it('rejects PT copy when source and target course are the same', async () => {
        const req = makeJsonRequest({
            method: 'POST',
            path: '/api/v1/admin/physical-training/templates/copy',
            body: { sourceCourseId, targetCourseId: sourceCourseId, semester: 2 },
        });
        const res = await postPtCopy(req as any, createRouteContext() as any);
        const body = await res.json();

        expect(res.status).toBe(400);
        expect(body.ok).toBe(false);
        expect(body.message).toContain('sourceCourseId and targetCourseId cannot be the same');
        expect(physicalTrainingQueries.copyPtTemplateToCourse).not.toHaveBeenCalled();
    });

    it('copies training camp template between courses for a semester', async () => {
        vi.mocked(trainingCampQueries.copyTrainingCampTemplateSemester).mockResolvedValueOnce({
            sourceCourseId,
            targetCourseId,
            semester: 4,
            mode: 'replace',
            createdCount: 4,
            updatedCount: 3,
            deactivatedCount: 1,
            stats: {
                camps: { created: 1, updated: 1, deactivated: 0 },
                activities: { created: 3, updated: 2, deactivated: 1 },
            },
        });

        const req = makeJsonRequest({
            method: 'POST',
            path: '/api/v1/admin/training-camps/copy',
            body: { sourceCourseId, targetCourseId, semester: 4, mode: 'replace' },
        });
        const res = await postCampCopy(req as any, createRouteContext() as any);
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.updatedCount).toBe(3);
        expect(trainingCampQueries.copyTrainingCampTemplateSemester).toHaveBeenCalledWith({
            sourceCourseId,
            targetCourseId,
            semester: 4,
            mode: 'replace',
        });
    });

    it('copies interview templates between courses', async () => {
        vi.mocked(interviewTemplateQueries.copyInterviewTemplatesToCourse).mockResolvedValueOnce({
            sourceCourseId,
            targetCourseId,
            mode: 'replace',
            templatesCopied: 2,
            semestersCopied: 3,
            sectionsCopied: 4,
            groupsCopied: 5,
            fieldsCopied: 12,
            optionsCopied: 6,
        });

        const req = makeJsonRequest({
            method: 'POST',
            path: '/api/v1/admin/interview/templates/copy',
            body: { sourceCourseId, targetCourseId, mode: 'replace' },
        });
        const res = await postInterviewCopy(req as any, createRouteContext() as any);
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.templatesCopied).toBe(2);
        expect(interviewTemplateQueries.copyInterviewTemplatesToCourse).toHaveBeenCalledWith({
            sourceCourseId,
            targetCourseId,
            mode: 'replace',
        });
    });

    it('returns 401 when admin auth fails', async () => {
        vi.mocked(authz.requireAdmin).mockRejectedValueOnce(
            new ApiError(401, 'Unauthorized', 'unauthorized'),
        );

        const req = makeJsonRequest({
            method: 'POST',
            path: '/api/v1/admin/physical-training/templates/copy',
            body: { sourceCourseId, targetCourseId, semester: 2 },
        });
        const res = await postPtCopy(req as any, createRouteContext() as any);

        expect(res.status).toBe(401);
    });
});
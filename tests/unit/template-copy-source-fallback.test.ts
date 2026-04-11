import { describe, expect, it, vi } from 'vitest';

import { resolveInterviewTemplateCopySource } from '@/app/db/queries/interviewTemplates';
import { resolveTrainingCampTemplateCopySource } from '@/app/db/queries/trainingCamps';

describe('template copy source fallback', () => {
    it('uses course-scoped interview templates when present', async () => {
        const courseTemplates = [{ id: 'template-1', code: 'A', semesters: [1] }];
        const loadTemplates = vi
            .fn()
            .mockResolvedValueOnce(courseTemplates);

        const result = await resolveInterviewTemplateCopySource(
            '11111111-1111-4111-8111-111111111111',
            loadTemplates as any,
        );

        expect(result).toBe(courseTemplates);
        expect(loadTemplates).toHaveBeenCalledTimes(1);
        expect(loadTemplates).toHaveBeenCalledWith({
            courseId: '11111111-1111-4111-8111-111111111111',
            includeDeleted: false,
        });
    });

    it('falls back to default interview templates when source course has none', async () => {
        const defaultTemplates = [{ id: 'template-2', code: 'GLOBAL', semesters: [2] }];
        const loadTemplates = vi
            .fn()
            .mockResolvedValueOnce([])
            .mockResolvedValueOnce(defaultTemplates);

        const result = await resolveInterviewTemplateCopySource(
            '11111111-1111-4111-8111-111111111111',
            loadTemplates as any,
        );

        expect(result).toBe(defaultTemplates);
        expect(loadTemplates).toHaveBeenNthCalledWith(1, {
            courseId: '11111111-1111-4111-8111-111111111111',
            includeDeleted: false,
        });
        expect(loadTemplates).toHaveBeenNthCalledWith(2, {
            courseId: null,
            includeDeleted: false,
        });
    });

    it('throws for interview copy when neither course-scoped nor default templates exist', async () => {
        const loadTemplates = vi
            .fn()
            .mockResolvedValueOnce([])
            .mockResolvedValueOnce([]);

        await expect(
            resolveInterviewTemplateCopySource(
                '11111111-1111-4111-8111-111111111111',
                loadTemplates as any,
            ),
        ).rejects.toMatchObject({
            status: 404,
            message: 'Source interview course is not configured.',
        });
    });

    it('uses course-scoped camp templates when present', async () => {
        const courseCamps = [{ id: 'camp-1', name: 'Camp A', semester: 2, activities: [] }];
        const loadCamps = vi
            .fn()
            .mockResolvedValueOnce(courseCamps);

        const result = await resolveTrainingCampTemplateCopySource(
            '11111111-1111-4111-8111-111111111111',
            2,
            loadCamps as any,
        );

        expect(result).toBe(courseCamps);
        expect(loadCamps).toHaveBeenCalledTimes(1);
        expect(loadCamps).toHaveBeenCalledWith({
            courseId: '11111111-1111-4111-8111-111111111111',
            semester: 2,
            includeActivities: true,
            includeDeleted: false,
        });
    });

    it('falls back to default camp templates when source course has none', async () => {
        const defaultCamps = [{ id: 'camp-2', name: 'Default Camp', semester: 4, activities: [] }];
        const loadCamps = vi
            .fn()
            .mockResolvedValueOnce([])
            .mockResolvedValueOnce(defaultCamps);

        const result = await resolveTrainingCampTemplateCopySource(
            '11111111-1111-4111-8111-111111111111',
            4,
            loadCamps as any,
        );

        expect(result).toBe(defaultCamps);
        expect(loadCamps).toHaveBeenNthCalledWith(1, {
            courseId: '11111111-1111-4111-8111-111111111111',
            semester: 4,
            includeActivities: true,
            includeDeleted: false,
        });
        expect(loadCamps).toHaveBeenNthCalledWith(2, {
            courseId: null,
            semester: 4,
            includeActivities: true,
            includeDeleted: false,
        });
    });

    it('throws for camp copy when neither course-scoped nor default templates exist', async () => {
        const loadCamps = vi
            .fn()
            .mockResolvedValueOnce([])
            .mockResolvedValueOnce([]);

        await expect(
            resolveTrainingCampTemplateCopySource(
                '11111111-1111-4111-8111-111111111111',
                6,
                loadCamps as any,
            ),
        ).rejects.toMatchObject({
            status: 404,
            message: 'Source training camp course is not configured for this semester.',
        });
    });
});

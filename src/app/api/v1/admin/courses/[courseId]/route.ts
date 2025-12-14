// src/app/api/v1/courses/[courseId]/route.ts
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { json, handleApiError, ApiError } from '@/app/lib/http';
import { requireAuth, requireAdmin } from '@/app/lib/authz';
import { getCourse, listCourseOfferings, softDeleteCourse, updateCourse, hardDeleteCourse } from '@/app/db/queries/courses';
import { courseUpdateSchema } from '@/app/lib/validators.courses';
import { createAuditLog, AuditEventType, AuditResourceType } from '@/lib/audit-log';
import { withRouteLogging } from '@/lib/withRouteLogging';

const Param = z.object({ courseId: z.string().uuid() });

async function GETHandler(req: NextRequest, { params }: { params: Promise<{ courseId: string }> }) {
    try {
        await requireAuth(req);
        const { courseId } = Param.parse(await params);

        const sp = new URL(req.url).searchParams;
        const expandSubjects = (sp.get('expand') || '').includes('subjects');

        const course = await getCourse(courseId);
        if (!course) throw new ApiError(404, 'Course not found', 'not_found');

        let offerings: {
            id: string;
            semester: number;
            includeTheory: boolean;
            includePractical: boolean;
            theoryCredits: number | null;
            practicalCredits: number | null;
            subject: {
                id: string;
                code: string;
                name: string;
                branch: string;
                hasTheory: boolean;
                hasPractical: boolean;
                defaultTheoryCredits: number | null;
                defaultPracticalCredits: number | null;
                description: string | null;
                createdAt: Date | null;
                updatedAt: Date | null;
                deletedAt: Date | null;
            };
        }[] = [];

        if (expandSubjects) {
            const sem = sp.get('semester') ? Number(sp.get('semester')) : undefined;
            offerings = await listCourseOfferings(courseId, sem);
        }

        return json.ok({ message: 'Course retrieved successfully.', course, offerings });
    } catch (err) {
        return handleApiError(err);
    }
}

async function PATCHHandler(req: NextRequest, { params }: { params: Promise<{ courseId: string }> }) {
    try {
        const adminCtx = await requireAdmin(req);
        const { courseId } = Param.parse(await params);

        const body = courseUpdateSchema.parse(await req.json());
        const patch: any = {};
        if (body.code !== undefined) patch.code = body.code;
        if (body.title !== undefined) patch.title = body.title;
        if (body.notes !== undefined) patch.notes = body.notes ?? null;
        if (body.restore === true) patch.deletedAt = null;

        const previous = await getCourse(courseId);
        if (!previous) throw new ApiError(404, 'Course not found', 'not_found');

        const row = await updateCourse(courseId, patch);
        if (!row) throw new ApiError(404, 'Course not found', 'not_found');

        await createAuditLog({
            actorUserId: adminCtx.userId,
            eventType: AuditEventType.COURSE_UPDATED,
            resourceType: AuditResourceType.COURSE,
            resourceId: row.id,
            description: `Updated course ${row.code}`,
            metadata: {
                courseId: row.id,
                changes: Object.keys(patch),
            },
            before: previous,
            after: row,
            changedFields: Object.keys(patch),
            request: req,
            required: true,
        });
        return json.ok({ message: 'Course updated successfully.', course: row });
    } catch (err: any) {
        if (err?.code === '23505') return json.conflict('Course code already exists.');
        return handleApiError(err);
    }
}

async function DELETEHandler(req: NextRequest, { params }: { params: Promise<{ courseId: string }> }) {
    try {
        const adminCtx = await requireAdmin(req);
        const { courseId } = Param.parse(await params);
        const hard = (new URL(req.url).searchParams.get('hard') || '').toLowerCase() === 'true';
        const result = hard ? await hardDeleteCourse(courseId) : await softDeleteCourse(courseId);
        if (!result) throw new ApiError(404, 'Course not found', 'not_found');
        const before = 'before' in result ? result.before : null;
        const after = 'after' in result ? result.after : null;
        const resourceId = after?.id ?? before?.id ?? courseId;

        await createAuditLog({
            actorUserId: adminCtx.userId,
            eventType: AuditEventType.COURSE_DELETED,
            resourceType: AuditResourceType.COURSE,
            resourceId,
            description: `${hard ? 'Hard' : 'Soft'} deleted course ${courseId}`,
            metadata: {
                courseId: resourceId,
                hardDeleted: hard,
            },
            before: before ?? null,
            after: after ?? null,
            changedFields: hard ? undefined : ['deletedAt'],
            request: req,
            required: true,
        });
        return json.ok({
            message: hard ? 'Course hard-deleted.' : 'Course soft-deleted.',
            id: resourceId,
        });
    } catch (err: any) {
        const pgCode = err?.code ?? err?.cause?.code;
        if (pgCode === '23503') {
            return json.conflict('Cannot delete course because cadets are still assigned to it.', {
                constraint: err?.constraint ?? err?.cause?.constraint,
                detail: err?.detail ?? err?.cause?.detail,
            });
        }
        return handleApiError(err);
    }
}
export const GET = withRouteLogging('GET', GETHandler);

export const PATCH = withRouteLogging('PATCH', PATCHHandler);

export const DELETE = withRouteLogging('DELETE', DELETEHandler);

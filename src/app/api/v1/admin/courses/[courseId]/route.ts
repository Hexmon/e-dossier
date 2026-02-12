// src/app/api/v1/courses/[courseId]/route.ts
import { z } from 'zod';
import { json, handleApiError, ApiError } from '@/app/lib/http';
import { requireAuth } from '@/app/lib/authz';
import { countAssignedOCsForCourse, getCourse, listCourseOfferings, softDeleteCourse, updateCourse, hardDeleteCourse } from '@/app/db/queries/courses';
import type { CourseRow } from '@/app/db/queries/courses';
import { courseUpdateSchema } from '@/app/lib/validators.courses';
import { withAuditRoute, AuditEventType, AuditResourceType } from '@/lib/audit';
import type { AuditNextRequest } from '@/lib/audit';
import { withAuthz } from '@/app/lib/acx/withAuthz';

export const runtime = 'nodejs';

const Param = z.object({ courseId: z.string().uuid() });

async function GETHandler(req: AuditNextRequest, { params }: { params: Promise<{ courseId: string }> }) {
    try {
        const authCtx = await requireAuth(req);
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

        await req.audit.log({
            action: AuditEventType.API_REQUEST,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: authCtx.userId },
            target: { type: AuditResourceType.COURSE, id: course.id },
            metadata: {
                description: `Retrieved course ${course.code}`,
                courseId: course.id,
                expandSubjects,
                offeringsCount: offerings.length,
            },
        });

        return json.ok({ message: 'Course retrieved successfully.', course, offerings });
    } catch (err) {
        return handleApiError(err);
    }
}

async function PATCHHandler(req: AuditNextRequest, { params }: { params: Promise<{ courseId: string }> }) {
    try {
        const adminCtx = await requireAuth(req);
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

        await req.audit.log({
            action: AuditEventType.COURSE_UPDATED,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: adminCtx.userId },
            target: { type: AuditResourceType.COURSE, id: row.id },
            metadata: {
                description: `Updated course ${row.code}`,
                courseId: row.id,
                changes: Object.keys(patch),
            },
        });
        return json.ok({ message: 'Course updated successfully.', course: row });
    } catch (err: any) {
        if (err?.code === '23505') return json.conflict('Course code already exists.');
        return handleApiError(err);
    }
}

type CourseDeleteResult =
    | { before: CourseRow; after: CourseRow }
    | { before: CourseRow };

async function DELETEHandler(req: AuditNextRequest, { params }: { params: Promise<{ courseId: string }> }) {
    try {
        const adminCtx = await requireAuth(req);
        const { courseId } = Param.parse(await params);
        const hard = (new URL(req.url).searchParams.get('hard') || '').toLowerCase() === 'true';
        const assignedOcCount = await countAssignedOCsForCourse(courseId);

        if (assignedOcCount > 0) {
            return json.conflict(
                `Cannot delete course. ${assignedOcCount} OC(s) are already assigned to this course.`,
                { ocCount: assignedOcCount },
            );
        }

        const result = (hard ? await hardDeleteCourse(courseId) : await softDeleteCourse(courseId)) as CourseDeleteResult | null;
        if (!result) throw new ApiError(404, 'Course not found', 'not_found');
        const before: CourseRow = result.before;
        let after: CourseRow | null = null;
        if ('after' in result) {
            after = result.after ?? null;
        }
        const resourceId = after?.id ?? before?.id ?? courseId;

        await req.audit.log({
            action: AuditEventType.COURSE_DELETED,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: adminCtx.userId },
            target: { type: AuditResourceType.COURSE, id: resourceId },
            metadata: {
                description: `${hard ? 'Hard' : 'Soft'} deleted course ${courseId}`,
                courseId: resourceId,
                hardDeleted: hard,
            },
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
export const GET = withAuditRoute('GET', withAuthz(GETHandler));

export const PATCH = withAuditRoute('PATCH', withAuthz(PATCHHandler));

export const DELETE = withAuditRoute('DELETE', withAuthz(DELETEHandler));

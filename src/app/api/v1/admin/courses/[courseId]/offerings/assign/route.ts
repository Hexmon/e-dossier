import { z } from 'zod';
import { json, handleApiError, ApiError } from '@/app/lib/http';
import { requireAuth } from '@/app/lib/authz';
import { offeringAssignSchema } from '@/app/lib/validators.courses';
import { getCourse } from '@/app/db/queries/courses';
import { assignOfferingsToCourse } from '@/app/db/queries/offerings';
import { withAuditRoute, AuditEventType, AuditResourceType } from '@/lib/audit';
import type { AuditNextRequest } from '@/lib/audit';
import { withAuthz } from '@/app/lib/acx/withAuthz';

export const runtime = 'nodejs';

const Param = z.object({ courseId: z.string().uuid() });

async function POSTHandler(
    req: AuditNextRequest,
    { params }: { params: Promise<{ courseId: string }> }
) {
    try {
        const authCtx = await requireAuth(req);
        const { courseId: targetCourseId } = Param.parse(await params);
        const body = offeringAssignSchema.parse(await req.json());

        if (body.sourceCourseId === targetCourseId) {
            throw new ApiError(400, 'sourceCourseId and targetCourseId must be different', 'bad_request');
        }

        const targetCourse = await getCourse(targetCourseId);
        if (!targetCourse || targetCourse.deletedAt) {
            throw new ApiError(404, 'Target course not found', 'not_found');
        }

        const sourceCourse = await getCourse(body.sourceCourseId);
        if (!sourceCourse || sourceCourse.deletedAt) {
            throw new ApiError(404, 'Source course not found', 'not_found');
        }

        const result = await assignOfferingsToCourse({
            sourceCourseId: body.sourceCourseId,
            targetCourseId,
            semester: body.semester,
            subjectIds: body.subjectIds,
        });

        await req.audit.log({
            action: AuditEventType.COURSE_OFFERINGS_ASSIGNED,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: authCtx.userId },
            target: { type: AuditResourceType.OFFERING, id: targetCourseId },
            metadata: {
                description: `Assigned offerings from ${body.sourceCourseId} to ${targetCourseId}`,
                sourceCourseId: body.sourceCourseId,
                targetCourseId,
                mode: body.mode,
                filters: {
                    semester: body.semester ?? null,
                    subjectIds: body.subjectIds ?? null,
                },
                createdCount: result.createdCount,
                skippedCount: result.skippedCount,
            },
        });

        return json.ok({
            message: 'Offerings assigned successfully.',
            sourceCourseId: body.sourceCourseId,
            targetCourseId,
            createdCount: result.createdCount,
            skippedCount: result.skippedCount,
            created: result.created,
            skipped: result.skipped,
            conflicts: result.skipped,
        });
    } catch (err) {
        return handleApiError(err);
    }
}

export const POST = withAuditRoute('POST', withAuthz(POSTHandler));

import { z } from 'zod';
import { json, handleApiError, ApiError } from '@/app/lib/http';
import { requireAuth } from '@/app/lib/authz';
import { offeringUpdateSchema } from '@/app/lib/validators.courses';
import { updateOffering, replaceOfferingInstructors, softDeleteOffering, hardDeleteOffering } from '@/app/db/queries/offerings';
import { getCourseOffering } from '@/app/db/queries/courses';
import { findMissingInstructorIds } from '@/app/db/queries/instructors';
import { withAuditRoute, AuditEventType, AuditResourceType } from '@/lib/audit';
import type { AuditNextRequest } from '@/lib/audit';

const Param = z.object({ courseId: z.string().uuid(), offeringId: z.string().uuid() });

async function GETHandler(req: AuditNextRequest, { params }: { params: Promise<{ courseId: string; offeringId: string }> }) {
    try {
        const authCtx = await requireAuth(req);
        const { courseId, offeringId } = Param.parse(await params);
        const row = await getCourseOffering(courseId, offeringId);
        if (!row) throw new ApiError(404, 'Offering not found', 'not_found');

        await req.audit.log({
            action: AuditEventType.API_REQUEST,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: authCtx.userId },
            target: { type: AuditResourceType.OFFERING, id: row.id },
            metadata: {
                description: 'Course offering retrieved successfully.',
                offeringId: row.id,
                courseId,
                subjectId: row.subject?.id ?? null,
            },
        });

        return json.ok({ message: 'Course offering retrieved successfully.', offering: row });
    } catch (err) { return handleApiError(err); }
}

async function PATCHHandler(req: AuditNextRequest, { params }: { params: Promise<{ courseId: string; offeringId: string }> }) {
    try {
        const adminCtx = await requireAuth(req);
        const { offeringId } = Param.parse(await params);
        const body = offeringUpdateSchema.parse(await req.json());

        const patch: any = {};
        for (const k of ['includeTheory', 'includePractical', 'theoryCredits', 'practicalCredits'] as const) {
            if (k in body) (patch as any)[k] = (body as any)[k];
        }

        const result = await updateOffering(offeringId, patch);
        if (!result) throw new ApiError(404, 'Offering not found', 'not_found');
        const updated = result.after;

        if (body.instructors) {
            const explicitInstructorIds = body.instructors
                .map((ins) => ins.instructorId)
                .filter((id): id is string => Boolean(id));
            if (explicitInstructorIds.length) {
                const missing = await findMissingInstructorIds(explicitInstructorIds);
                if (missing.length) {
                    throw new ApiError(400, 'One or more instructorId values are invalid.', 'bad_request', {
                        instructorIds: missing,
                    });
                }
            }
            await replaceOfferingInstructors(offeringId, body.instructors);
        }

        await req.audit.log({
            action: AuditEventType.COURSE_OFFERING_UPDATED,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: adminCtx.userId },
            target: { type: AuditResourceType.OFFERING, id: updated.id },
            metadata: {
                description: `Updated offering ${updated.id}`,
                offeringId: updated.id,
                courseId: updated.courseId,
                subjectId: updated.subjectId,
                changes: Object.keys(patch),
                instructorsUpdated: Boolean(body.instructors),
            },
        });
        return json.ok({ message: 'Course offering updated successfully.', offering: updated });
    } catch (err) { return handleApiError(err); }
}

type OfferingIdentifiers = {
    id: string;
    courseId: string | null;
    subjectId: string | null;
};

type OfferingDeleteResult =
    | { before: OfferingIdentifiers; after: OfferingIdentifiers }
    | { before: OfferingIdentifiers };

async function DELETEHandler(req: AuditNextRequest, { params }: { params: Promise<{ courseId: string; offeringId: string }> }) {
    try {
        const adminCtx = await requireAuth(req);
        const { offeringId } = Param.parse(await params);
        const hard = (new URL(req.url).searchParams.get('hard') || '').toLowerCase() === 'true';
        const result = (hard
            ? await hardDeleteOffering(offeringId)
            : await softDeleteOffering(offeringId)) as OfferingDeleteResult | null;
        if (!result) throw new ApiError(404, 'Offering not found', 'not_found');
        const before: OfferingIdentifiers = result.before;
        let after: OfferingIdentifiers | null = null;
        if ('after' in result) {
            after = result.after ?? null;
        }
        const resourceId = after?.id ?? before.id;

        await req.audit.log({
            action: AuditEventType.COURSE_OFFERING_DELETED,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: adminCtx.userId },
            target: { type: AuditResourceType.OFFERING, id: resourceId },
            metadata: {
                description: `${hard ? 'Hard' : 'Soft'} deleted offering ${resourceId}`,
                offeringId: resourceId,
                courseId: before.courseId ?? null,
                subjectId: before.subjectId ?? null,
                hardDeleted: hard,
            },
        });
        return json.ok({ message: hard ? 'Offering hard-deleted.' : 'Offering soft-deleted.', id: resourceId });
    } catch (err) { return handleApiError(err); }
}
export const GET = withAuditRoute('GET', GETHandler);

export const PATCH = withAuditRoute('PATCH', PATCHHandler);

export const DELETE = withAuditRoute('DELETE', DELETEHandler);

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { json, handleApiError, ApiError } from '@/app/lib/http';
import { requireAuth, requireAdmin } from '@/app/lib/authz';
import { offeringUpdateSchema } from '@/app/lib/validators.courses';
import { updateOffering, replaceOfferingInstructors, softDeleteOffering, hardDeleteOffering } from '@/app/db/queries/offerings';
import { getCourseOffering } from '@/app/db/queries/courses';
import { findMissingInstructorIds } from '@/app/db/queries/instructors';

const Param = z.object({ courseId: z.string().uuid(), offeringId: z.string().uuid() });

export async function GET(req: NextRequest, { params }: { params: Promise<{ courseId: string; offeringId: string }> }) {
    try {
        await requireAuth(req);
        const { courseId, offeringId } = Param.parse(await params);
        const row = await getCourseOffering(courseId, offeringId);
        if (!row) throw new ApiError(404, 'Offering not found', 'not_found');
        return json.ok({ message: 'Course offering retrieved successfully.', offering: row });
    } catch (err) { return handleApiError(err); }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ courseId: string; offeringId: string }> }) {
    try {
        await requireAdmin(req);
        const { offeringId } = Param.parse(await params);
        const body = offeringUpdateSchema.parse(await req.json());

        const patch: any = {};
        for (const k of ['includeTheory', 'includePractical', 'theoryCredits', 'practicalCredits'] as const) {
            if (k in body) (patch as any)[k] = (body as any)[k];
        }

        const updated = await updateOffering(offeringId, patch);
        if (!updated) throw new ApiError(404, 'Offering not found', 'not_found');

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

        return json.ok({ message: 'Course offering updated successfully.', offering: updated });
    } catch (err) { return handleApiError(err); }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ courseId: string; offeringId: string }> }) {
    try {
        await requireAdmin(req);
        const { offeringId } = Param.parse(await params);
        const hard = (new URL(req.url).searchParams.get('hard') || '').toLowerCase() === 'true';
        const row = hard ? await hardDeleteOffering(offeringId) : await softDeleteOffering(offeringId);
        if (!row) throw new ApiError(404, 'Offering not found', 'not_found');
        return json.ok({ message: hard ? 'Offering hard-deleted.' : 'Offering soft-deleted.', id: row.id });
    } catch (err) { return handleApiError(err); }
}

import { z } from 'zod';
import { json, handleApiError, ApiError } from '@/app/lib/http';
import { requireAuth } from '@/app/lib/authz';
import { offeringCreateSchema } from '@/app/lib/validators.courses';
import { getCourse, listCourseOfferings } from '@/app/db/queries/courses';
import { createOffering, replaceOfferingInstructors } from '@/app/db/queries/offerings';
import { findMissingInstructorIds } from '@/app/db/queries/instructors';
import { getSubject, getSubjectByCode } from '@/app/db/queries/subjects';
import { withAuditRoute, AuditEventType, AuditResourceType } from '@/lib/audit';
import type { AuditNextRequest } from '@/lib/audit';
import { withAuthz } from '@/app/lib/acx/withAuthz';

export const runtime = 'nodejs';

const Param = z.object({ courseId: z.string().uuid() });

function resolveOfferingDefaults(
    body: z.infer<typeof offeringCreateSchema>,
    subject: NonNullable<Awaited<ReturnType<typeof getSubject>>>
) {
    const includeTheory = body.includeTheory ?? Boolean(subject.hasTheory);
    const includePractical = body.includePractical ?? Boolean(subject.hasPractical);

    return {
        includeTheory,
        includePractical,
        theoryCredits: includeTheory ? (body.theoryCredits ?? subject.defaultTheoryCredits ?? null) : null,
        practicalCredits: includePractical ? (body.practicalCredits ?? subject.defaultPracticalCredits ?? null) : null,
    };
}

async function GETHandler(req: AuditNextRequest, { params }: { params: Promise<{ courseId: string }> }) {
    try {
        const authCtx = await requireAuth(req);
        const { courseId } = Param.parse(await params);
        const sp = new URL(req.url).searchParams;
        const semester = sp.get('semester') ? Number(sp.get('semester')) : undefined;
        const rows = await listCourseOfferings(courseId, semester);

        await req.audit.log({
            action: AuditEventType.API_REQUEST,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: authCtx.userId },
            target: { type: AuditResourceType.OFFERING, id: 'collection' },
            metadata: {
                description: 'Course offerings retrieved successfully.',
                courseId,
                semester: semester ?? null,
                count: rows.length,
            },
        });

        return json.ok({ message: 'Course offerings retrieved successfully.', items: rows, count: rows.length });
    } catch (err) { return handleApiError(err); }
}

async function POSTHandler(req: AuditNextRequest, { params }: { params: Promise<{ courseId: string }> }) {
    try {
        const adminCtx = await requireAuth(req);
        const { courseId } = Param.parse(await params);
        const body = offeringCreateSchema.parse(await req.json());

        const course = await getCourse(courseId);
        if (!course || course.deletedAt) {
            throw new ApiError(400, 'Invalid courseId: course not found or has been deleted', 'bad_request');
        }

        let subjectId = body.subjectId ?? null;
        if (!subjectId && body.subjectCode) {
            const subject = await getSubjectByCode(body.subjectCode);
            if (!subject) throw new ApiError(400, 'Unknown or deleted subjectCode', 'bad_request');
            subjectId = subject.id;
        }

        if (!subjectId) {
            throw new ApiError(400, 'Provide subjectId or subjectCode', 'bad_request');
        }

        const subject = await getSubject(subjectId);
        if (!subject || subject.deletedAt) {
            throw new ApiError(400, 'subjectId refers to a deleted/nonexistent subject', 'bad_request');
        }

        if (body.instructors?.length) {
            const explicitInstructorIds = body.instructors
                .map((ins) => ins.instructorId)
                .filter((id): id is string => Boolean(id));
            const missing = await findMissingInstructorIds(explicitInstructorIds);
            if (missing.length) {
                throw new ApiError(400, 'One or more instructorId values are invalid.', 'bad_request', {
                    instructorIds: missing,
                });
            }
        }

        const defaults = resolveOfferingDefaults(body, subject);
        const offering = await createOffering({
            courseId,
            subjectId,
            semester: body.semester,
            includeTheory: defaults.includeTheory,
            includePractical: defaults.includePractical,
            theoryCredits: defaults.theoryCredits,
            practicalCredits: defaults.practicalCredits,
        });

        if (body.instructors?.length) {
            await replaceOfferingInstructors(offering.id, body.instructors);
        }

        await req.audit.log({
            action: AuditEventType.COURSE_OFFERING_CREATED,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: adminCtx.userId },
            target: { type: AuditResourceType.OFFERING, id: offering.id },
            metadata: {
                description: `Created course offering ${offering.id} for course ${courseId}`,
                courseId,
                offeringId: offering.id,
                subjectId,
                semester: body.semester,
                includeTheory: offering.includeTheory,
                includePractical: offering.includePractical,
                theoryCredits: offering.theoryCredits,
                practicalCredits: offering.practicalCredits,
            },
        });
        return json.created({ message: 'Course offering created successfully.', offeringId: offering.id });
    } catch (err: any) {
        const pgCode = err?.code ?? err?.cause?.code;
        if (pgCode === '23505') {
            return json.conflict('Subject already offered for this course/semester.', {
                detail: err?.detail ?? err?.cause?.detail,
            });
        }
        return handleApiError(err);
    }
}
export const GET = withAuditRoute('GET', withAuthz(GETHandler));

export const POST = withAuditRoute('POST', withAuthz(POSTHandler));

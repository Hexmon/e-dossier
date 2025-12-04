import { NextRequest } from 'next/server';
import { z } from 'zod';
import { json, handleApiError, ApiError } from '@/app/lib/http';
import { requireAuth, requireAdmin } from '@/app/lib/authz';
import { offeringCreateSchema } from '@/app/lib/validators.courses';
import { listCourseOfferings } from '@/app/db/queries/courses';
import { db } from '@/app/db/client';
import { subjects } from '@/app/db/schema/training/subjects';
import { and, eq, isNull } from 'drizzle-orm';
import { createOffering, replaceOfferingInstructors } from '@/app/db/queries/offerings';
import { courses } from '@/app/db/schema/training/courses';

const Param = z.object({ courseId: z.string().uuid() });

export async function GET(req: NextRequest, { params }: { params: Promise<{ courseId: string }> }) {
    try {
        await requireAuth(req);
        const { courseId } = Param.parse(await params);
        const sp = new URL(req.url).searchParams;
        const semester = sp.get('semester') ? Number(sp.get('semester')) : undefined;
        const rows = await listCourseOfferings(courseId, semester);
        return json.ok({ message: 'Course offerings retrieved successfully.', items: rows, count: rows.length });
    } catch (err) { return handleApiError(err); }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ courseId: string }> }) {
    try {
        await requireAdmin(req);
        const { courseId } = Param.parse(await params);
        const body = offeringCreateSchema.parse(await req.json());

        // ❗ Ensure course exists and is NOT soft-deleted
        const [course] = await db
            .select({ id: courses.id })
            .from(courses)
            .where(and(eq(courses.id, courseId), isNull(courses.deletedAt)))
            .limit(1);

        if (!course) {
            throw new ApiError(400, "Invalid courseId: course not found or has been deleted", "bad_request");
        }

        // resolve subjectId from subjectCode if needed (and ensure subject is active)
        let subjectId = body.subjectId ?? null;
        if (!subjectId && body.subjectCode) {
            const [subj] = await db
                .select({ id: subjects.id })
                .from(subjects)
                .where(and(eq(subjects.code, body.subjectCode), isNull(subjects.deletedAt)))
                .limit(1);
            if (!subj) throw new ApiError(400, "Unknown or deleted subjectCode", "bad_request");
            subjectId = subj.id;
        }

        // if subjectId was provided directly, still ensure it's active
        if (subjectId) {
            const [subj] = await db
                .select({ id: subjects.id })
                .from(subjects)
                .where(and(eq(subjects.id, subjectId), isNull(subjects.deletedAt)))
                .limit(1);
            if (!subj) throw new ApiError(400, "subjectId refers to a deleted/nonexistent subject", "bad_request");
        } else {
            // schema refine should prevent this; keeping a defensive check
            throw new ApiError(400, "Provide subjectId or subjectCode", "bad_request");
        }

        const offering = await createOffering({
            courseId,
            subjectId: subjectId!,
            semester: body.semester,
            includeTheory: body.includeTheory,
            includePractical: body.includePractical,
            theoryCredits: body.theoryCredits ?? null,
            practicalCredits: body.practicalCredits ?? null,
        });

        if (body.instructors?.length) {
            await replaceOfferingInstructors(offering.id, body.instructors);
        }

        return json.created({ message: 'Course offering created successfully.', offeringId: offering.id });
    } catch (err: any) {
        if (err?.code === "23505") return json.conflict("Subject already offered for this course/semester.");
        return handleApiError(err);
    }
}

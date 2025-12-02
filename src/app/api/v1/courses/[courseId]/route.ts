// src/app/api/v1/courses/[courseId]/route.ts
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { json, handleApiError, ApiError } from '@/app/lib/http';
import { requireAuth, requireAdmin } from '@/app/lib/authz';
import { getCourse, listCourseOfferings, softDeleteCourse, updateCourse } from '@/app/db/queries/courses';
import { courseUpdateSchema } from '@/app/lib/validators.courses';

const Param = z.object({ courseId: z.string().uuid() });

export async function GET(req: NextRequest, ctx: { params: Promise<{ courseId: string }> }) {
    try {
        await requireAuth(req);
        const { courseId } = Param.parse(await ctx.params);

        const sp = new URL(req.url).searchParams;
        const expandSubjects = (sp.get('expand') || '').includes('subjects');

        const course = await getCourse(courseId);
        if (!course) throw new ApiError(404, 'Course not found', 'not_found');

        let offerings:
            {
                id: string; semester: number; includeTheory: boolean; includePractical: boolean;
                theoryCredits: number | null; practicalCredits: number | null;
                subjectId: string; subjectCode: string; subjectName: string; subjectBranch: string;
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

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ courseId: string }> }) {
    try {
        await requireAdmin(req);
        const { courseId } = Param.parse(await ctx.params);

        const body = courseUpdateSchema.parse(await req.json());
        const patch: any = {};
        if (body.code !== undefined) patch.code = body.code;
        if (body.title !== undefined) patch.title = body.title;
        if (body.notes !== undefined) patch.notes = body.notes ?? null;
        if (body.restore === true) patch.deletedAt = null;

        const row = await updateCourse(courseId, patch);
        if (!row) throw new ApiError(404, 'Course not found', 'not_found');
        return json.ok({ message: 'Course updated successfully.', course: row });
    } catch (err: any) {
        if (err?.code === '23505') return json.conflict('Course code already exists.');
        return handleApiError(err);
    }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ courseId: string }> }) {
    try {
        await requireAdmin(req);
        const { courseId } = Param.parse(await ctx.params);
        const row = await softDeleteCourse(courseId);
        if (!row) throw new ApiError(404, 'Course not found', 'not_found');
        return json.ok({ message: 'Course soft-deleted.', id: row.id });
    } catch (err) {
        return handleApiError(err);
    }
}

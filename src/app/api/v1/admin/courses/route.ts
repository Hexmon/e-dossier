import { NextRequest } from 'next/server';
import { json, handleApiError, ApiError } from '@/app/lib/http';
import { requireAuth, requireAdmin } from '@/app/lib/authz';
import { listQuerySchema, courseCreateSchema } from '@/app/lib/validators.courses';
import { createCourse, listCourses } from '@/app/db/queries/courses';

export async function GET(req: NextRequest) {
    try {
        await requireAuth(req);
        const sp = new URL(req.url).searchParams;
        const qp = listQuerySchema.parse({
            q: sp.get('q') ?? undefined,
            includeDeleted: sp.get('includeDeleted') ?? undefined,
            limit: sp.get('limit') ?? undefined,
            offset: sp.get('offset') ?? undefined,
        });
        const rows = await listCourses({
            q: qp.q,
            includeDeleted: qp.includeDeleted === 'true',
            limit: qp.limit, offset: qp.offset,
        });
        return json.ok({ message: 'Courses retrieved successfully.', items: rows, count: rows.length });
    } catch (err) { return handleApiError(err); }
}

export async function POST(req: NextRequest) {
    try {
        await requireAdmin(req);
        const { code, title, notes } = courseCreateSchema.parse(await req.json());
        // enforce unique code
        // (uq index already exists; we handle conflict error format)
        const row = await createCourse({ code, title, notes });
        return json.created({ message: 'Course created successfully.', course: row });
    } catch (err: any) {
        if (err?.code === '23505') return json.conflict('Course code already exists.');
        return handleApiError(err);
    }
}

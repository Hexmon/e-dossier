import { json, handleApiError, ApiError } from '@/app/lib/http';
import { requireAuth } from '@/app/lib/authz';
import { listQuerySchema, courseCreateSchema } from '@/app/lib/validators.courses';
import { createCourse, listCourses } from '@/app/db/queries/courses';
import { withAuditRoute, AuditEventType, AuditResourceType } from '@/lib/audit';
import type { AuditNextRequest } from '@/lib/audit';
import { withAuthz } from '@/app/lib/acx/withAuthz';

export const runtime = 'nodejs';

async function GETHandler(req: AuditNextRequest) {
    try {
        const authCtx = await requireAuth(req);
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

        await req.audit.log({
            action: AuditEventType.API_REQUEST,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: authCtx.userId },
            target: { type: AuditResourceType.COURSE, id: 'collection' },
            metadata: {
                description: 'Courses retrieved successfully.',
                count: rows.length,
                query: {
                    q: qp.q ?? null,
                    includeDeleted: qp.includeDeleted === 'true',
                    limit: qp.limit ?? null,
                    offset: qp.offset ?? null,
                },
            },
        });

        return json.ok({ message: 'Courses retrieved successfully.', items: rows, count: rows.length });
    } catch (err) { return handleApiError(err); }
}

async function POSTHandler(req: AuditNextRequest) {
    try {
        const adminCtx = await requireAuth(req);
        const { code, title, notes } = courseCreateSchema.parse(await req.json());
        // enforce unique code
        // (uq index already exists; we handle conflict error format)
        const row = await createCourse({ code, title, notes });

        await req.audit.log({
            action: AuditEventType.COURSE_CREATED,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: adminCtx.userId },
            target: { type: AuditResourceType.COURSE, id: row.id },
            metadata: {
                description: `Created course ${row.code}`,
                courseId: row.id,
                code: row.code,
                title: row.title,
            },
        });
        return json.created({ message: 'Course created successfully.', course: row });
    } catch (err: any) {
        const pgCode = err?.code ?? err?.cause?.code;
        if (pgCode === '23505') return json.conflict('Course code already exists.');
        return handleApiError(err);
    }
}
export const GET = withAuditRoute('GET', withAuthz(GETHandler));

export const POST = withAuditRoute('POST', withAuthz(POSTHandler));

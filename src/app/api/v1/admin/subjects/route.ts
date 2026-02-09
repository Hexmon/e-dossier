import { json, handleApiError } from '@/app/lib/http';
import { requireAuth } from '@/app/lib/authz';
import { listQuerySchema, subjectCreateSchema } from '@/app/lib/validators.courses';
import { listSubjects } from '@/app/db/queries/subjects';
import { db } from '@/app/db/client';
import { subjects } from '@/app/db/schema/training/subjects';
import { withAuditRoute, AuditEventType, AuditResourceType } from '@/lib/audit';
import type { AuditNextRequest } from '@/lib/audit';

async function GETHandler(req: AuditNextRequest) {
    try {
        const authCtx = await requireAuth(req);
        const sp = new URL(req.url).searchParams;
        const qp = listQuerySchema.parse({
            q: sp.get('q') ?? undefined,
            branch: sp.get('branch') ?? undefined,
            includeDeleted: sp.get('includeDeleted') ?? undefined,
            limit: sp.get('limit') ?? undefined,
            offset: sp.get('offset') ?? undefined,
        });
        const rows = await listSubjects({
            q: qp.q, branch: qp.branch as any,
            includeDeleted: qp.includeDeleted === 'true',
            limit: qp.limit, offset: qp.offset,
        });

        await req.audit.log({
            action: AuditEventType.API_REQUEST,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: authCtx.userId },
            target: { type: AuditResourceType.SUBJECT, id: 'collection' },
            metadata: {
                description: 'Subjects retrieved successfully.',
                count: rows.length,
                query: {
                    q: qp.q ?? null,
                    branch: qp.branch ?? null,
                    includeDeleted: qp.includeDeleted === 'true',
                    limit: qp.limit ?? null,
                    offset: qp.offset ?? null,
                },
            },
        });

        return json.ok({ message: 'Subjects retrieved successfully.', items: rows, count: rows.length });
    } catch (err) { return handleApiError(err); }
}

async function POSTHandler(req: AuditNextRequest) {
    try {
        const adminCtx = await requireAuth(req);
        const body = subjectCreateSchema.parse(await req.json());
        const [row] = await db
            .insert(subjects)
            .values({
                code: body.code,
                name: body.name,
                branch: body.branch,
                hasTheory: body.hasTheory ?? false,
                hasPractical: body.hasPractical ?? false,
                defaultTheoryCredits: body.defaultTheoryCredits ?? null,
                defaultPracticalCredits: body.defaultPracticalCredits ?? null,
                description: body.description ?? null,
            })
            .returning();

        await req.audit.log({
            action: AuditEventType.SUBJECT_CREATED,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: adminCtx.userId },
            target: { type: AuditResourceType.SUBJECT, id: row.id },
            metadata: {
                description: `Created subject ${row.code}`,
                subjectId: row.id,
                code: row.code,
                name: row.name,
                branch: row.branch,
                hasTheory: row.hasTheory,
                hasPractical: row.hasPractical,
                defaultTheoryCredits: row.defaultTheoryCredits,
                defaultPracticalCredits: row.defaultPracticalCredits,
            },
        });
        return json.created({ message: 'Subject created successfully.', subject: row });
    } catch (err: any) {
        if (err?.code === '23505') return json.conflict('Subject code already exists.');
        return handleApiError(err);
    }
}
export const GET = withAuditRoute('GET', GETHandler);

export const POST = withAuditRoute('POST', POSTHandler);

import { json, handleApiError } from '@/app/lib/http';
import { requireAuth } from '@/app/lib/authz';
import { punishmentCreateSchema, punishmentListQuerySchema } from '@/app/lib/validators.punishments';
import { createPunishment, listPunishments } from '@/app/db/queries/punishments';
import { withAuditRoute, AuditEventType, AuditResourceType } from '@/lib/audit';
import type { AuditNextRequest } from '@/lib/audit';

async function GETHandler(req: AuditNextRequest) {
    try {
        const authCtx = await requireAuth(req);
        const sp = new URL(req.url).searchParams;
        const qp = punishmentListQuerySchema.parse({
            q: sp.get('q') ?? undefined,
            includeDeleted: sp.get('includeDeleted') ?? undefined,
            limit: sp.get('limit') ?? undefined,
            offset: sp.get('offset') ?? undefined,
        });

        const rows = await listPunishments({
            q: qp.q,
            includeDeleted: qp.includeDeleted === 'true',
            limit: qp.limit,
            offset: qp.offset,
        });

        await req.audit.log({
            action: AuditEventType.API_REQUEST,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: authCtx.userId },
            target: { type: AuditResourceType.PUNISHMENT, id: 'collection' },
            metadata: {
                description: 'Punishments retrieved successfully.',
                count: rows.length,
                query: {
                    q: qp.q ?? null,
                    includeDeleted: qp.includeDeleted === 'true',
                    limit: qp.limit ?? null,
                    offset: qp.offset ?? null,
                },
            },
        });
        return json.ok({ message: 'Punishments retrieved successfully.', items: rows, count: rows.length });
    } catch (err) {
        return handleApiError(err);
    }
}

async function POSTHandler(req: AuditNextRequest) {
    try {
        const adminCtx = await requireAuth(req);
        const body = punishmentCreateSchema.parse(await req.json());
        const row = await createPunishment({
            title: body.title,
            marksDeduction: body.marksDeduction ?? null,
        });

        await req.audit.log({
            action: AuditEventType.PUNISHMENT_CREATED,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: adminCtx.userId },
            target: { type: AuditResourceType.PUNISHMENT, id: row.id },
            metadata: {
                description: `Created punishment ${row.title}`,
                punishmentId: row.id,
                title: row.title,
                marksDeduction: row.marksDeduction,
            },
            diff: { after: row },
        });

        return json.created({ message: 'Punishment created successfully.', punishment: row });
    } catch (err) {
        return handleApiError(err);
    }
}

export const GET = withAuditRoute('GET', GETHandler);

export const POST = withAuditRoute('POST', POSTHandler);

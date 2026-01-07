import { NextRequest } from 'next/server';
import { json, handleApiError } from '@/app/lib/http';
import { requireAuth, requireAdmin } from '@/app/lib/authz';
import { punishmentCreateSchema, punishmentListQuerySchema } from '@/app/lib/validators.punishments';
import { createPunishment, listPunishments } from '@/app/db/queries/punishments';
import { createAuditLog, AuditEventType, AuditResourceType } from '@/lib/audit-log';
import { withRouteLogging } from '@/lib/withRouteLogging';

async function GETHandler(req: NextRequest) {
    try {
        await requireAuth(req);
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

        return json.ok({ message: 'Punishments retrieved successfully.', items: rows, count: rows.length });
    } catch (err) {
        return handleApiError(err);
    }
}

async function POSTHandler(req: NextRequest) {
    try {
        const adminCtx = await requireAdmin(req);
        const body = punishmentCreateSchema.parse(await req.json());
        const row = await createPunishment({
            title: body.title,
            marksDeduction: body.marksDeduction ?? null,
        });

        await createAuditLog({
            actorUserId: adminCtx.userId,
            eventType: AuditEventType.PUNISHMENT_CREATED,
            resourceType: AuditResourceType.PUNISHMENT,
            resourceId: row.id,
            description: `Created punishment ${row.title}`,
            metadata: {
                punishmentId: row.id,
                title: row.title,
                marksDeduction: row.marksDeduction,
            },
            after: row,
            request: req,
            required: true,
        });

        return json.created({ message: 'Punishment created successfully.', punishment: row });
    } catch (err) {
        return handleApiError(err);
    }
}

export const GET = withRouteLogging('GET', GETHandler);

export const POST = withRouteLogging('POST', POSTHandler);

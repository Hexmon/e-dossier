import { NextRequest } from 'next/server';
import { json, handleApiError } from '@/app/lib/http';
import { OcIdParam, listQuerySchema, medicalCreateSchema } from '@/app/lib/oc-validators';
import { listMedicals, createMedical } from '@/app/db/queries/oc';
import { mustBeAuthed, parseParam, ensureOcExists } from '../../_checks';
import { createAuditLog, AuditEventType, AuditResourceType } from '@/lib/audit-log';
import { withRouteLogging } from '@/lib/withRouteLogging';

async function GETHandler(req: NextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        await mustBeAuthed(req);
        const { ocId } = await parseParam({params}, OcIdParam); await ensureOcExists(ocId);
        const sp = new URL(req.url).searchParams;
        const qp = listQuerySchema.parse({ limit: sp.get('limit') ?? undefined, offset: sp.get('offset') ?? undefined });
        const rows = await listMedicals(ocId, qp.limit ?? 100, qp.offset ?? 0);
        return json.ok({ message: 'Medical records retrieved successfully.', items: rows, count: rows.length });
    } catch (err) { return handleApiError(err); }
}

async function POSTHandler(req: NextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        const authCtx = await mustBeAuthed(req);
        const { ocId } = await parseParam({params}, OcIdParam); await ensureOcExists(ocId);
        const dto = medicalCreateSchema.parse(await req.json());
        const row = await createMedical(ocId, dto);

        await createAuditLog({
            actorUserId: authCtx.userId,
            eventType: AuditEventType.OC_RECORD_CREATED,
            resourceType: AuditResourceType.OC,
            resourceId: ocId,
            description: `Created medical record ${row.id} for OC ${ocId}`,
            metadata: {
                ocId,
                module: 'medical',
                recordId: row.id,
            },
            after: row,
            request: req,
            required: true,
        });
        return json.created({ message: 'Medical record created successfully.', data: row });
    } catch (err) { return handleApiError(err); }
}
export const GET = withRouteLogging('GET', GETHandler);

export const POST = withRouteLogging('POST', POSTHandler);

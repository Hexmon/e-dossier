import { NextRequest } from 'next/server';
import { json, handleApiError } from '@/app/lib/http';
import { mustBeAuthed, parseParam, ensureOcExists } from '../../_checks';
import {
    OcIdParam,
    listQuerySchema,
    creditForExcellenceCreateSchema,
} from '@/app/lib/oc-validators';
import {
    createCreditForExcellence,
    createManyCreditForExcellence,
    listCreditForExcellence,
} from '@/app/db/queries/oc';
import { createAuditLog, AuditEventType, AuditResourceType } from '@/lib/audit-log';
import { withRouteLogging } from '@/lib/withRouteLogging';

interface MotivationRecord {
    obstacle: string;
    strategy: string;
    progress: string;
    reflection: string;
}

interface SavedDataState {
    motivation: {
        records: MotivationRecord[];
    };
}


async function GETHandler(req: NextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        await mustBeAuthed(req);
        const { ocId } = await parseParam({params}, OcIdParam);
        await ensureOcExists(ocId);
        const sp = new URL(req.url).searchParams;
        const qp = listQuerySchema.parse({
            limit: sp.get('limit') ?? undefined,
            offset: sp.get('offset') ?? undefined,
        });
        const rows = await listCreditForExcellence(ocId, qp.limit ?? 100, qp.offset ?? 0);
        return json.ok({ message: 'Credit for excellence records retrieved successfully.', items: rows, count: rows.length });
    } catch (err) {
        return handleApiError(err);
    }
}

async function POSTHandler(req: NextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        const authCtx = await mustBeAuthed(req);
        const { ocId } = await parseParam({params}, OcIdParam);
        await ensureOcExists(ocId);
        const body = await req.json();

        if (Array.isArray(body)) {
            const items = creditForExcellenceCreateSchema.array().parse(body);
            const rows = await createManyCreditForExcellence(ocId, items);

            await createAuditLog({
                actorUserId: authCtx.userId,
                eventType: AuditEventType.OC_RECORD_CREATED,
                resourceType: AuditResourceType.OC,
                resourceId: ocId,
                description: `Created ${rows.length} credit-for-excellence records for OC ${ocId}`,
                metadata: {
                    ocId,
                    module: 'credit_for_excellence',
                    count: rows.length,
                    recordIds: rows.map((r) => r.id),
                },
                request: req,
            });
            return json.created({ message: 'Credit for excellence records created successfully.', items: rows, count: rows.length });
        }

        const dto = creditForExcellenceCreateSchema.parse(body);
        const row = await createCreditForExcellence(ocId, dto);

        await createAuditLog({
            actorUserId: authCtx.userId,
            eventType: AuditEventType.OC_RECORD_CREATED,
            resourceType: AuditResourceType.OC,
            resourceId: ocId,
            description: `Created credit-for-excellence record ${row.id} for OC ${ocId}`,
            metadata: {
                ocId,
                module: 'credit_for_excellence',
                recordId: row.id,
            },
            request: req,
        });
        return json.created({ message: 'Credit for excellence record created successfully.', data: row });
    } catch (err) {
        return handleApiError(err);
    }
}
export const GET = withRouteLogging('GET', GETHandler);

export const POST = withRouteLogging('POST', POSTHandler);

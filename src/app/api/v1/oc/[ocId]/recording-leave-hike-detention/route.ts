import { NextRequest } from 'next/server';
import { json, handleApiError } from '@/app/lib/http';
import { mustBeAuthed, parseParam, ensureOcExists } from '../../_checks';
import {
    OcIdParam,
    listQuerySchema,
    recordingLeaveHikeDetentionCreateSchema,
} from '@/app/lib/oc-validators';
import {
    listRecordingLeaveHikeDetention,
    createRecordingLeaveHikeDetention,
} from '@/app/db/queries/oc';
import { createAuditLog, AuditEventType, AuditResourceType } from '@/lib/audit-log';
import { withRouteLogging } from '@/lib/withRouteLogging';

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
        const rows = await listRecordingLeaveHikeDetention(ocId, qp.limit ?? 100, qp.offset ?? 0);
        return json.ok({ message: 'Leave/hike/detention records retrieved successfully.', items: rows, count: rows.length });
    } catch (err) {
        return handleApiError(err);
    }
}

async function POSTHandler(req: NextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        const authCtx = await mustBeAuthed(req);
        const { ocId } = await parseParam({params}, OcIdParam);
        await ensureOcExists(ocId);
        const dto = recordingLeaveHikeDetentionCreateSchema.parse(await req.json());
        const row = await createRecordingLeaveHikeDetention(ocId, dto);

        await createAuditLog({
            actorUserId: authCtx.userId,
            eventType: AuditEventType.OC_RECORD_CREATED,
            resourceType: AuditResourceType.OC,
            resourceId: ocId,
            description: `Created leave/hike/detention record ${row.id} for OC ${ocId}`,
            metadata: {
                ocId,
                module: 'leave_hike_detention',
                recordId: row.id,
            },
            request: req,
        });
        return json.created({ message: 'Leave/hike/detention record created successfully.', data: row });
    } catch (err) {
        return handleApiError(err);
    }
}
export const GET = withRouteLogging('GET', GETHandler);

export const POST = withRouteLogging('POST', POSTHandler);

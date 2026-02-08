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
import { withAuditRoute, AuditEventType, AuditResourceType } from '@/lib/audit';
import type { AuditNextRequest } from '@/lib/audit';

async function GETHandler(req: AuditNextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        const authCtx = await mustBeAuthed(req);
        const { ocId } = await parseParam({params}, OcIdParam);
        await ensureOcExists(ocId);
        const sp = new URL(req.url).searchParams;
        const qp = listQuerySchema.parse({
            limit: sp.get('limit') ?? undefined,
            offset: sp.get('offset') ?? undefined,
        });
        const rows = await listRecordingLeaveHikeDetention(ocId, qp.limit ?? 100, qp.offset ?? 0);

        await req.audit.log({
            action: AuditEventType.API_REQUEST,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: authCtx.userId },
            target: { type: AuditResourceType.OC, id: ocId },
            metadata: {
                description: 'Leave/hike/detention records retrieved successfully.',
                ocId,
                module: 'leave_hike_detention',
                count: rows.length,
                query: { limit: qp.limit ?? null, offset: qp.offset ?? null },
            },
        });

        return json.ok({ message: 'Leave/hike/detention records retrieved successfully.', items: rows, count: rows.length });
    } catch (err) {
        return handleApiError(err);
    }
}

async function POSTHandler(req: AuditNextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        const authCtx = await mustBeAuthed(req);
        const { ocId } = await parseParam({params}, OcIdParam);
        await ensureOcExists(ocId);
        const dto = recordingLeaveHikeDetentionCreateSchema.parse(await req.json());
        const row = await createRecordingLeaveHikeDetention(ocId, dto);

        await req.audit.log({
            action: AuditEventType.OC_RECORD_CREATED,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: authCtx.userId },
            target: { type: AuditResourceType.OC, id: ocId },
            metadata: {
                description: `Created leave/hike/detention record ${row.id} for OC ${ocId}`,
                ocId,
                module: 'leave_hike_detention',
                recordId: row.id,
            },
        });
        return json.created({ message: 'Leave/hike/detention record created successfully.', data: row });
    } catch (err) {
        return handleApiError(err);
    }
}
export const GET = withAuditRoute('GET', GETHandler);

export const POST = withAuditRoute('POST', POSTHandler);

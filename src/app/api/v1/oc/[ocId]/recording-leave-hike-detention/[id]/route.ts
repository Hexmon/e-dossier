import { NextRequest } from 'next/server';
import { json, handleApiError, ApiError } from '@/app/lib/http';
import { mustBeAuthed, mustBeAdmin, parseParam, ensureOcExists } from '../../../_checks';
import {
    OcIdParam,
    recordingLeaveHikeDetentionUpdateSchema,
} from '@/app/lib/oc-validators';
import {
    getRecordingLeaveHikeDetention,
    updateRecordingLeaveHikeDetention,
    deleteRecordingLeaveHikeDetention,
} from '@/app/db/queries/oc';
import { IdSchema } from '@/app/lib/apiClient';
import { createAuditLog, AuditEventType, AuditResourceType } from '@/lib/audit-log';
import { withRouteLogging } from '@/lib/withRouteLogging';

async function GETHandler(req: NextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        await mustBeAuthed(req);
        const { ocId } = await parseParam({params}, OcIdParam);
        await ensureOcExists(ocId);
        const { id } = await parseParam({params}, IdSchema);
        const row = await getRecordingLeaveHikeDetention(ocId, id);
        if (!row) throw new ApiError(404, 'Record not found', 'not_found');
        return json.ok({ message: 'Leave/hike/detention record retrieved successfully.', data: row });
    } catch (err) {
        return handleApiError(err);
    }
}

async function PATCHHandler(req: NextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        const adminCtx = await mustBeAdmin(req);
        const { ocId } = await parseParam({params}, OcIdParam);
        await ensureOcExists(ocId);
        const { id } = await parseParam({params}, IdSchema);
        const dto = recordingLeaveHikeDetentionUpdateSchema.parse(await req.json());
        const row = await updateRecordingLeaveHikeDetention(ocId, id, dto);
        if (!row) throw new ApiError(404, 'Record not found', 'not_found');

        await createAuditLog({
            actorUserId: adminCtx.userId,
            eventType: AuditEventType.OC_RECORD_UPDATED,
            resourceType: AuditResourceType.OC,
            resourceId: ocId,
            description: `Updated leave/hike/detention record ${id} for OC ${ocId}`,
            metadata: {
                ocId,
                module: 'leave_hike_detention',
                recordId: id,
                changes: Object.keys(dto),
            },
            request: req,
        });
        return json.ok({ message: 'Leave/hike/detention record updated successfully.', data: row });
    } catch (err) {
        return handleApiError(err);
    }
}

async function DELETEHandler(req: NextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        const adminCtx = await mustBeAdmin(req);
        const { ocId } = await parseParam({params}, OcIdParam);
        await ensureOcExists(ocId);
        const { id } = await parseParam({params}, IdSchema);
        const sp = new URL(req.url).searchParams;
        const hard = sp.get('hard') === 'true';
        const row = await deleteRecordingLeaveHikeDetention(ocId, id, { hard });
        if (!row) throw new ApiError(404, 'Record not found', 'not_found');

        await createAuditLog({
            actorUserId: adminCtx.userId,
            eventType: AuditEventType.OC_RECORD_DELETED,
            resourceType: AuditResourceType.OC,
            resourceId: ocId,
            description: `Deleted leave/hike/detention record ${id} for OC ${ocId}`,
            metadata: {
                ocId,
                module: 'leave_hike_detention',
                recordId: id,
                hardDeleted: hard,
            },
            request: req,
        });
        return json.ok({
            message: hard ? 'Leave/hike/detention record hard-deleted.' : 'Leave/hike/detention record soft-deleted.',
            id: row.id,
        });
    } catch (err) {
        return handleApiError(err);
    }
}
export const GET = withRouteLogging('GET', GETHandler);

export const PATCH = withRouteLogging('PATCH', PATCHHandler);

export const DELETE = withRouteLogging('DELETE', DELETEHandler);

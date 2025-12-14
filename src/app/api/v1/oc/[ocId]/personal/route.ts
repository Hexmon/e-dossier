import { NextRequest } from 'next/server';
import { json, handleApiError, ApiError } from '@/app/lib/http';
import { mustBeAuthed, mustBeAdmin, parseParam, ensureOcExists } from '../../_checks';
import { OcIdParam, personalUpsertSchema } from '@/app/lib/oc-validators';
import { getPersonal, upsertPersonal, deletePersonal } from '@/app/db/queries/oc';
import { authorizeOcAccess } from '@/lib/authorization';
import { createAuditLog, AuditEventType, AuditResourceType } from '@/lib/audit-log';
import { withRouteLogging } from '@/lib/withRouteLogging';

async function GETHandler(req: NextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        const { ocId } = await parseParam({params}, OcIdParam);
        await ensureOcExists(ocId);

        // SECURITY FIX: Proper authorization check to prevent IDOR
        await authorizeOcAccess(req, ocId);

        return json.ok({ message: 'Personal details retrieved successfully.', data: await getPersonal(ocId) });
    } catch (err) { return handleApiError(err); }
}

async function POSTHandler(req: NextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        const { ocId } = await parseParam({params}, OcIdParam);
        await ensureOcExists(ocId);

        // SECURITY FIX: Proper authorization check to prevent IDOR
        const authCtx = await authorizeOcAccess(req, ocId);

        const dto = personalUpsertSchema.parse(await req.json());
        const existing = await getPersonal(ocId);
        if (existing) throw new ApiError(409, 'Personal particulars already exist. Use PATCH (admin).', 'conflict');
        const saved = await upsertPersonal(ocId, dto);

        await createAuditLog({
            actorUserId: authCtx.userId,
            eventType: AuditEventType.OC_RECORD_CREATED,
            resourceType: AuditResourceType.OC,
            resourceId: ocId,
            description: `Created personal particulars for OC ${ocId}`,
            metadata: {
                ocId,
                module: 'personal',
                recordId: ocId,
            },
            before: existing,
            after: saved ?? null,
            request: req,
            required: true,
        });
        return json.created({ message: 'Personal details created successfully.', data: saved });
    } catch (err) { return handleApiError(err); }
}

async function PATCHHandler(req: NextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        const adminCtx = await mustBeAdmin(req);
        const { ocId } = await parseParam({params}, OcIdParam); await ensureOcExists(ocId);
        const dto = personalUpsertSchema.partial().parse(await req.json());
        const previous = await getPersonal(ocId);
        const saved = await upsertPersonal(ocId, dto);

        await createAuditLog({
            actorUserId: adminCtx.userId,
            eventType: AuditEventType.OC_RECORD_UPDATED,
            resourceType: AuditResourceType.OC,
            resourceId: ocId,
            description: `Updated personal particulars for OC ${ocId}`,
            metadata: {
                ocId,
                module: 'personal',
                recordId: ocId,
                changes: Object.keys(dto),
            },
            before: previous,
            after: saved ?? null,
            changedFields: Object.keys(dto),
            request: req,
            required: true,
        });
        return json.ok({ message: 'Personal details updated successfully.', data: saved });
    } catch (err) { return handleApiError(err); }
}

async function DELETEHandler(req: NextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        const adminCtx = await mustBeAdmin(req);
        const { ocId } = await parseParam({params}, OcIdParam); await ensureOcExists(ocId);
        const deleted = await deletePersonal(ocId);

        await createAuditLog({
            actorUserId: adminCtx.userId,
            eventType: AuditEventType.OC_RECORD_DELETED,
            resourceType: AuditResourceType.OC,
            resourceId: ocId,
            description: `Deleted personal particulars for OC ${ocId}`,
            metadata: {
                ocId,
                module: 'personal',
                recordId: ocId,
                hardDeleted: true,
            },
            before: deleted ?? null,
            after: null,
            request: req,
            required: true,
        });
        return json.ok({ message: 'Personal details deleted successfully.', deleted });
    } catch (err) { return handleApiError(err); }
}
export const GET = withRouteLogging('GET', GETHandler);

export const POST = withRouteLogging('POST', POSTHandler);

export const PATCH = withRouteLogging('PATCH', PATCHHandler);

export const DELETE = withRouteLogging('DELETE', DELETEHandler);

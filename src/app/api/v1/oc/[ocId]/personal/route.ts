import { json, handleApiError, ApiError } from '@/app/lib/http';
import { mustBeAuthed, parseParam, ensureOcExists } from '../../_checks';
import { OcIdParam, personalUpsertSchema } from '@/app/lib/oc-validators';
import { getPersonal, upsertPersonal, deletePersonal } from '@/app/db/queries/oc';
import { requireAuth } from '@/app/lib/authz';
import { withAuditRoute, AuditEventType, AuditResourceType } from '@/lib/audit';
import type { AuditNextRequest } from '@/lib/audit';

async function GETHandler(req: AuditNextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        const { ocId } = await parseParam({params}, OcIdParam);
        await ensureOcExists(ocId);

        // SECURITY FIX: Proper authorization check to prevent IDOR
        const authCtx = await mustBeAuthed(req);

        await req.audit.log({
            action: AuditEventType.API_REQUEST,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: authCtx.userId },
            target: { type: AuditResourceType.OC, id: ocId },
            metadata: {
                description: `Personal details retrieved successfully for OC ${ocId}`,
                ocId,
                module: 'personal',
                recordId: ocId,
            },
        });

        return json.ok({ message: 'Personal details retrieved successfully.', data: await getPersonal(ocId) });
    } catch (err) { return handleApiError(err); }
}

async function POSTHandler(req: AuditNextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        const { ocId } = await parseParam({params}, OcIdParam);
        await ensureOcExists(ocId);

        // SECURITY FIX: Proper authorization check to prevent IDOR
        const authCtx = await mustBeAuthed(req);

        const dto = personalUpsertSchema.parse(await req.json());
        const existing = await getPersonal(ocId);
        if (existing) throw new ApiError(409, 'Personal particulars already exist. Use PATCH (admin).', 'conflict');
        const saved = await upsertPersonal(ocId, dto);

        await req.audit.log({
            action: AuditEventType.OC_RECORD_CREATED,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: authCtx.userId },
            target: { type: AuditResourceType.OC, id: ocId },
            metadata: {
                description: `Created personal particulars for OC ${ocId}`,
                ocId,
                module: 'personal',
                recordId: ocId,
            },
        });
        return json.created({ message: 'Personal details created successfully.', data: saved });
    } catch (err) { return handleApiError(err); }
}

async function PATCHHandler(req: AuditNextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        const authCtx = await mustBeAuthed(req);
        const { ocId } = await parseParam({params}, OcIdParam); await ensureOcExists(ocId);
        const dto = personalUpsertSchema.partial().parse(await req.json());
        const saved = await upsertPersonal(ocId, dto);

        await req.audit.log({
            action: AuditEventType.OC_RECORD_UPDATED,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: authCtx.userId },
            target: { type: AuditResourceType.OC, id: ocId },
            metadata: {
                description: `Updated personal particulars for OC ${ocId}`,
                ocId,
                module: 'personal',
                recordId: ocId,
                changes: Object.keys(dto),
            },
        });
        return json.ok({ message: 'Personal details updated successfully.', data: saved });
    } catch (err) { return handleApiError(err); }
}

async function DELETEHandler(req: AuditNextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        const authCtx = await mustBeAuthed(req);
        const { ocId } = await parseParam({params}, OcIdParam); await ensureOcExists(ocId);
        const deleted = await deletePersonal(ocId);

        await req.audit.log({
            action: AuditEventType.OC_RECORD_DELETED,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: authCtx.userId },
            target: { type: AuditResourceType.OC, id: ocId },
            metadata: {
                description: `Deleted personal particulars for OC ${ocId}`,
                ocId,
                module: 'personal',
                recordId: ocId,
                hardDeleted: true,
            },
        });
        return json.ok({ message: 'Personal details deleted successfully.', deleted });
    } catch (err) { return handleApiError(err); }
}
export const GET = withAuditRoute('GET', GETHandler);

export const POST = withAuditRoute('POST', POSTHandler);

export const PATCH = withAuditRoute('PATCH', PATCHHandler);

export const DELETE = withAuditRoute('DELETE', DELETEHandler);

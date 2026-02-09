import { json, handleApiError, ApiError } from '@/app/lib/http';
import { parseParam, ensureOcExists } from '../../_checks';
import { OcIdParam, autobiographyUpsertSchema } from '@/app/lib/oc-validators';
import { getAutobio, upsertAutobio, deleteAutobio } from '@/app/db/queries/oc';
import { requireAuth } from '@/app/lib/authz';
import { withAuditRoute, AuditEventType, AuditResourceType } from '@/lib/audit';
import type { AuditNextRequest } from '@/lib/audit';

async function GETHandler(req: AuditNextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        const { ocId } = await parseParam({params}, OcIdParam);
        await ensureOcExists(ocId);

        // SECURITY FIX: Proper authorization check to prevent IDOR
        const authCtx = await requireAuth(req);

        await req.audit.log({
            action: AuditEventType.API_REQUEST,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: authCtx.userId },
            target: { type: AuditResourceType.OC, id: ocId },
            metadata: {
                description: `Autobiography retrieved successfully for OC ${ocId}`,
                ocId,
                module: 'autobiography',
                recordId: ocId,
            },
        });

        return json.ok({ message: 'Autobiography retrieved successfully.', data: await getAutobio(ocId) });
    } catch (err) { return handleApiError(err); }
}

async function POSTHandler(req: AuditNextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        const { ocId } = await parseParam({params}, OcIdParam); await ensureOcExists(ocId);
        const authCtx = await requireAuth(req);
        if (await getAutobio(ocId)) throw new ApiError(409, 'Autobiography exists. Use PATCH (admin).', 'conflict');
        const dto = autobiographyUpsertSchema.parse(await req.json());
        const saved = await upsertAutobio(ocId, dto);

        await req.audit.log({
            action: AuditEventType.OC_RECORD_CREATED,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: authCtx.userId },
            target: { type: AuditResourceType.OC, id: ocId },
            metadata: {
                description: `Created autobiography for OC ${ocId}`,
                ocId,
                module: 'autobiography',
                recordId: ocId,
            },
        });
        return json.created({ message: 'Autobiography created successfully.', data: saved });
    } catch (err) { return handleApiError(err); }
}

async function PATCHHandler(req: AuditNextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        const adminCtx = await requireAuth(req);
        const { ocId } = await parseParam({params}, OcIdParam); await ensureOcExists(ocId);
        const dto = autobiographyUpsertSchema.partial().parse(await req.json());
        const saved = await upsertAutobio(ocId, dto);

        await req.audit.log({
            action: AuditEventType.OC_RECORD_UPDATED,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: adminCtx.userId },
            target: { type: AuditResourceType.OC, id: ocId },
            metadata: {
                description: `Updated autobiography for OC ${ocId}`,
                ocId,
                module: 'autobiography',
                recordId: ocId,
                changes: Object.keys(dto),
            },
        });
        return json.ok({ message: 'Autobiography updated successfully.', data: saved });
    } catch (err) { return handleApiError(err); }
}

async function DELETEHandler(req: AuditNextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        const adminCtx = await requireAuth(req);
        const { ocId } = await parseParam({params}, OcIdParam); await ensureOcExists(ocId);
        const deleted = await deleteAutobio(ocId);

        await req.audit.log({
            action: AuditEventType.OC_RECORD_DELETED,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: adminCtx.userId },
            target: { type: AuditResourceType.OC, id: ocId },
            metadata: {
                description: `Deleted autobiography for OC ${ocId}`,
                ocId,
                module: 'autobiography',
                recordId: ocId,
                hardDeleted: true,
            },
        });
        return json.ok({ message: 'Autobiography deleted successfully.', deleted });
    } catch (err) { return handleApiError(err); }
}
export const GET = withAuditRoute('GET', GETHandler);

export const POST = withAuditRoute('POST', POSTHandler);

export const PATCH = withAuditRoute('PATCH', PATCHHandler);

export const DELETE = withAuditRoute('DELETE', DELETEHandler);

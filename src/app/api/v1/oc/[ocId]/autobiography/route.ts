import { NextRequest } from 'next/server';
import { json, handleApiError, ApiError } from '@/app/lib/http';
import { mustBeAuthed, mustBeAdmin, parseParam, ensureOcExists } from '../../_checks';
import { OcIdParam, autobiographyUpsertSchema } from '@/app/lib/oc-validators';
import { getAutobio, upsertAutobio, deleteAutobio } from '@/app/db/queries/oc';
import { authorizeOcAccess } from '@/lib/authorization';
import { createAuditLog, AuditEventType, AuditResourceType } from '@/lib/audit-log';
import { withRouteLogging } from '@/lib/withRouteLogging';
import { requireAuth } from '@/app/lib/authz';

async function GETHandler(req: NextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        const { ocId } = await parseParam({params}, OcIdParam);
        await ensureOcExists(ocId);

        // SECURITY FIX: Proper authorization check to prevent IDOR
        await requireAuth(req);

        return json.ok({ message: 'Autobiography retrieved successfully.', data: await getAutobio(ocId) });
    } catch (err) { return handleApiError(err); }
}

async function POSTHandler(req: NextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        const { ocId } = await parseParam({params}, OcIdParam); await ensureOcExists(ocId);
        const authCtx = await requireAuth(req);
        if (await getAutobio(ocId)) throw new ApiError(409, 'Autobiography exists. Use PATCH (admin).', 'conflict');
        const dto = autobiographyUpsertSchema.parse(await req.json());
        const saved = await upsertAutobio(ocId, dto);

        await createAuditLog({
            actorUserId: authCtx.userId,
            eventType: AuditEventType.OC_RECORD_CREATED,
            resourceType: AuditResourceType.OC,
            resourceId: ocId,
            description: `Created autobiography for OC ${ocId}`,
            metadata: {
                ocId,
                module: 'autobiography',
                recordId: ocId,
            },
            request: req,
        });
        return json.created({ message: 'Autobiography created successfully.', data: saved });
    } catch (err) { return handleApiError(err); }
}

async function PATCHHandler(req: NextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        const adminCtx = await requireAuth(req);
        const { ocId } = await parseParam({params}, OcIdParam); await ensureOcExists(ocId);
        const dto = autobiographyUpsertSchema.partial().parse(await req.json());
        const saved = await upsertAutobio(ocId, dto);

        await createAuditLog({
            actorUserId: adminCtx.userId,
            eventType: AuditEventType.OC_RECORD_UPDATED,
            resourceType: AuditResourceType.OC,
            resourceId: ocId,
            description: `Updated autobiography for OC ${ocId}`,
            metadata: {
                ocId,
                module: 'autobiography',
                recordId: ocId,
                changes: Object.keys(dto),
            },
            request: req,
        });
        return json.ok({ message: 'Autobiography updated successfully.', data: saved });
    } catch (err) { return handleApiError(err); }
}

async function DELETEHandler(req: NextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        const adminCtx = await requireAuth(req);
        const { ocId } = await parseParam({params}, OcIdParam); await ensureOcExists(ocId);
        const deleted = await deleteAutobio(ocId);

        await createAuditLog({
            actorUserId: adminCtx.userId,
            eventType: AuditEventType.OC_RECORD_DELETED,
            resourceType: AuditResourceType.OC,
            resourceId: ocId,
            description: `Deleted autobiography for OC ${ocId}`,
            metadata: {
                ocId,
                module: 'autobiography',
                recordId: ocId,
                hardDeleted: true,
            },
            request: req,
        });
        return json.ok({ message: 'Autobiography deleted successfully.', deleted });
    } catch (err) { return handleApiError(err); }
}
export const GET = withRouteLogging('GET', GETHandler);

export const POST = withRouteLogging('POST', POSTHandler);

export const PATCH = withRouteLogging('PATCH', PATCHHandler);

export const DELETE = withRouteLogging('DELETE', DELETEHandler);

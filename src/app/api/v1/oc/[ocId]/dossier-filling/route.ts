import { json, handleApiError, ApiError } from '@/app/lib/http';
import { parseParam, ensureOcExists, mustHaveOcAccess } from '../../_checks';
import { OcIdParam, dossierFillingUpsertSchema } from '@/app/lib/oc-validators';
import {
    getDossierFilling,
    getDossierFillingView,
    upsertDossierFilling,
    deleteDossierFilling,
} from '@/app/db/queries/oc';
import { withAuditRoute, AuditEventType, AuditResourceType } from '@/lib/audit';
import type { AuditNextRequest } from '@/lib/audit';

async function GETHandler(req: AuditNextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        const { ocId } = await parseParam({params}, OcIdParam);
        await ensureOcExists(ocId);
        const authCtx = await mustHaveOcAccess(req, ocId);

        await req.audit.log({
            action: AuditEventType.API_REQUEST,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: authCtx.userId },
            target: { type: AuditResourceType.OC, id: ocId },
            metadata: {
                description: 'Dossier filling retrieved successfully.',
                ocId,
                module: 'dossier_filling',
                recordId: ocId,
            },
        });

        return json.ok({ message: 'Dossier filling retrieved successfully.', data: await getDossierFillingView(ocId) });
    } catch (err) { return handleApiError(err); }
}

async function POSTHandler(req: AuditNextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        const { ocId } = await parseParam({params}, OcIdParam); await ensureOcExists(ocId);
        const authCtx = await mustHaveOcAccess(req, ocId);
        if (await getDossierFilling(ocId)) throw new ApiError(409, 'Dossier filling exists. Use PATCH (admin).', 'conflict');
        const dto = dossierFillingUpsertSchema.parse(await req.json());
        const saved = await upsertDossierFilling(ocId, dto);

        await req.audit.log({
            action: AuditEventType.OC_RECORD_CREATED,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: authCtx.userId },
            target: { type: AuditResourceType.OC, id: ocId },
            metadata: {
                description: `Created dossier filling for OC ${ocId}`,
                ocId,
                module: 'dossier_filling',
                recordId: ocId,
            },
        });
        return json.created({ message: 'Dossier filling created successfully.', data: saved });
    } catch (err) { return handleApiError(err); }
}

async function PATCHHandler(req: AuditNextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        const { ocId } = await parseParam({params}, OcIdParam); await ensureOcExists(ocId);
        const adminCtx = await mustHaveOcAccess(req, ocId);
        const dto = dossierFillingUpsertSchema.partial().parse(await req.json());
        const saved = await upsertDossierFilling(ocId, dto);

        await req.audit.log({
            action: AuditEventType.OC_RECORD_UPDATED,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: adminCtx.userId },
            target: { type: AuditResourceType.OC, id: ocId },
            metadata: {
                description: `Updated dossier filling for OC ${ocId}`,
                ocId,
                module: 'dossier_filling',
                recordId: ocId,
                changes: Object.keys(dto),
            },
        });
        return json.ok({ message: 'Dossier filling updated successfully.', data: saved });
    } catch (err) { return handleApiError(err); }
}

async function DELETEHandler(req: AuditNextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        const { ocId } = await parseParam({params}, OcIdParam); await ensureOcExists(ocId);
        const adminCtx = await mustHaveOcAccess(req, ocId);
        const deleted = await deleteDossierFilling(ocId);

        await req.audit.log({
            action: AuditEventType.OC_RECORD_DELETED,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: adminCtx.userId },
            target: { type: AuditResourceType.OC, id: ocId },
            metadata: {
                description: `Deleted dossier filling for OC ${ocId}`,
                ocId,
                module: 'dossier_filling',
                recordId: ocId,
                hardDeleted: true,
            },
        });
        return json.ok({ message: 'Dossier filling deleted successfully.', deleted });
    } catch (err) { return handleApiError(err); }
}
export const GET = withAuditRoute('GET', GETHandler);

export const POST = withAuditRoute('POST', POSTHandler);

export const PATCH = withAuditRoute('PATCH', PATCHHandler);

export const DELETE = withAuditRoute('DELETE', DELETEHandler);

import { json, handleApiError, ApiError } from '@/app/lib/http';
import { parseParam, ensureOcExists, mustBeAuthed } from '../../_checks';
import { OcIdParam, ocImageDeleteQuerySchema } from '@/app/lib/oc-validators';
import { authorizeOcAccess } from '@/lib/authorization';
import { listOcImages, getOcImage, softDeleteOcImage, hardDeleteOcImage } from '@/app/db/queries/oc';
import { deleteObject, createPresignedGetUrl } from '@/app/lib/storage';
import { withAuditRoute, AuditEventType, AuditResourceType } from '@/lib/audit';
import type { AuditNextRequest } from '@/lib/audit';

async function GETHandler(req: AuditNextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        const authCtx = await mustBeAuthed(req);
        const { ocId } = await parseParam({ params }, OcIdParam);
        await ensureOcExists(ocId);
        await authorizeOcAccess(req, ocId);

        const sp = new URL(req.url).searchParams;
        const includeDeleted = (sp.get('includeDeleted') || '').toLowerCase() === 'true';
        const rows = await listOcImages(ocId, includeDeleted);

        const images: Record<string, any> = { CIVIL_DRESS: null, UNIFORM: null };
        for (const row of rows) {
            images[row.kind] = {
                ...row,
                publicUrl: row.deletedAt ? null : await createPresignedGetUrl({ key: row.objectKey }),
            };
        }

        await req.audit.log({
            action: AuditEventType.API_REQUEST,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: authCtx.userId },
            target: { type: AuditResourceType.OC, id: ocId },
            metadata: {
                description: 'OC images retrieved successfully.',
                ocId,
                module: 'images',
                includeDeleted,
            },
        });

        return json.ok({ message: 'OC images retrieved successfully.', images, items: rows });
    } catch (err) {
        return handleApiError(err);
    }
}

async function DELETEHandler(req: AuditNextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        const authCtx = await mustBeAuthed(req);
        const { ocId } = await parseParam({ params }, OcIdParam);
        await ensureOcExists(ocId);
        await authorizeOcAccess(req, ocId);
        const sp = new URL(req.url).searchParams;
        const qp = ocImageDeleteQuerySchema.parse({
            kind: sp.get('kind') ?? undefined,
            hard: sp.get('hard') ?? undefined,
        });
        const hard = (qp.hard || '').toLowerCase() === 'true';

        const existing = await getOcImage(ocId, qp.kind);
        if (!existing || existing.deletedAt) throw new ApiError(404, 'OC image not found', 'not_found');

        if (hard) {
            await deleteObject(existing.objectKey);
            await hardDeleteOcImage(ocId, qp.kind);
        } else {
            await softDeleteOcImage(ocId, qp.kind);
        }

        await req.audit.log({
            action: AuditEventType.OC_RECORD_DELETED,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: authCtx.userId },
            target: { type: AuditResourceType.OC, id: ocId },
            metadata: {
                description: `${hard ? 'Hard' : 'Soft'} deleted OC image ${qp.kind} for ${ocId}`,
                ocId,
                module: 'images',
                kind: qp.kind,
                hardDeleted: hard,
            },
        });

        return json.ok({ message: hard ? 'OC image hard-deleted.' : 'OC image soft-deleted.', kind: qp.kind });
    } catch (err) {
        return handleApiError(err);
    }
}

export const GET = withAuditRoute('GET', GETHandler);

export const DELETE = withAuditRoute('DELETE', DELETEHandler);

import { json, handleApiError } from '@/app/lib/http';
import { parseParam, ensureOcExists, mustBeAdmin } from '../../../_checks';
import { OcIdParam, ocImagePresignSchema } from '@/app/lib/oc-validators';
import { buildImageKey, createPresignedUploadUrl, getPublicObjectUrl, getStorageConfig } from '@/app/lib/storage';
import { withAuditRoute, AuditEventType, AuditResourceType } from '@/lib/audit';
import type { AuditNextRequest } from '@/lib/audit';

async function POSTHandler(req: AuditNextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        const adminCtx = await mustBeAdmin(req);
        const { ocId } = await parseParam({ params }, OcIdParam);
        await ensureOcExists(ocId);

        const body = ocImagePresignSchema.parse(await req.json());
        const objectKey = buildImageKey({ ocId, kind: body.kind, contentType: body.contentType });
        const uploadUrl = await createPresignedUploadUrl({
            key: objectKey,
            contentType: body.contentType,
            expiresInSeconds: 300,
        });

        const config = getStorageConfig();
        const publicUrl = getPublicObjectUrl(objectKey);

        await req.audit.log({
            action: AuditEventType.OC_RECORD_UPDATED,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: adminCtx.userId },
            target: { type: AuditResourceType.OC, id: ocId },
            metadata: {
                description: `Generated upload URL for OC image ${body.kind}`,
                ocId,
                module: 'images',
                kind: body.kind,
                objectKey,
                contentType: body.contentType,
                sizeBytes: body.sizeBytes,
            },
        });

        return json.ok({
            message: 'Upload URL generated successfully.',
            bucket: config.bucket,
            objectKey,
            uploadUrl,
            publicUrl,
            expiresInSeconds: 300,
            maxSizeBytes: 200 * 1024,
            minSizeBytes: 20 * 1024,
        });
    } catch (err) {
        return handleApiError(err);
    }
}

export const POST = withAuditRoute('POST', POSTHandler);

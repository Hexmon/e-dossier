import { NextRequest } from 'next/server';
import { json, handleApiError, ApiError } from '@/app/lib/http';
import { parseParam, ensureOcExists, mustBeAdmin } from '../../../_checks';
import { OcIdParam, ocImageCompleteSchema, ocImageKindSchema } from '@/app/lib/oc-validators';
import { headObject, deleteObject, getPublicObjectUrl, getStorageConfig } from '@/app/lib/storage';
import { getOcImage, upsertOcImage } from '@/app/db/queries/oc';
import { createAuditLog, AuditEventType, AuditResourceType } from '@/lib/audit-log';
import { withRouteLogging } from '@/lib/withRouteLogging';

const MIN_BYTES = 20 * 1024;
const MAX_BYTES = 200 * 1024;
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

function assertObjectKeyMatches(ocId: string, kind: string, objectKey: string) {
    const prefix = `oc/${ocId}/${kind.toLowerCase()}/`;
    if (!objectKey.startsWith(prefix)) {
        throw new ApiError(400, 'objectKey does not match ocId/kind path.', 'bad_request', {
            expectedPrefix: prefix,
        });
    }
}

async function POSTHandler(req: NextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        const adminCtx = await mustBeAdmin(req);
        const { ocId } = await parseParam({ params }, OcIdParam);
        await ensureOcExists(ocId);

        const body = ocImageCompleteSchema.parse(await req.json());
        const kind = ocImageKindSchema.parse(body.kind);
        assertObjectKeyMatches(ocId, kind, body.objectKey);

        let head;
        try {
            head = await headObject(body.objectKey);
        } catch (err: any) {
            const status = err?.$metadata?.httpStatusCode;
            if (status === 404 || err?.name === 'NotFound') {
                throw new ApiError(404, 'Uploaded object not found.', 'not_found');
            }
            throw new ApiError(500, 'Failed to verify uploaded object.', 'server_error');
        }

        const sizeBytes = Number(head.ContentLength ?? 0);
        const contentType = head.ContentType || '';
        const etag = (head.ETag || '').replace(/"/g, '') || null;

        if (!ALLOWED_TYPES.has(contentType)) {
            throw new ApiError(400, 'Unsupported image content type.', 'bad_request', {
                contentType,
            });
        }
        if (sizeBytes < MIN_BYTES || sizeBytes > MAX_BYTES) {
            throw new ApiError(400, 'Image size out of allowed range.', 'bad_request', {
                sizeBytes,
                minBytes: MIN_BYTES,
                maxBytes: MAX_BYTES,
            });
        }

        const config = getStorageConfig();
        const existing = await getOcImage(ocId, kind);
        const saved = await upsertOcImage(ocId, kind, {
            bucket: config.bucket,
            objectKey: body.objectKey,
            contentType,
            sizeBytes,
            etag,
            uploadedAt: new Date(),
        });

        if (existing && existing.objectKey !== body.objectKey) {
            try {
                await deleteObject(existing.objectKey);
            } catch {
                // best effort cleanup
            }
        }

        await createAuditLog({
            actorUserId: adminCtx.userId,
            eventType: existing ? AuditEventType.OC_RECORD_UPDATED : AuditEventType.OC_RECORD_CREATED,
            resourceType: AuditResourceType.OC,
            resourceId: ocId,
            description: `${existing ? 'Updated' : 'Created'} OC image ${kind} for ${ocId}`,
            metadata: {
                ocId,
                module: 'images',
                kind,
                objectKey: body.objectKey,
                sizeBytes,
            },
            before: existing ?? null,
            after: saved ?? null,
            request: req,
            required: true,
        });

        return json.ok({
            message: 'OC image saved successfully.',
            image: saved,
            publicUrl: saved?.objectKey ? getPublicObjectUrl(saved.objectKey) : null,
        });
    } catch (err) {
        return handleApiError(err);
    }
}

export const POST = withRouteLogging('POST', POSTHandler);

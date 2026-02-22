import { randomUUID } from 'crypto';

import { requireAuth } from '@/app/lib/authz';
import { handleApiError, json } from '@/app/lib/http';
import { platoonImagePresignSchema } from '@/app/lib/validators';
import { createPresignedUploadUrl, getPublicObjectUrl } from '@/app/lib/storage';
import {
  withAuditRoute,
  AuditEventType,
  AuditResourceType,
} from '@/lib/audit';
import type { AuditNextRequest } from '@/lib/audit';

const EXT_BY_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

async function POSTHandler(req: AuditNextRequest) {
  try {
    const authCtx = await requireAuth(req);

    const parsed = platoonImagePresignSchema.safeParse(await req.json());
    if (!parsed.success) {
      return json.badRequest('Validation failed.', { issues: parsed.error.flatten() });
    }

    const { platoonKey, contentType, sizeBytes } = parsed.data;
    const normalizedKey = platoonKey.toLowerCase();
    const ext = EXT_BY_TYPE[contentType] ?? 'bin';
    const objectKey = `platoons/${normalizedKey}/${randomUUID()}.${ext}`;

    const uploadUrl = await createPresignedUploadUrl({
      key: objectKey,
      contentType,
      expiresInSeconds: 300,
    });

    const publicUrl = getPublicObjectUrl(objectKey);

    await req.audit.log({
      action: AuditEventType.API_REQUEST,
      outcome: 'SUCCESS',
      actor: { type: 'user', id: authCtx.userId },
      target: { type: AuditResourceType.API, id: 'platoons:image:presign:create' },
      metadata: {
        description: `Generated platoon image upload URL for ${platoonKey}`,
        platoonKey,
        objectKey,
        contentType,
        sizeBytes,
      },
    });

    return json.ok({
      message: 'Presigned upload URL generated successfully.',
      uploadUrl,
      publicUrl,
      objectKey,
      expiresInSeconds: 300,
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export const POST = withAuditRoute('POST', POSTHandler);

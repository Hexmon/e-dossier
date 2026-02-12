import { randomUUID } from "crypto";

import { requireAdmin } from "@/app/lib/authz";
import { handleApiError, json } from "@/app/lib/http";
import { logoPresignSchema } from "@/app/lib/validators.site-settings";
import { createPresignedUploadUrl, getPublicObjectUrl } from "@/app/lib/storage";
import {
  AuditEventType,
  AuditResourceType,
  type AuditNextRequest,
  withAuditRoute,
} from "@/lib/audit";

export const runtime = "nodejs";

const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

async function POSTHandler(req: AuditNextRequest) {
  try {
    const auth = await requireAdmin(req);
    const parsed = logoPresignSchema.safeParse(await req.json());

    if (!parsed.success) {
      return json.badRequest("Validation failed.", { issues: parsed.error.flatten() });
    }

    const { contentType, sizeBytes } = parsed.data;
    const ext = EXT_BY_TYPE[contentType] ?? "bin";
    const objectKey = `site-settings/logo/${randomUUID()}.${ext}`;

    const uploadUrl = await createPresignedUploadUrl({
      key: objectKey,
      contentType,
      expiresInSeconds: 300,
    });

    const publicUrl = getPublicObjectUrl(objectKey);

    await req.audit.log({
      action: AuditEventType.API_REQUEST,
      outcome: "SUCCESS",
      actor: { type: "user", id: auth.userId },
      target: { type: AuditResourceType.API, id: "admin:site-settings:logo:presign" },
      metadata: {
        eventType: "SITE_SETTINGS_LOGO_PRESIGN_CREATED",
        description: "Generated site logo presigned upload URL.",
        objectKey,
        contentType,
        sizeBytes,
      },
    });

    return json.ok({
      message: "Presigned upload URL generated successfully.",
      uploadUrl,
      publicUrl,
      objectKey,
      expiresInSeconds: 300,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export const POST = withAuditRoute("POST", POSTHandler);

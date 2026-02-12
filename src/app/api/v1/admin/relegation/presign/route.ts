import { randomUUID } from "crypto";
import { requireAdmin } from "@/app/lib/authz";
import { handleApiError, json } from "@/app/lib/http";
import { withAuthz } from "@/app/lib/acx/withAuthz";
import { createPresignedUploadUrl, getPublicObjectUrl } from "@/app/lib/storage";
import { relegationPdfPresignSchema } from "@/app/lib/validators.relegation";
import {
  AuditEventType,
  AuditResourceType,
  type AuditNextRequest,
  withAuditRoute,
} from "@/lib/audit";

export const runtime = "nodejs";

async function POSTHandler(req: AuditNextRequest) {
  try {
    const auth = await requireAdmin(req);
    const parsed = relegationPdfPresignSchema.safeParse(await req.json());

    if (!parsed.success) {
      return json.badRequest("Validation failed.", { issues: parsed.error.flatten() });
    }

    const objectKey = `relegation/${randomUUID()}.pdf`;
    const uploadUrl = await createPresignedUploadUrl({
      key: objectKey,
      contentType: parsed.data.contentType,
      expiresInSeconds: 300,
    });
    const publicUrl = getPublicObjectUrl(objectKey);

    await req.audit.log({
      action: AuditEventType.API_REQUEST,
      outcome: "SUCCESS",
      actor: { type: "user", id: auth.userId },
      target: { type: AuditResourceType.API, id: "admin:relegation:presign:create" },
      metadata: {
        description: "Generated relegation PDF presigned upload URL.",
        fileName: parsed.data.fileName,
        contentType: parsed.data.contentType,
        sizeBytes: parsed.data.sizeBytes,
        objectKey,
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

export const POST = withAuditRoute("POST", withAuthz(POSTHandler));

import { handleApiError, json } from "@/app/lib/http";
import { assertCanWriteSingle, getRelegationAccessContext } from "@/app/lib/relegation-auth";
import { deletePendingRelegationPdfObject } from "@/app/lib/relegation-pdf-cleanup";
import { relegationPendingPdfCleanupSchema } from "@/app/lib/validators.relegation";
import {
  AuditEventType,
  AuditResourceType,
  type AuditNextRequest,
  withAuditRoute,
} from "@/lib/audit";

export const runtime = "nodejs";

async function POSTHandler(req: AuditNextRequest) {
  try {
    const access = await getRelegationAccessContext(req);
    assertCanWriteSingle(access);

    const parsed = relegationPendingPdfCleanupSchema.safeParse(await req.json());
    if (!parsed.success) {
      return json.badRequest("Validation failed.", { issues: parsed.error.flatten() });
    }

    const result = await deletePendingRelegationPdfObject(parsed.data.objectKey);

    await req.audit.log({
      action: AuditEventType.API_REQUEST,
      outcome: "SUCCESS",
      actor: { type: "user", id: access.userId },
      target: { type: AuditResourceType.API, id: "admin:relegation:pending-pdf:cleanup:create" },
      metadata: {
        description: "Deleted pending relegation PDF upload.",
        objectKey: parsed.data.objectKey,
      },
    });

    return json.ok({
      message: "Pending PDF upload deleted successfully.",
      deleted: result.deleted,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export const POST = withAuditRoute("POST", POSTHandler);

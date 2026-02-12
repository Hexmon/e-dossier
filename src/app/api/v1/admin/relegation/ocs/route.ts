import { requireAdmin } from "@/app/lib/authz";
import { handleApiError, json } from "@/app/lib/http";
import { listRelegationOcOptions } from "@/app/db/queries/relegation";
import { withAuthz } from "@/app/lib/acx/withAuthz";
import {
  AuditEventType,
  AuditResourceType,
  type AuditNextRequest,
  withAuditRoute,
} from "@/lib/audit";

export const runtime = "nodejs";

async function GETHandler(req: AuditNextRequest) {
  try {
    const auth = await requireAdmin(req);
    const items = await listRelegationOcOptions();

    await req.audit.log({
      action: AuditEventType.API_REQUEST,
      outcome: "SUCCESS",
      actor: { type: "user", id: auth.userId },
      target: { type: AuditResourceType.API, id: "admin:relegation:ocs:read" },
      metadata: {
        description: "Relegation OC options retrieved.",
        count: items.length,
      },
    });

    return json.ok({
      message: "Relegation OC options retrieved successfully.",
      items,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export const GET = withAuditRoute("GET", withAuthz(GETHandler));

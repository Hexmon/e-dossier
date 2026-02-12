import { requireAdmin } from "@/app/lib/authz";
import { reorderSiteAwards } from "@/app/db/queries/site-settings";
import { handleApiError, json } from "@/app/lib/http";
import { awardReorderSchema } from "@/app/lib/validators.site-settings";
import {
  AuditEventType,
  AuditResourceType,
  type AuditNextRequest,
  withAuditRoute,
} from "@/lib/audit";

export const runtime = "nodejs";

async function PATCHHandler(req: AuditNextRequest) {
  try {
    const auth = await requireAdmin(req);
    const parsed = awardReorderSchema.safeParse(await req.json());

    if (!parsed.success) {
      return json.badRequest("Validation failed.", { issues: parsed.error.flatten() });
    }

    const result = await reorderSiteAwards(parsed.data.orderedIds);
    if (!result.ok) {
      return json.badRequest("Invalid reorder payload.", { reason: result.reason });
    }

    await req.audit.log({
      action: AuditEventType.USER_UPDATED,
      outcome: "SUCCESS",
      actor: { type: "user", id: auth.userId },
      target: { type: AuditResourceType.API, id: "admin:site-settings:awards:reorder" },
      metadata: {
        eventType: "SITE_AWARD_REORDERED",
        description: "Site awards reordered.",
        orderedIds: parsed.data.orderedIds,
      },
    });

    return json.ok({ message: "Awards reordered successfully.", items: result.items });
  } catch (error) {
    return handleApiError(error);
  }
}

export const PATCH = withAuditRoute("PATCH", PATCHHandler);

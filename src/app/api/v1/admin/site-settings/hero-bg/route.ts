import { requireAdmin } from "@/app/lib/authz";
import { clearSiteHeroBg } from "@/app/db/queries/site-settings";
import { deleteObject } from "@/app/lib/storage";
import { handleApiError, json } from "@/app/lib/http";
import {
  AuditEventType,
  AuditResourceType,
  computeDiff,
  type AuditNextRequest,
  withAuditRoute,
} from "@/lib/audit";

export const runtime = "nodejs";

function isNotFoundError(error: unknown): boolean {
  const status = (error as any)?.$metadata?.httpStatusCode;
  const name = (error as any)?.name;
  return status === 404 || name === "NotFound";
}

async function DELETEHandler(req: AuditNextRequest) {
  try {
    const auth = await requireAdmin(req);
    const { before, after } = await clearSiteHeroBg(auth.userId);

    if (before.heroBgObjectKey) {
      try {
        await deleteObject(before.heroBgObjectKey);
      } catch (error) {
        if (!isNotFoundError(error)) {
          throw error;
        }
      }
    }

    const { changedFields, diff } = computeDiff(before as any, after as any);

    await req.audit.log({
      action: AuditEventType.USER_UPDATED,
      outcome: "SUCCESS",
      actor: { type: "user", id: auth.userId },
      target: { type: AuditResourceType.API, id: "admin:site-settings:hero-bg:delete" },
      metadata: {
        eventType: "SITE_SETTINGS_HERO_BG_DELETED",
        description: "Landing hero background removed from site settings.",
        changedFields,
        diff,
      },
    });

    return json.ok({ message: "Hero background deleted successfully.", settings: after });
  } catch (error) {
    return handleApiError(error);
  }
}

export const DELETE = withAuditRoute("DELETE", DELETEHandler);

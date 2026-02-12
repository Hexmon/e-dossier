import { requireAdmin } from "@/app/lib/authz";
import { handleApiError, json } from "@/app/lib/http";
import { siteSettingsUpdateSchema } from "@/app/lib/validators.site-settings";
import { getOrCreateSiteSettings, updateSiteSettings } from "@/app/db/queries/site-settings";
import {
  AuditEventType,
  AuditResourceType,
  computeDiff,
  type AuditNextRequest,
  withAuditRoute,
} from "@/lib/audit";

export const runtime = "nodejs";

async function GETHandler(req: AuditNextRequest) {
  try {
    const auth = await requireAdmin(req);
    const settings = await getOrCreateSiteSettings();

    await req.audit.log({
      action: AuditEventType.API_REQUEST,
      outcome: "SUCCESS",
      actor: { type: "user", id: auth.userId },
      target: { type: AuditResourceType.API, id: "admin:site-settings:get" },
      metadata: {
        description: "Admin site settings retrieved.",
        siteSettingsId: settings.id,
      },
    });

    return json.ok({ message: "Site settings retrieved successfully.", settings });
  } catch (error) {
    return handleApiError(error);
  }
}

async function PUTHandler(req: AuditNextRequest) {
  try {
    const auth = await requireAdmin(req);
    const parsed = siteSettingsUpdateSchema.safeParse(await req.json());

    if (!parsed.success) {
      return json.badRequest("Validation failed.", { issues: parsed.error.flatten() });
    }

    const { before, after } = await updateSiteSettings(parsed.data, auth.userId);
    const { changedFields, diff } = computeDiff(before as any, after as any);

    await req.audit.log({
      action: AuditEventType.USER_UPDATED,
      outcome: "SUCCESS",
      actor: { type: "user", id: auth.userId },
      target: { type: AuditResourceType.API, id: "admin:site-settings:put" },
      metadata: {
        eventType: "SITE_SETTINGS_UPDATED",
        description: "Admin site settings updated.",
        changedFields,
        diff,
      },
    });

    return json.ok({ message: "Site settings updated successfully.", settings: after });
  } catch (error) {
    return handleApiError(error);
  }
}

export const GET = withAuditRoute("GET", GETHandler);
export const PUT = withAuditRoute("PUT", PUTHandler);

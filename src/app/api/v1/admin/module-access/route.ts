import { requireSuperAdmin } from "@/app/lib/authz";
import { handleApiError, json } from "@/app/lib/http";
import { moduleAccessSettingsSchema } from "@/app/lib/validators.module-access";
import {
  getOrCreateModuleAccessSettings,
  updateModuleAccessSettings,
} from "@/app/db/queries/module-access-settings";
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
    const authCtx = await requireSuperAdmin(req);
    const settings = await getOrCreateModuleAccessSettings();

    await req.audit.log({
      action: AuditEventType.API_REQUEST,
      outcome: "SUCCESS",
      actor: { type: "user", id: authCtx.userId },
      target: { type: AuditResourceType.API, id: "admin:module-access:get" },
      metadata: {
        description: "Module access settings retrieved.",
        moduleAccessSettingsId: settings.id,
      },
    });

    return json.ok({
      message: "Module access settings retrieved successfully.",
      settings,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

async function PUTHandler(req: AuditNextRequest) {
  try {
    const authCtx = await requireSuperAdmin(req);
    const parsed = moduleAccessSettingsSchema.safeParse(await req.json());

    if (!parsed.success) {
      return json.badRequest("Validation failed.", { issues: parsed.error.flatten() });
    }

    const { before, after } = await updateModuleAccessSettings(parsed.data, authCtx.userId);
    const { changedFields, diff } = computeDiff(before as any, after as any);

    await req.audit.log({
      action: AuditEventType.USER_UPDATED,
      outcome: "SUCCESS",
      actor: { type: "user", id: authCtx.userId },
      target: { type: AuditResourceType.API, id: "admin:module-access:put" },
      metadata: {
        eventType: "MODULE_ACCESS_UPDATED",
        description: "Module access settings updated.",
        changedFields,
        diff,
      },
    });

    return json.ok({
      message: "Module access settings updated successfully.",
      settings: after,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export const GET = withAuditRoute("GET", GETHandler);
export const PUT = withAuditRoute("PUT", PUTHandler);

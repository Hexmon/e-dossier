import { requireSuperAdmin } from "@/app/lib/authz";
import { handleApiError, json } from "@/app/lib/http";
import { dossierLockSettingsSchema } from "@/app/lib/validators.dossier-lock-settings";
import {
  getOrCreateDossierLockSettings,
  updateDossierLockSettings,
} from "@/app/db/queries/dossier-lock-settings";
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
    const settings = await getOrCreateDossierLockSettings();

    await req.audit.log({
      action: AuditEventType.API_REQUEST,
      outcome: "SUCCESS",
      actor: { type: "user", id: authCtx.userId },
      target: { type: AuditResourceType.API, id: "admin:dossier-lock:get" },
      metadata: {
        description: "Dossier lock settings retrieved.",
        dossierLockSettingsId: settings.id,
        lockPolicy: settings.lockPolicy,
      },
    });

    return json.ok({
      message: "Dossier lock settings retrieved successfully.",
      settings,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

async function PUTHandler(req: AuditNextRequest) {
  try {
    const authCtx = await requireSuperAdmin(req);
    const parsed = dossierLockSettingsSchema.safeParse(await req.json());

    if (!parsed.success) {
      return json.badRequest("Validation failed.", { issues: parsed.error.flatten() });
    }

    const { before, after } = await updateDossierLockSettings(parsed.data, authCtx.userId);
    const { changedFields, diff } = computeDiff(before as never, after as never);

    await req.audit.log({
      action: AuditEventType.USER_UPDATED,
      outcome: "SUCCESS",
      actor: { type: "user", id: authCtx.userId },
      target: { type: AuditResourceType.API, id: "admin:dossier-lock:put" },
      metadata: {
        eventType: "DOSSIER_LOCK_UPDATED",
        description: "Dossier lock settings updated.",
        changedFields,
        diff,
      },
    });

    return json.ok({
      message: "Dossier lock settings updated successfully.",
      settings: after,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export const GET = withAuditRoute("GET", GETHandler);
export const PUT = withAuditRoute("PUT", PUTHandler);

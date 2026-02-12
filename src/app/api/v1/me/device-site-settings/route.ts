import { requireAuth } from "@/app/lib/authz";
import { handleApiError, json } from "@/app/lib/http";
import {
  buildDefaultDeviceSiteSettings,
  getEffectiveDeviceSiteSettings,
} from "@/app/db/queries/device-site-settings";
import { meDeviceSiteSettingsQuerySchema } from "@/app/lib/validators.device-site-settings";
import { AuditEventType, AuditResourceType, type AuditNextRequest, withAuditRoute } from "@/lib/audit";
import { resolveDeviceIdFromRequest } from "@/lib/device-context";

export const runtime = "nodejs";

async function GETHandler(req: AuditNextRequest) {
  try {
    const authCtx = await requireAuth(req);

    const searchParams = new URL(req.url).searchParams;
    const parsed = meDeviceSiteSettingsQuerySchema.safeParse({
      deviceId: searchParams.get("deviceId") ?? undefined,
    });

    if (!parsed.success) {
      return json.badRequest("Validation failed.", { issues: parsed.error.flatten() });
    }

    const resolvedDeviceId = parsed.data.deviceId ?? resolveDeviceIdFromRequest(req);

    const settings = resolvedDeviceId
      ? await getEffectiveDeviceSiteSettings(resolvedDeviceId)
      : buildDefaultDeviceSiteSettings("");

    await req.audit.log({
      action: AuditEventType.API_REQUEST,
      outcome: "SUCCESS",
      actor: { type: "user", id: authCtx.userId },
      target: { type: AuditResourceType.API, id: "me:device-site-settings:get" },
      metadata: {
        description: "Effective device site settings retrieved for authenticated user.",
        deviceId: resolvedDeviceId,
      },
    });

    return json.ok({
      message: "Effective device site settings retrieved successfully.",
      deviceId: resolvedDeviceId ?? null,
      settings,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export const GET = withAuditRoute("GET", GETHandler);

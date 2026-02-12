import { requireAuth } from "@/app/lib/authz";
import { handleApiError, json } from "@/app/lib/http";
import {
  buildDefaultDeviceSiteSettings,
  getEffectiveDeviceSiteSettings,
  getDeviceSiteSettingsByDeviceId,
  upsertDeviceSiteSettings,
} from "@/app/db/queries/device-site-settings";
import {
  deviceSiteSettingsUpsertSchema,
  meDeviceSiteSettingsQuerySchema,
} from "@/app/lib/validators.device-site-settings";
import {
  AuditEventType,
  AuditResourceType,
  computeDiff,
  type AuditNextRequest,
} from "@/lib/audit";
import { resolveDeviceIdFromRequest } from "@/lib/device-context";

export async function GETHandler(req: AuditNextRequest) {
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
      target: { type: AuditResourceType.API, id: "settings:device-site:get" },
      metadata: {
        description: "Device site settings retrieved for authenticated user.",
        deviceId: resolvedDeviceId,
      },
    });

    return json.ok({
      message: "Device site settings retrieved successfully.",
      settings,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUTHandler(req: AuditNextRequest) {
  try {
    const authCtx = await requireAuth(req);

    const parsed = deviceSiteSettingsUpsertSchema.safeParse(await req.json());
    if (!parsed.success) {
      return json.badRequest("Validation failed.", { issues: parsed.error.flatten() });
    }

    const resolvedDeviceId = resolveDeviceIdFromRequest(req) ?? parsed.data.deviceId;

    const normalizedInput = {
      ...parsed.data,
      deviceId: resolvedDeviceId,
    };

    const before = await getDeviceSiteSettingsByDeviceId(resolvedDeviceId);
    const settings = await upsertDeviceSiteSettings(normalizedInput, authCtx.userId);

    const { changedFields, diff } = computeDiff(before ?? {}, settings ?? {});

    await req.audit.log({
      action: AuditEventType.USER_UPDATED,
      outcome: "SUCCESS",
      actor: { type: "user", id: authCtx.userId },
      target: { type: AuditResourceType.API, id: "settings:device-site:put" },
      metadata: {
        eventType: "DEVICE_SITE_SETTINGS_UPDATED",
        description: "Device site settings updated successfully.",
        deviceId: settings.deviceId,
        changedFields,
        diff,
      },
    });

    return json.ok({
      message: "Device site settings updated successfully.",
      settings,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

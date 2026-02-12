import { requireAdmin } from "@/app/lib/authz";
import { ApiError, handleApiError, json } from "@/app/lib/http";
import {
  getDeviceSiteSettingsByDeviceId,
  getEffectiveDeviceSiteSettings,
  listDeviceSiteSettings,
  upsertDeviceSiteSettings,
} from "@/app/db/queries/device-site-settings";
import {
  adminDeviceSiteSettingsQuerySchema,
  deviceSiteSettingsUpsertSchema,
} from "@/app/lib/validators.device-site-settings";
import {
  AuditEventType,
  AuditResourceType,
  computeDiff,
  type AuditNextRequest,
} from "@/lib/audit";
import { deriveSidebarRoleGroup } from "@/lib/sidebar-visibility";

function assertAdminOrSuperAdmin(authCtx: {
  roles?: string[];
  claims?: { apt?: { position?: string | null } };
}) {
  const roleGroup = deriveSidebarRoleGroup({
    roles: authCtx.roles ?? [],
    position: authCtx.claims?.apt?.position ?? null,
  });

  if (roleGroup === "OTHER_USERS") {
    throw new ApiError(403, "Admin privileges required", "forbidden");
  }
}

export async function GETHandler(req: AuditNextRequest) {
  try {
    const authCtx = await requireAdmin(req);
    assertAdminOrSuperAdmin(authCtx);

    const searchParams = new URL(req.url).searchParams;
    const parsed = adminDeviceSiteSettingsQuerySchema.safeParse({
      deviceId: searchParams.get("deviceId") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
      offset: searchParams.get("offset") ?? undefined,
    });

    if (!parsed.success) {
      return json.badRequest("Validation failed.", { issues: parsed.error.flatten() });
    }

    const { deviceId, limit, offset } = parsed.data;

    if (deviceId) {
      const settings = await getEffectiveDeviceSiteSettings(deviceId);

      await req.audit.log({
        action: AuditEventType.API_REQUEST,
        outcome: "SUCCESS",
        actor: { type: "user", id: authCtx.userId },
        target: { type: AuditResourceType.API, id: "admin:device-site-settings:get" },
        metadata: {
          description: "Device site settings retrieved for a single device.",
          deviceId,
        },
      });

      return json.ok({
        message: "Device site settings retrieved successfully.",
        settings,
      });
    }

    const items = await listDeviceSiteSettings({ limit, offset });

    await req.audit.log({
      action: AuditEventType.API_REQUEST,
      outcome: "SUCCESS",
      actor: { type: "user", id: authCtx.userId },
      target: { type: AuditResourceType.API, id: "admin:device-site-settings:list" },
      metadata: {
        description: "Device site settings list retrieved successfully.",
        limit,
        offset,
      },
    });

    return json.ok({
      message: "Device site settings list retrieved successfully.",
      items,
      pagination: {
        limit,
        offset,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUTHandler(req: AuditNextRequest) {
  try {
    const authCtx = await requireAdmin(req);
    assertAdminOrSuperAdmin(authCtx);

    const parsed = deviceSiteSettingsUpsertSchema.safeParse(await req.json());
    if (!parsed.success) {
      return json.badRequest("Validation failed.", { issues: parsed.error.flatten() });
    }

    const { deviceId } = parsed.data;
    const before = await getDeviceSiteSettingsByDeviceId(deviceId);
    const settings = await upsertDeviceSiteSettings(parsed.data, authCtx.userId);

    const { changedFields, diff } = computeDiff(before ?? {}, settings ?? {});

    await req.audit.log({
      action: AuditEventType.USER_UPDATED,
      outcome: "SUCCESS",
      actor: { type: "user", id: authCtx.userId },
      target: { type: AuditResourceType.API, id: "admin:device-site-settings:put" },
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

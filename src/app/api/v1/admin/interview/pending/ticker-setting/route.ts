import { ApiError, handleApiError, json } from "@/app/lib/http";
import { requireAuth } from "@/app/lib/authz";
import {
  createInterviewPendingTickerSetting,
  getLatestInterviewPendingTickerSetting,
  listInterviewPendingTickerSettingLogs,
} from "@/app/db/queries/interview-pending-ticker-settings";
import {
  interviewPendingTickerSettingsCreateSchema,
  interviewPendingTickerSettingsQuerySchema,
} from "@/app/lib/validators.interview-pending-ticker-settings";
import {
  AuditEventType,
  AuditResourceType,
  computeDiff,
  type AuditNextRequest,
  withAuditRoute,
} from "@/lib/audit";
import {
  canAccessInterviewPendingTickerSetting,
  getDaysBetweenDates,
} from "@/lib/interview-pending-ticker";

export const runtime = "nodejs";

function assertTickerSettingAccess(authCtx: {
  roles?: string[];
  claims?: { apt?: { position?: string | null; scope?: { type?: string | null } } };
}) {
  const canAccess = canAccessInterviewPendingTickerSetting({
    roles: authCtx.roles,
    position: authCtx.claims?.apt?.position ?? null,
    scopeType: authCtx.claims?.apt?.scope?.type ?? null,
  });

  if (!canAccess) {
    throw new ApiError(403, "Forbidden: ticker setting access denied.", "forbidden");
  }
}

async function GETHandler(req: AuditNextRequest) {
  try {
    const authCtx = await requireAuth(req);
    assertTickerSettingAccess(authCtx);

    const searchParams = new URL(req.url).searchParams;
    const parsed = interviewPendingTickerSettingsQuerySchema.safeParse({
      includeLogs: searchParams.get("includeLogs") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
      offset: searchParams.get("offset") ?? undefined,
    });

    if (!parsed.success) {
      return json.badRequest("Validation failed.", { issues: parsed.error.flatten() });
    }

    const latest = await getLatestInterviewPendingTickerSetting();
    const logs = parsed.data.includeLogs
      ? await listInterviewPendingTickerSettingLogs({
          limit: parsed.data.limit,
          offset: parsed.data.offset,
        })
      : [];

    await req.audit.log({
      action: AuditEventType.API_REQUEST,
      outcome: "SUCCESS",
      actor: { type: "user", id: authCtx.userId },
      target: { type: AuditResourceType.API, id: "admin:interview:pending:ticker-setting:get" },
      metadata: {
        description: "Interview pending ticker setting retrieved.",
        includeLogs: parsed.data.includeLogs,
        logCount: logs.length,
      },
    });

    return json.ok({
      message: "Interview pending ticker setting retrieved successfully.",
      setting: latest,
      logs,
      count: logs.length,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

async function POSTHandler(req: AuditNextRequest) {
  try {
    const authCtx = await requireAuth(req);
    assertTickerSettingAccess(authCtx);

    const parsed = interviewPendingTickerSettingsCreateSchema.safeParse(await req.json());
    if (!parsed.success) {
      return json.badRequest("Validation failed.", { issues: parsed.error.flatten() });
    }

    const before = await getLatestInterviewPendingTickerSetting();
    const days = getDaysBetweenDates(parsed.data.startDate, parsed.data.endDate);
    const created = await createInterviewPendingTickerSetting(
      {
        startDate: parsed.data.startDate,
        endDate: parsed.data.endDate,
        days,
      },
      authCtx.userId
    );

    if (!created) {
      throw new ApiError(500, "Failed to save ticker setting.", "ticker_setting_create_failed");
    }

    const { changedFields, diff } = computeDiff((before ?? {}) as any, created as any);

    await req.audit.log({
      action: AuditEventType.USER_UPDATED,
      outcome: "SUCCESS",
      actor: { type: "user", id: authCtx.userId },
      target: { type: AuditResourceType.API, id: "admin:interview:pending:ticker-setting:create" },
      metadata: {
        eventType: "INTERVIEW_PENDING_TICKER_SETTING_CREATED",
        description: "Interview pending ticker setting created.",
        changedFields,
        diff,
      },
    });

    return json.created({
      message: "Interview pending ticker setting saved successfully.",
      setting: created,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export const GET = withAuditRoute("GET", GETHandler);
export const POST = withAuditRoute("POST", POSTHandler);

import { ApiError, handleApiError, json } from "@/app/lib/http";
import { requireAdmin } from "@/app/lib/authz";
import {
  getSsbUploadCourseWindow,
  listSsbUploadVisibilitySettings,
  saveSsbUploadVisibilitySettings,
} from "@/app/db/queries/ssb-upload-visibility-settings";
import {
  ssbUploadVisibilitySettingsQuerySchema,
  ssbUploadVisibilitySettingsSaveSchema,
} from "@/app/lib/validators.ssb-upload-visibility-settings";
import { addIsoDays } from "@/app/lib/ssb-upload-visibility";
import { AuditEventType, AuditResourceType, type AuditNextRequest, withAuditRoute } from "@/lib/audit";

export const runtime = "nodejs";

async function GETHandler(req: AuditNextRequest) {
  try {
    const authCtx = await requireAdmin(req);
    const parsed = ssbUploadVisibilitySettingsQuerySchema.safeParse({
      courseId: new URL(req.url).searchParams.get("courseId") ?? undefined,
    });
    if (!parsed.success) return json.badRequest("Validation failed.", { issues: parsed.error.flatten() });

    const [courseWindow, settings] = await Promise.all([
      getSsbUploadCourseWindow(parsed.data.courseId),
      listSsbUploadVisibilitySettings(parsed.data.courseId),
    ]);

    await req.audit.log({
      action: AuditEventType.API_REQUEST,
      outcome: "SUCCESS",
      actor: { type: "user", id: authCtx.userId },
      target: { type: AuditResourceType.COURSE, id: parsed.data.courseId },
      metadata: { description: "SSB upload visibility settings retrieved.", module: "ssb-upload", count: settings.length },
    });

    return json.ok({ message: "SSB upload visibility settings retrieved successfully.", courseWindow, settings });
  } catch (error) {
    return handleApiError(error);
  }
}

async function POSTHandler(req: AuditNextRequest) {
  try {
    const authCtx = await requireAdmin(req);
    const parsed = ssbUploadVisibilitySettingsSaveSchema.safeParse(await req.json());
    if (!parsed.success) return json.badRequest("Validation failed.", { issues: parsed.error.flatten() });

    const courseWindow = await getSsbUploadCourseWindow(parsed.data.courseId);
    if (!courseWindow.courseStartDate) {
      throw new ApiError(400, "Course start date is required before saving SSB upload visibility settings.", "missing_course_start_date");
    }
    const minVisibleUntil = courseWindow.defaultVisibleUntil ?? courseWindow.courseStartDate;
    for (const setting of parsed.data.settings) {
      const visibleFrom = addIsoDays(courseWindow.courseStartDate, setting.hiddenDays);
      if (setting.visibleUntil < minVisibleUntil) {
        throw new ApiError(400, "Visible until must be on or after one day after the course end date.", "invalid_visible_until");
      }
      if (visibleFrom && setting.visibleUntil < visibleFrom) {
        throw new ApiError(400, "Visible until must be on or after the configured visible-from date.", "invalid_visible_until");
      }
    }

    const settings = await saveSsbUploadVisibilitySettings({ ...parsed.data, actorUserId: authCtx.userId });
    await req.audit.log({
      action: AuditEventType.USER_UPDATED,
      outcome: "SUCCESS",
      actor: { type: "user", id: authCtx.userId },
      target: { type: AuditResourceType.COURSE, id: parsed.data.courseId },
      metadata: { description: "SSB upload visibility settings saved.", module: "ssb-upload", count: settings.length },
    });

    return json.ok({ message: "SSB upload visibility settings saved successfully.", courseWindow, settings });
  } catch (error) {
    return handleApiError(error);
  }
}

export const GET = withAuditRoute("GET", GETHandler);
export const POST = withAuditRoute("POST", POSTHandler);

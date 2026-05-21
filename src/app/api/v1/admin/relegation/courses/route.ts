import { handleApiError, json } from "@/app/lib/http";
import { listRelegationTargetCourses } from "@/app/db/queries/relegation";
import { relegationCoursesQuerySchema } from "@/app/lib/validators.relegation";
import { getRelegationAccessContext } from "@/app/lib/relegation-auth";
import {
  AuditEventType,
  AuditResourceType,
  type AuditNextRequest,
  withAuditRoute,
} from "@/lib/audit";

export const runtime = "nodejs";

async function GETHandler(req: AuditNextRequest) {
  try {
    const access = await getRelegationAccessContext(req);

    const searchParams = new URL(req.url).searchParams;
    const parsed = relegationCoursesQuerySchema.safeParse({
      currentCourseId: searchParams.get("currentCourseId") ?? undefined,
      mode: searchParams.get("mode") ?? undefined,
    });

    if (!parsed.success) {
      return json.badRequest("Validation failed.", { issues: parsed.error.flatten() });
    }

    const items = await listRelegationTargetCourses(parsed.data.currentCourseId, parsed.data.mode);

    await req.audit.log({
      action: AuditEventType.API_REQUEST,
      outcome: "SUCCESS",
      actor: { type: "user", id: access.userId },
      target: { type: AuditResourceType.API, id: "admin:relegation:courses:read" },
      metadata: {
        description: "Target courses for relegation retrieved.",
        currentCourseId: parsed.data.currentCourseId,
        mode: parsed.data.mode,
        count: items.length,
      },
    });

    return json.ok({
      message: "Target courses retrieved successfully.",
      items,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export const GET = withAuditRoute("GET", GETHandler);

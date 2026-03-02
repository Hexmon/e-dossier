import { handleApiError, json } from "@/app/lib/http";
import { listImmediateNextCourses } from "@/app/db/queries/relegation";
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
    });

    if (!parsed.success) {
      return json.badRequest("Validation failed.", { issues: parsed.error.flatten() });
    }

    const items = await listImmediateNextCourses(parsed.data.currentCourseId);

    await req.audit.log({
      action: AuditEventType.API_REQUEST,
      outcome: "SUCCESS",
      actor: { type: "user", id: access.userId },
      target: { type: AuditResourceType.API, id: "admin:relegation:courses:read" },
      metadata: {
        description: "Immediate next courses for relegation retrieved.",
        currentCourseId: parsed.data.currentCourseId,
        count: items.length,
      },
    });

    return json.ok({
      message: "Immediate next courses retrieved successfully.",
      items,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export const GET = withAuditRoute("GET", GETHandler);

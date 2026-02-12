import { requireAdmin } from "@/app/lib/authz";
import { handleApiError, json } from "@/app/lib/http";
import { listImmediateNextCourses } from "@/app/db/queries/relegation";
import { relegationCoursesQuerySchema } from "@/app/lib/validators.relegation";
import { withAuthz } from "@/app/lib/acx/withAuthz";
import {
  AuditEventType,
  AuditResourceType,
  type AuditNextRequest,
  withAuditRoute,
} from "@/lib/audit";

export const runtime = "nodejs";

async function GETHandler(req: AuditNextRequest) {
  try {
    const auth = await requireAdmin(req);

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
      actor: { type: "user", id: auth.userId },
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

export const GET = withAuditRoute("GET", withAuthz(GETHandler));

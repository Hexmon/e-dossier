import { handleApiError, json } from "@/app/lib/http";
import { promoteCourseBatch } from "@/app/db/queries/relegation";
import { relegationPromoteCourseSchema } from "@/app/lib/validators.relegation";
import { assertCanPromoteBatch, getRelegationAccessContext } from "@/app/lib/relegation-auth";
import {
  AuditEventType,
  AuditResourceType,
  type AuditNextRequest,
  withAuditRoute,
} from "@/lib/audit";

export const runtime = "nodejs";

async function POSTHandler(req: AuditNextRequest) {
  try {
    const access = await getRelegationAccessContext(req);
    assertCanPromoteBatch(access);

    const parsed = relegationPromoteCourseSchema.safeParse(await req.json());
    if (!parsed.success) {
      return json.badRequest("Validation failed.", { issues: parsed.error.flatten() });
    }

    const result = await promoteCourseBatch(parsed.data, access.userId);

    await req.audit.log({
      action: AuditEventType.API_REQUEST,
      outcome: "SUCCESS",
      actor: { type: "user", id: access.userId },
      target: { type: AuditResourceType.API, id: "admin:relegation:promote-course:create" },
      metadata: {
        description: `Semester promotion batch executed for ${result.fromCourse.courseCode} from semester ${result.fromSemester} to ${result.toSemester}`,
        fromCourseId: parsed.data.fromCourseId,
        fromSemester: parsed.data.fromSemester,
        toSemester: result.toSemester,
        ...result.summary,
      },
    });

    return json.ok({
      message: "Semester promotion completed successfully.",
      result,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export const POST = withAuditRoute("POST", POSTHandler);

import { handleApiError, json } from "@/app/lib/http";
import { recordPromotionException } from "@/app/db/queries/relegation";
import { relegationExceptionSchema } from "@/app/lib/validators.relegation";
import { assertCanWriteSingle, getRelegationAccessContext } from "@/app/lib/relegation-auth";
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
    assertCanWriteSingle(access);

    const parsed = relegationExceptionSchema.safeParse(await req.json());
    if (!parsed.success) {
      return json.badRequest("Validation failed.", { issues: parsed.error.flatten() });
    }

    const result = await recordPromotionException(parsed.data, access.userId, {
      scopePlatoonId: access.scopePlatoonId,
    });

    await req.audit.log({
      action: AuditEventType.API_REQUEST,
      outcome: "SUCCESS",
      actor: { type: "user", id: access.userId },
      target: { type: AuditResourceType.OC, id: result.oc.ocId },
      metadata: {
        description: `Promotion exception recorded for OC ${result.oc.ocNo}`,
        ocId: result.oc.ocId,
        fromCourseId: result.fromCourse.courseId,
        toCourseId: result.toCourse.courseId,
        historyId: result.history.id,
        movementKind: result.history.movementKind,
      },
    });

    return json.created({
      message: "Promotion exception recorded successfully.",
      transfer: result,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export const POST = withAuditRoute("POST", POSTHandler);

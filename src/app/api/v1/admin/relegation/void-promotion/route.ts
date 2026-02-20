import { handleApiError, json } from "@/app/lib/http";
import { voidPromotionForOc } from "@/app/db/queries/relegation";
import { relegationVoidPromotionSchema } from "@/app/lib/validators.relegation";
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

    const parsed = relegationVoidPromotionSchema.safeParse(await req.json());
    if (!parsed.success) {
      return json.badRequest("Validation failed.", { issues: parsed.error.flatten() });
    }

    const result = await voidPromotionForOc(parsed.data, access.userId, {
      scopePlatoonId: access.scopePlatoonId,
    });

    await req.audit.log({
      action: AuditEventType.API_REQUEST,
      outcome: "SUCCESS",
      actor: { type: "user", id: access.userId },
      target: { type: AuditResourceType.OC, id: result.oc.ocId },
      metadata: {
        description: `Promotion voided for OC ${result.oc.ocNo}`,
        ocId: result.oc.ocId,
        fromCourseId: result.fromCourse.courseId,
        toCourseId: result.toCourse.courseId,
        historyId: result.history.id,
        movementKind: result.history.movementKind,
      },
    });

    return json.ok({
      message: "Promotion voided successfully.",
      transfer: result,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export const POST = withAuditRoute("POST", POSTHandler);

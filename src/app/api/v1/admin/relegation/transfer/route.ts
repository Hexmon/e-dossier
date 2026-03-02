import { handleApiError, json } from "@/app/lib/http";
import { applyOcRelegationTransfer } from "@/app/db/queries/relegation";
import { relegationTransferSchema } from "@/app/lib/validators.relegation";
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
    const parsed = relegationTransferSchema.safeParse(await req.json());

    if (!parsed.success) {
      return json.badRequest("Validation failed.", { issues: parsed.error.flatten() });
    }

    const transfer = await applyOcRelegationTransfer(parsed.data, access.userId, {
      scopePlatoonId: access.scopePlatoonId,
    });

    await req.audit.log({
      action: AuditEventType.OC_RELEGATED,
      outcome: "SUCCESS",
      actor: { type: "user", id: access.userId },
      target: { type: AuditResourceType.OC, id: transfer.oc.ocId },
      metadata: {
        description: `OC ${transfer.oc.ocNo} relegated from ${transfer.fromCourse.courseCode} to ${transfer.toCourse.courseCode}`,
        ocId: transfer.oc.ocId,
        fromCourseId: transfer.fromCourse.courseId,
        fromCourseCode: transfer.fromCourse.courseCode,
        toCourseId: transfer.toCourse.courseId,
        toCourseCode: transfer.toCourse.courseCode,
        reason: parsed.data.reason,
        remark: parsed.data.remark ?? null,
        pdfObjectKey: parsed.data.pdfObjectKey ?? null,
        pdfUrl: parsed.data.pdfUrl ?? null,
        historyId: transfer.history.id,
      },
    });

    return json.created({
      message: "Officer Cadet relegated successfully.",
      transfer,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export const POST = withAuditRoute("POST", POSTHandler);

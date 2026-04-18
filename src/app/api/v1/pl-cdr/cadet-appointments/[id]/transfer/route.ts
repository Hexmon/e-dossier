import { IdSchema } from "@/app/lib/apiClient";
import { requirePlatoonCommanderScope } from "@/app/lib/platoon-commander-auth";
import { cadetAppointmentTransferSchema } from "@/app/lib/validators";
import { transferCadetAppointment } from "@/app/db/queries/cadet-appointments";
import { handleApiError, json } from "@/app/lib/http";
import {
  AuditEventType,
  AuditResourceType,
  type AuditNextRequest,
  withAuditRoute,
} from "@/lib/audit";

export const runtime = "nodejs";

async function POSTHandler(
  req: AuditNextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authCtx = await requirePlatoonCommanderScope(req);
    const { id } = IdSchema.parse({ id: (await params).id });
    const parsed = cadetAppointmentTransferSchema.safeParse(await req.json());
    if (!parsed.success) {
      return json.badRequest("Validation failed.", {
        issues: parsed.error.flatten(),
      });
    }

    const transferred = await transferCadetAppointment({
      appointmentId: id,
      platoonId: authCtx.platoonId,
      actorUserId: authCtx.userId,
      newCadetId: parsed.data.newCadetId,
      prevEndsAt: new Date(parsed.data.prevEndsAt),
      newStartsAt: new Date(parsed.data.newStartsAt),
      reason: parsed.data.reason ?? null,
    });

    await req.audit.log({
      action: AuditEventType.APPOINTMENT_TRANSFERRED,
      outcome: "SUCCESS",
      actor: { type: "user", id: authCtx.userId },
      target: { type: AuditResourceType.APPOINTMENT, id },
      metadata: {
        description: `Transferred platoon cadet appointment ${id}`,
        platoonId: authCtx.platoonId,
        toCadetId: transferred.next.cadetId,
      },
      diff: { before: transferred.ended, after: transferred.next },
    });

    return json.ok({
      message: "Cadet appointment transferred successfully.",
      endedAppointment: transferred.ended,
      newAppointment: transferred.next,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export const POST = withAuditRoute("POST", POSTHandler);

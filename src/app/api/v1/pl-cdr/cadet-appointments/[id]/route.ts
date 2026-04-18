import {
  deleteCadetAppointment,
  getCadetAppointmentById,
  updateCadetAppointment,
} from "@/app/db/queries/cadet-appointments";
import { IdSchema } from "@/app/lib/apiClient";
import { requirePlatoonCommanderScope } from "@/app/lib/platoon-commander-auth";
import { cadetAppointmentUpdateSchema } from "@/app/lib/validators";
import { handleApiError, json } from "@/app/lib/http";
import {
  AuditEventType,
  AuditResourceType,
  type AuditNextRequest,
  withAuditRoute,
} from "@/lib/audit";

export const runtime = "nodejs";

async function GETHandler(
  req: AuditNextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authCtx = await requirePlatoonCommanderScope(req);
    const { id } = IdSchema.parse({ id: (await params).id });
    const row = await getCadetAppointmentById({
      appointmentId: id,
      platoonId: authCtx.platoonId,
    });

    return json.ok({
      message: "Cadet appointment retrieved successfully.",
      data: row,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

async function PATCHHandler(
  req: AuditNextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authCtx = await requirePlatoonCommanderScope(req);
    const { id } = IdSchema.parse({ id: (await params).id });
    const parsed = cadetAppointmentUpdateSchema.safeParse(await req.json());
    if (!parsed.success) {
      return json.badRequest("Validation failed.", {
        issues: parsed.error.flatten(),
      });
    }

    const updated = await updateCadetAppointment({
      appointmentId: id,
      platoonId: authCtx.platoonId,
      actorUserId: authCtx.userId,
      cadetId: parsed.data.cadetId,
      appointmentName: parsed.data.appointmentName,
      startsAt: parsed.data.startsAt,
      endsAt: parsed.data.endsAt,
      reason: parsed.data.reason,
    });

    await req.audit.log({
      action: AuditEventType.APPOINTMENT_UPDATED,
      outcome: "SUCCESS",
      actor: { type: "user", id: authCtx.userId },
      target: { type: AuditResourceType.APPOINTMENT, id },
      metadata: {
        description: `Updated platoon cadet appointment ${id}`,
        platoonId: authCtx.platoonId,
      },
      diff: { before: updated.before, after: updated.after },
    });

    return json.ok({
      message: "Cadet appointment updated successfully.",
      data: updated.after,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

async function DELETEHandler(
  req: AuditNextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authCtx = await requirePlatoonCommanderScope(req);
    const { id } = IdSchema.parse({ id: (await params).id });
    const deleted = await deleteCadetAppointment({
      appointmentId: id,
      platoonId: authCtx.platoonId,
      actorUserId: authCtx.userId,
    });

    await req.audit.log({
      action: AuditEventType.APPOINTMENT_DELETED,
      outcome: "SUCCESS",
      actor: { type: "user", id: authCtx.userId },
      target: { type: AuditResourceType.APPOINTMENT, id },
      metadata: {
        description: `Deleted platoon cadet appointment ${id}`,
        platoonId: authCtx.platoonId,
      },
      diff: { before: deleted, after: { ...deleted, deletedAt: new Date() } },
    });

    return json.ok({
      message: "Cadet appointment deleted successfully.",
      data: deleted,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export const GET = withAuditRoute("GET", GETHandler);
export const PATCH = withAuditRoute("PATCH", PATCHHandler);
export const DELETE = withAuditRoute("DELETE", DELETEHandler);

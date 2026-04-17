import {
  createCadetAppointment,
  getCadetAppointmentsDashboard,
} from "@/app/db/queries/cadet-appointments";
import { requirePlatoonCommanderScope } from "@/app/lib/platoon-commander-auth";
import { cadetAppointmentCreateSchema } from "@/app/lib/validators";
import { handleApiError, json } from "@/app/lib/http";
import {
  AuditEventType,
  AuditResourceType,
  type AuditNextRequest,
  withAuditRoute,
} from "@/lib/audit";

export const runtime = "nodejs";

async function GETHandler(req: AuditNextRequest) {
  try {
    const authCtx = await requirePlatoonCommanderScope(req);
    const data = await getCadetAppointmentsDashboard(authCtx.platoonId);

    await req.audit.log({
      action: AuditEventType.API_REQUEST,
      outcome: "SUCCESS",
      actor: { type: "user", id: authCtx.userId },
      target: {
        type: AuditResourceType.API,
        id: "pl-cdr:cadet-appointments:get",
      },
      metadata: {
        description: "Platoon cadet appointments dashboard retrieved.",
        platoonId: authCtx.platoonId,
        activeCount: data.activeAppointments.length,
        historyCount: data.historyAppointments.length,
        cadetCount: data.cadets.length,
      },
    });

    return json.ok({
      message: "Cadet appointments retrieved successfully.",
      ...data,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

async function POSTHandler(req: AuditNextRequest) {
  try {
    const authCtx = await requirePlatoonCommanderScope(req);
    const parsed = cadetAppointmentCreateSchema.safeParse(await req.json());
    if (!parsed.success) {
      return json.badRequest("Validation failed.", {
        issues: parsed.error.flatten(),
      });
    }

    const created = await createCadetAppointment({
      platoonId: authCtx.platoonId,
      cadetId: parsed.data.cadetId,
      appointmentName: parsed.data.appointmentName,
      startsAt: parsed.data.startsAt,
      reason: parsed.data.reason ?? null,
      actorUserId: authCtx.userId,
    });

    await req.audit.log({
      action: AuditEventType.APPOINTMENT_CREATED,
      outcome: "SUCCESS",
      actor: { type: "user", id: authCtx.userId },
      target: { type: AuditResourceType.APPOINTMENT, id: created.id },
      metadata: {
        description: `Created platoon cadet appointment ${created.id}`,
        platoonId: authCtx.platoonId,
        cadetId: created.cadetId,
        appointmentName: created.appointmentName,
      },
      diff: { after: created },
    });

    return json.created({
      message: "Cadet appointment created successfully.",
      data: created,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export const GET = withAuditRoute("GET", GETHandler);
export const POST = withAuditRoute("POST", POSTHandler);

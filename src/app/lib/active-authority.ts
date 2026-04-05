import { ApiError } from "@/app/lib/http";
import {
  getActiveAppointmentAuthority,
  getActiveDelegationAuthority,
} from "@/app/lib/effective-authority";

export async function assertActiveAuthorityFromPayload(payload: Record<string, any>) {
  const subject = payload?.sub ? String(payload.sub) : "";
  const apt = payload?.apt ?? null;
  const appointmentId = apt?.id ? String(apt.id) : "";
  const authorityKind = String(apt?.auth_kind ?? "APPOINTMENT").toUpperCase();
  const position = apt?.position ? String(apt.position) : "";
  const scopeType = apt?.scope?.type ? String(apt.scope.type) : "";
  const scopeId = apt?.scope?.id == null ? null : String(apt.scope.id);

  if (!subject || !appointmentId) {
    return;
  }

  if (authorityKind === "DELEGATION" || apt?.delegation_id) {
    const delegationId = apt?.delegation_id ? String(apt.delegation_id) : "";
    if (!delegationId) {
      throw new ApiError(
        401,
        "Delegated authority is no longer active. Please log in again.",
        "authority_inactive"
      );
    }

    const delegation = await getActiveDelegationAuthority(delegationId);
    if (
      !delegation ||
      delegation.userId !== subject ||
      delegation.appointmentId !== appointmentId ||
      delegation.positionKey !== position ||
      delegation.scopeType !== scopeType ||
      (delegation.scopeId ?? null) !== scopeId
    ) {
      throw new ApiError(
        401,
        "Delegated authority is no longer active. Please log in again.",
        "authority_inactive"
      );
    }

    return;
  }

  const appointment = await getActiveAppointmentAuthority(appointmentId);
  if (
    !appointment ||
    appointment.userId !== subject ||
    appointment.positionKey !== position ||
    appointment.scopeType !== scopeType ||
    (appointment.scopeId ?? null) !== scopeId
  ) {
    throw new ApiError(
      401,
      "Selected appointment is no longer active. Please log in again.",
      "authority_inactive"
    );
  }
}

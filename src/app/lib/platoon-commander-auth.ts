import { requireAuth } from "@/app/lib/authz";
import { ApiError } from "@/app/lib/http";
import { canManageCadetAppointments } from "@/lib/platoon-commander-access";

import type { AuditNextRequest } from "@/lib/audit";

export type PlatoonCommanderScopeContext = {
  userId: string;
  platoonId: string;
  position: string | null;
  roles: string[];
};

export async function requirePlatoonCommanderScope(
  req: AuditNextRequest
): Promise<PlatoonCommanderScopeContext> {
  const authCtx = await requireAuth(req);
  const position =
    typeof authCtx.claims?.apt?.position === "string"
      ? authCtx.claims.apt.position
      : null;
  const scopeType =
    typeof authCtx.claims?.apt?.scope?.type === "string"
      ? authCtx.claims.apt.scope.type
      : null;
  const scopeId =
    typeof authCtx.claims?.apt?.scope?.id === "string"
      ? authCtx.claims.apt.scope.id
      : null;

  if (
    !canManageCadetAppointments({
      roles: authCtx.roles ?? [],
      position,
      scopeType,
    }) ||
    !scopeId
  ) {
    throw new ApiError(
      403,
      "Forbidden: platoon commander access required.",
      "forbidden"
    );
  }

  return {
    userId: authCtx.userId,
    platoonId: scopeId,
    position,
    roles: authCtx.roles ?? [],
  };
}

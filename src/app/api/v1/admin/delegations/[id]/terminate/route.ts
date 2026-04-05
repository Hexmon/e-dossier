import { and, eq, isNull } from "drizzle-orm";

import { db } from "@/app/db/client";
import { delegations } from "@/app/db/schema/auth/delegations";
import { IdSchema } from "@/app/lib/apiClient";
import { requireAdmin } from "@/app/lib/authz";
import { handleApiError, json, ApiError } from "@/app/lib/http";
import { delegationTerminateSchema } from "@/app/lib/validators.delegation";
import { terminateDelegation } from "@/app/db/queries/delegations";
import {
  assertCanManageAppointmentRecord,
  assertCanManageUser,
} from "@/app/lib/admin-boundaries";
import {
  AuditEventType,
  AuditResourceType,
  computeDiff,
  type AuditNextRequest,
  withAuditRoute,
} from "@/lib/audit";

export const runtime = "nodejs";

async function PATCHHandler(
  req: AuditNextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authCtx = await requireAdmin(req);
    const { id: rawId } = await params;
    const { id } = IdSchema.parse({ id: decodeURIComponent(rawId ?? "").trim() });
    const parsed = delegationTerminateSchema.safeParse(await req.json());

    if (!parsed.success) {
      return json.badRequest("Validation failed.", { issues: parsed.error.flatten() });
    }

    const [delegation] = await db
      .select({
        id: delegations.id,
        grantorAppointmentId: delegations.grantorAppointmentId,
        granteeUserId: delegations.granteeUserId,
      })
      .from(delegations)
      .where(and(eq(delegations.id, id), isNull(delegations.deletedAt)))
      .limit(1);

    if (!delegation) {
      throw new ApiError(404, "Delegation not found.", "not_found");
    }

    if (delegation.grantorAppointmentId) {
      await assertCanManageAppointmentRecord(authCtx, delegation.grantorAppointmentId);
    }
    await assertCanManageUser(authCtx, delegation.granteeUserId);

    const { before, after } = await terminateDelegation({
      delegationId: id,
      actorUserId: authCtx.userId,
      reason: parsed.data.reason,
    });
    const { changedFields, diff } = computeDiff(before as any, after as any);

    await req.audit.log({
      action: AuditEventType.DELEGATION_REVOKED,
      outcome: "SUCCESS",
      actor: { type: "user", id: authCtx.userId },
      target: { type: AuditResourceType.DELEGATION, id },
      metadata: {
        description: "Delegation terminated.",
        changedFields,
      },
      diff: diff ?? undefined,
    });

    return json.ok({
      message: "Delegation terminated successfully.",
      item: after,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export const PATCH = withAuditRoute("PATCH", PATCHHandler);

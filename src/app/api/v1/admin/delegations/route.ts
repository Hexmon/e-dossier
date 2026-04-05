import { eq } from "drizzle-orm";

import { db } from "@/app/db/client";
import { delegations } from "@/app/db/schema/auth/delegations";
import { requireAdmin } from "@/app/lib/authz";
import { handleApiError, json } from "@/app/lib/http";
import { delegationCreateSchema } from "@/app/lib/validators.delegation";
import { createDelegation, listDelegations } from "@/app/db/queries/delegations";
import {
  assertCanManageAppointmentRecord,
  assertCanManageUser,
} from "@/app/lib/admin-boundaries";
import {
  AuditEventType,
  AuditResourceType,
  type AuditNextRequest,
  withAuditRoute,
} from "@/lib/audit";

export const runtime = "nodejs";

async function GETHandler(req: AuditNextRequest) {
  try {
    const authCtx = await requireAdmin(req);
    const url = new URL(req.url);
    const activeOnly = (url.searchParams.get("activeOnly") ?? "true").toLowerCase() !== "false";
    const items = await listDelegations({ activeOnly });

    await req.audit.log({
      action: AuditEventType.API_REQUEST,
      outcome: "SUCCESS",
      actor: { type: "user", id: authCtx.userId },
      target: { type: AuditResourceType.DELEGATION, id: "collection" },
      metadata: {
        description: "Delegations retrieved.",
        count: items.length,
        activeOnly,
      },
    });

    return json.ok({
      message: "Delegations retrieved successfully.",
      items,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

async function POSTHandler(req: AuditNextRequest) {
  try {
    const authCtx = await requireAdmin(req);
    const parsed = delegationCreateSchema.safeParse(await req.json());

    if (!parsed.success) {
      return json.badRequest("Validation failed.", { issues: parsed.error.flatten() });
    }

    await assertCanManageAppointmentRecord(authCtx, parsed.data.grantorAppointmentId);
    await assertCanManageUser(authCtx, parsed.data.granteeUserId);

    const created = await createDelegation({
      actorUserId: authCtx.userId,
      grantorAppointmentId: parsed.data.grantorAppointmentId,
      granteeUserId: parsed.data.granteeUserId,
      startsAt: parsed.data.startsAt,
      endsAt: parsed.data.endsAt ?? null,
      reason: parsed.data.reason,
    });

    const [item] = await db
      .select()
      .from(delegations)
      .where(eq(delegations.id, created.id))
      .limit(1);

    await req.audit.log({
      action: AuditEventType.DELEGATION_CREATED,
      outcome: "SUCCESS",
      actor: { type: "user", id: authCtx.userId },
      target: { type: AuditResourceType.DELEGATION, id: created.id },
      metadata: {
        description: "Delegation created.",
        delegationId: created.id,
        grantorAppointmentId: created.grantorAppointmentId,
        granteeUserId: created.granteeUserId,
      },
      diff: { after: item ?? created },
    });

    return json.created({
      message: "Delegation created successfully.",
      item: item ?? created,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export const GET = withAuditRoute("GET", GETHandler);
export const POST = withAuditRoute("POST", POSTHandler);

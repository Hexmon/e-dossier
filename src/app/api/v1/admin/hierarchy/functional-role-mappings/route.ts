import { eq } from "drizzle-orm";

import { db } from "@/app/db/client";
import { positions } from "@/app/db/schema/auth/positions";
import { requireAdmin } from "@/app/lib/authz";
import { handleApiError, json, ApiError } from "@/app/lib/http";
import { functionalRoleMappingUpdateSchema } from "@/app/lib/validators.hierarchy";
import {
  getCommanderEquivalentMapping,
  resolveCommanderEquivalentMapping,
  updateCommanderEquivalentMapping,
} from "@/app/db/queries/functional-role-mappings";
import { deriveSidebarRoleGroup } from "@/lib/sidebar-visibility";
import { isProtectedSystemPositionId } from "@/app/lib/admin-boundaries";
import {
  AuditEventType,
  AuditResourceType,
  computeDiff,
  type AuditNextRequest,
  withAuditRoute,
} from "@/lib/audit";

export const runtime = "nodejs";

function isSuperAdmin(authCtx: Awaited<ReturnType<typeof requireAdmin>>) {
  return (
    deriveSidebarRoleGroup({
      roles: authCtx.roles,
      position: authCtx.claims?.apt?.position ?? null,
    }) === "SUPER_ADMIN"
  );
}

async function GETHandler(req: AuditNextRequest) {
  try {
    const authCtx = await requireAdmin(req);
    const [configured, effective] = await Promise.all([
      getCommanderEquivalentMapping(),
      resolveCommanderEquivalentMapping(),
    ]);

    await req.audit.log({
      action: AuditEventType.API_REQUEST,
      outcome: "SUCCESS",
      actor: { type: "user", id: authCtx.userId },
      target: { type: AuditResourceType.API, id: "admin:hierarchy:functional-role-mappings:get" },
      metadata: {
        description: "Functional role mapping retrieved.",
      },
    });

    return json.ok({
      message: "Functional role mapping retrieved successfully.",
      configured,
      effective,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

async function PUTHandler(req: AuditNextRequest) {
  try {
    const authCtx = await requireAdmin(req);
    const parsed = functionalRoleMappingUpdateSchema.safeParse(await req.json());

    if (!parsed.success) {
      return json.badRequest("Validation failed.", { issues: parsed.error.flatten() });
    }

    const nextPositionId = parsed.data.commanderEquivalentPositionId;
    const actorIsSuperAdmin = isSuperAdmin(authCtx);

    if (!nextPositionId && !actorIsSuperAdmin) {
      throw new ApiError(
        403,
        "Only SUPER_ADMIN can clear the commander-equivalent mapping.",
        "forbidden"
      );
    }

    if (nextPositionId) {
      const [position] = await db
        .select({
          id: positions.id,
          key: positions.key,
          defaultScope: positions.defaultScope,
        })
        .from(positions)
        .where(eq(positions.id, nextPositionId))
        .limit(1);

      if (!position) {
        throw new ApiError(400, "Position not found.", "bad_request");
      }

      if (!actorIsSuperAdmin) {
        if (position.defaultScope !== "PLATOON") {
          throw new ApiError(
            403,
            "ADMIN can only map commander-equivalent authority to platoon-scoped positions.",
            "forbidden"
          );
        }

        if (await isProtectedSystemPositionId(position.id)) {
          throw new ApiError(
            403,
            "ADMIN cannot map commander-equivalent authority to protected system positions.",
            "forbidden"
          );
        }
      }
    }

    const { before, after } = await updateCommanderEquivalentMapping(nextPositionId, authCtx.userId);
    const { changedFields, diff } = computeDiff(before as any, after as any);

    await req.audit.log({
      action: AuditEventType.POSITION_UPDATED,
      outcome: "SUCCESS",
      actor: { type: "user", id: authCtx.userId },
      target: { type: AuditResourceType.API, id: "admin:hierarchy:functional-role-mappings:put" },
      metadata: {
        description: "Commander-equivalent functional role mapping updated.",
        changedFields,
      },
      diff: diff ?? undefined,
    });

    return json.ok({
      message: "Functional role mapping updated successfully.",
      mapping: after,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export const GET = withAuditRoute("GET", GETHandler);
export const PUT = withAuditRoute("PUT", PUTHandler);

import { requireAdmin } from "@/app/lib/authz";
import { reorderHierarchyNodes } from "@/app/db/queries/hierarchy";
import { handleApiError, json } from "@/app/lib/http";
import { hierarchyNodeReorderSchema } from "@/app/lib/validators.hierarchy";
import {
  AuditEventType,
  AuditResourceType,
  type AuditNextRequest,
  withAuditRoute,
} from "@/lib/audit";

export const runtime = "nodejs";

async function PATCHHandler(req: AuditNextRequest) {
  try {
    const authCtx = await requireAdmin(req);
    const parsed = hierarchyNodeReorderSchema.safeParse(await req.json());

    if (!parsed.success) {
      return json.badRequest("Validation failed.", { issues: parsed.error.flatten() });
    }

    const items = await reorderHierarchyNodes(parsed.data.items, authCtx.userId);

    await req.audit.log({
      action: AuditEventType.USER_UPDATED,
      outcome: "SUCCESS",
      actor: { type: "user", id: authCtx.userId },
      target: { type: AuditResourceType.API, id: "admin:hierarchy:nodes:reorder" },
      metadata: {
        eventType: "HIERARCHY_REORDERED",
        description: "Hierarchy nodes reordered.",
        items: parsed.data.items,
      },
    });

    return json.ok({
      message: "Hierarchy nodes reordered successfully.",
      items,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export const PATCH = withAuditRoute("PATCH", PATCHHandler);

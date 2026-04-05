import { IdSchema } from "@/app/lib/apiClient";
import { requireAdmin } from "@/app/lib/authz";
import { handleApiError, json } from "@/app/lib/http";
import { hierarchyNodeUpdateSchema } from "@/app/lib/validators.hierarchy";
import { deleteHierarchyNode, updateHierarchyNode } from "@/app/db/queries/hierarchy";
import {
  AuditEventType,
  AuditResourceType,
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
    const parsed = hierarchyNodeUpdateSchema.safeParse(await req.json());

    if (!parsed.success) {
      return json.badRequest("Validation failed.", { issues: parsed.error.flatten() });
    }

    const updated = await updateHierarchyNode(id, parsed.data, authCtx.userId);

    await req.audit.log({
      action: AuditEventType.API_REQUEST,
      outcome: "SUCCESS",
      actor: { type: "user", id: authCtx.userId },
      target: { type: AuditResourceType.API, id: "admin:hierarchy:nodes:patch" },
      metadata: {
        description: "Hierarchy node updated.",
        nodeId: updated.id,
      },
    });

    return json.ok({
      message: "Hierarchy node updated successfully.",
      item: updated,
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
    const authCtx = await requireAdmin(req);
    const { id: rawId } = await params;
    const { id } = IdSchema.parse({ id: decodeURIComponent(rawId ?? "").trim() });

    const deleted = await deleteHierarchyNode(id, authCtx.userId);

    await req.audit.log({
      action: AuditEventType.API_REQUEST,
      outcome: "SUCCESS",
      actor: { type: "user", id: authCtx.userId },
      target: { type: AuditResourceType.API, id: "admin:hierarchy:nodes:delete" },
      metadata: {
        description: "Hierarchy node deleted.",
        nodeId: deleted.id,
      },
    });

    return json.ok({
      message: "Hierarchy node deleted successfully.",
      item: deleted,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export const PATCH = withAuditRoute("PATCH", PATCHHandler);
export const DELETE = withAuditRoute("DELETE", DELETEHandler);

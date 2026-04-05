import { requireAdmin } from "@/app/lib/authz";
import { handleApiError, json } from "@/app/lib/http";
import { hierarchyNodeInputSchema } from "@/app/lib/validators.hierarchy";
import { createHierarchyNode, listHierarchyNodes } from "@/app/db/queries/hierarchy";
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
    const items = await listHierarchyNodes();

    await req.audit.log({
      action: AuditEventType.API_REQUEST,
      outcome: "SUCCESS",
      actor: { type: "user", id: authCtx.userId },
      target: { type: AuditResourceType.API, id: "admin:hierarchy:nodes:get" },
      metadata: {
        description: "Hierarchy nodes retrieved.",
        count: items.length,
      },
    });

    return json.ok({
      message: "Hierarchy nodes retrieved successfully.",
      items,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

async function POSTHandler(req: AuditNextRequest) {
  try {
    const authCtx = await requireAdmin(req);
    const parsed = hierarchyNodeInputSchema.safeParse(await req.json());

    if (!parsed.success) {
      return json.badRequest("Validation failed.", { issues: parsed.error.flatten() });
    }

    const created = await createHierarchyNode(parsed.data, authCtx.userId);

    await req.audit.log({
      action: AuditEventType.API_REQUEST,
      outcome: "SUCCESS",
      actor: { type: "user", id: authCtx.userId },
      target: { type: AuditResourceType.API, id: "admin:hierarchy:nodes:post" },
      metadata: {
        description: "Hierarchy node created.",
        nodeId: created.id,
        nodeType: created.nodeType,
      },
    });

    return json.created({
      message: "Hierarchy node created successfully.",
      item: created,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export const GET = withAuditRoute("GET", GETHandler);
export const POST = withAuditRoute("POST", POSTHandler);

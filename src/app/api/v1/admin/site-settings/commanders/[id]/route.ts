import { z } from "zod";

import { requireAdmin } from "@/app/lib/authz";
import { handleApiError, json } from "@/app/lib/http";
import { commanderUpdateSchema } from "@/app/lib/validators.site-settings";
import {
  getSiteCommanderById,
  softDeleteSiteCommander,
  updateSiteCommander,
} from "@/app/db/queries/site-settings";
import {
  AuditEventType,
  AuditResourceType,
  computeDiff,
  type AuditNextRequest,
  withAuditRoute,
} from "@/lib/audit";

export const runtime = "nodejs";

const Params = z.object({
  id: z.string().uuid(),
});

async function GETHandler(req: AuditNextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAdmin(req);
    const { id } = Params.parse(await params);

    const item = await getSiteCommanderById(id, { includeDeleted: true });
    if (!item) {
      return json.notFound("Commander not found.");
    }

    await req.audit.log({
      action: AuditEventType.API_REQUEST,
      outcome: "SUCCESS",
      actor: { type: "user", id: auth.userId },
      target: { type: AuditResourceType.API, id: "admin:site-settings:commanders:get" },
      metadata: {
        description: "Commander entry retrieved.",
        commanderId: id,
      },
    });

    return json.ok({ message: "Commander retrieved successfully.", item });
  } catch (error) {
    return handleApiError(error);
  }
}

async function PUTHandler(req: AuditNextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAdmin(req);
    const { id } = Params.parse(await params);

    const parsed = commanderUpdateSchema.safeParse(await req.json());
    if (!parsed.success) {
      return json.badRequest("Validation failed.", { issues: parsed.error.flatten() });
    }

    const result = await updateSiteCommander(id, parsed.data);
    if (!result) {
      return json.notFound("Commander not found.");
    }

    const { changedFields, diff } = computeDiff(result.before as any, result.after as any);

    await req.audit.log({
      action: AuditEventType.USER_UPDATED,
      outcome: "SUCCESS",
      actor: { type: "user", id: auth.userId },
      target: { type: AuditResourceType.API, id: "admin:site-settings:commanders:update" },
      metadata: {
        eventType: "SITE_COMMANDER_UPDATED",
        description: "Commander entry updated.",
        commanderId: id,
        changedFields,
        diff,
      },
    });

    return json.ok({ message: "Commander updated successfully.", item: result.after });
  } catch (error) {
    return handleApiError(error);
  }
}

async function DELETEHandler(
  req: AuditNextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin(req);
    const { id } = Params.parse(await params);

    const result = await softDeleteSiteCommander(id);
    if (!result) {
      return json.notFound("Commander not found.");
    }

    await req.audit.log({
      action: AuditEventType.USER_DELETED,
      outcome: "SUCCESS",
      actor: { type: "user", id: auth.userId },
      target: { type: AuditResourceType.API, id: "admin:site-settings:commanders:delete" },
      metadata: {
        eventType: "SITE_COMMANDER_SOFT_DELETED",
        description: "Commander entry soft deleted.",
        commanderId: id,
      },
    });

    return json.ok({
      message: "Commander soft-deleted successfully.",
      item: result.after,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export const GET = withAuditRoute("GET", GETHandler);
export const PUT = withAuditRoute("PUT", PUTHandler);
export const DELETE = withAuditRoute("DELETE", DELETEHandler);

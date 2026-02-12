import { z } from "zod";

import { requireAdmin } from "@/app/lib/authz";
import {
  getSiteHistoryById,
  softDeleteSiteHistory,
  updateSiteHistory,
} from "@/app/db/queries/site-settings";
import { handleApiError, json } from "@/app/lib/http";
import { historyUpdateSchema } from "@/app/lib/validators.site-settings";
import {
  AuditEventType,
  AuditResourceType,
  computeDiff,
  type AuditNextRequest,
  withAuditRoute,
} from "@/lib/audit";

export const runtime = "nodejs";

const Params = z.object({ id: z.string().uuid() });

async function GETHandler(req: AuditNextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAdmin(req);
    const { id } = Params.parse(await params);

    const item = await getSiteHistoryById(id, { includeDeleted: true });
    if (!item) {
      return json.notFound("History entry not found.");
    }

    await req.audit.log({
      action: AuditEventType.API_REQUEST,
      outcome: "SUCCESS",
      actor: { type: "user", id: auth.userId },
      target: { type: AuditResourceType.API, id: "admin:site-settings:history:get" },
      metadata: {
        description: "History entry retrieved.",
        historyId: id,
      },
    });

    return json.ok({ message: "History entry retrieved successfully.", item });
  } catch (error) {
    return handleApiError(error);
  }
}

async function PUTHandler(req: AuditNextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAdmin(req);
    const { id } = Params.parse(await params);

    const parsed = historyUpdateSchema.safeParse(await req.json());
    if (!parsed.success) {
      return json.badRequest("Validation failed.", { issues: parsed.error.flatten() });
    }

    const result = await updateSiteHistory(id, parsed.data);
    if (!result) {
      return json.notFound("History entry not found.");
    }

    const { changedFields, diff } = computeDiff(result.before as any, result.after as any);

    await req.audit.log({
      action: AuditEventType.USER_UPDATED,
      outcome: "SUCCESS",
      actor: { type: "user", id: auth.userId },
      target: { type: AuditResourceType.API, id: "admin:site-settings:history:update" },
      metadata: {
        eventType: "SITE_HISTORY_UPDATED",
        description: "History entry updated.",
        historyId: id,
        changedFields,
        diff,
      },
    });

    return json.ok({ message: "History entry updated successfully.", item: result.after });
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

    const result = await softDeleteSiteHistory(id);
    if (!result) {
      return json.notFound("History entry not found.");
    }

    await req.audit.log({
      action: AuditEventType.USER_DELETED,
      outcome: "SUCCESS",
      actor: { type: "user", id: auth.userId },
      target: { type: AuditResourceType.API, id: "admin:site-settings:history:delete" },
      metadata: {
        eventType: "SITE_HISTORY_SOFT_DELETED",
        description: "History entry soft deleted.",
        historyId: id,
      },
    });

    return json.ok({ message: "History entry soft-deleted successfully.", item: result.after });
  } catch (error) {
    return handleApiError(error);
  }
}

export const GET = withAuditRoute("GET", GETHandler);
export const PUT = withAuditRoute("PUT", PUTHandler);
export const DELETE = withAuditRoute("DELETE", DELETEHandler);

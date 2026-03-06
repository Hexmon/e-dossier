import { z } from "zod";

import { requireAdmin } from "@/app/lib/authz";
import {
  getSiteEventNewsById,
  softDeleteSiteEventNews,
  updateSiteEventNews,
} from "@/app/db/queries/site-settings";
import { handleApiError, json } from "@/app/lib/http";
import { eventNewsUpdateSchema } from "@/app/lib/validators.site-settings";
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

    const item = await getSiteEventNewsById(id, { includeDeleted: true });
    if (!item) {
      return json.notFound("Event/news item not found.");
    }

    await req.audit.log({
      action: AuditEventType.API_REQUEST,
      outcome: "SUCCESS",
      actor: { type: "user", id: auth.userId },
      target: { type: AuditResourceType.API, id: "admin:site-settings:events-news:get" },
      metadata: {
        description: "Site event/news item retrieved.",
        itemId: id,
      },
    });

    return json.ok({ message: "Event/news item retrieved successfully.", item });
  } catch (error) {
    return handleApiError(error);
  }
}

async function PUTHandler(req: AuditNextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAdmin(req);
    const { id } = Params.parse(await params);

    const parsed = eventNewsUpdateSchema.safeParse(await req.json());
    if (!parsed.success) {
      return json.badRequest("Validation failed.", { issues: parsed.error.flatten() });
    }

    const result = await updateSiteEventNews(id, parsed.data);
    if (!result) {
      return json.notFound("Event/news item not found.");
    }

    const { changedFields, diff } = computeDiff(result.before as any, result.after as any);

    await req.audit.log({
      action: AuditEventType.USER_UPDATED,
      outcome: "SUCCESS",
      actor: { type: "user", id: auth.userId },
      target: { type: AuditResourceType.API, id: "admin:site-settings:events-news:update" },
      metadata: {
        eventType: "SITE_EVENTS_NEWS_UPDATED",
        description: "Site event/news item updated.",
        itemId: id,
        changedFields,
        diff,
      },
    });

    return json.ok({ message: "Event/news item updated successfully.", item: result.after });
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

    const result = await softDeleteSiteEventNews(id);
    if (!result) {
      return json.notFound("Event/news item not found.");
    }

    await req.audit.log({
      action: AuditEventType.USER_DELETED,
      outcome: "SUCCESS",
      actor: { type: "user", id: auth.userId },
      target: { type: AuditResourceType.API, id: "admin:site-settings:events-news:delete" },
      metadata: {
        eventType: "SITE_EVENTS_NEWS_SOFT_DELETED",
        description: "Site event/news item soft deleted.",
        itemId: id,
      },
    });

    return json.ok({ message: "Event/news item soft-deleted successfully.", item: result.after });
  } catch (error) {
    return handleApiError(error);
  }
}

export const GET = withAuditRoute("GET", GETHandler);
export const PUT = withAuditRoute("PUT", PUTHandler);
export const DELETE = withAuditRoute("DELETE", DELETEHandler);

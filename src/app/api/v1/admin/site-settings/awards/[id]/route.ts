import { z } from "zod";

import { requireAdmin } from "@/app/lib/authz";
import {
  getSiteAwardById,
  softDeleteSiteAward,
  updateSiteAward,
} from "@/app/db/queries/site-settings";
import { handleApiError, json } from "@/app/lib/http";
import { awardUpdateSchema } from "@/app/lib/validators.site-settings";
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

    const item = await getSiteAwardById(id, { includeDeleted: true });
    if (!item) {
      return json.notFound("Award not found.");
    }

    await req.audit.log({
      action: AuditEventType.API_REQUEST,
      outcome: "SUCCESS",
      actor: { type: "user", id: auth.userId },
      target: { type: AuditResourceType.API, id: "admin:site-settings:awards:get" },
      metadata: {
        description: "Award retrieved.",
        awardId: id,
      },
    });

    return json.ok({ message: "Award retrieved successfully.", item });
  } catch (error) {
    return handleApiError(error);
  }
}

async function PUTHandler(req: AuditNextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAdmin(req);
    const { id } = Params.parse(await params);

    const parsed = awardUpdateSchema.safeParse(await req.json());
    if (!parsed.success) {
      return json.badRequest("Validation failed.", { issues: parsed.error.flatten() });
    }

    const result = await updateSiteAward(id, parsed.data);
    if (!result) {
      return json.notFound("Award not found.");
    }

    const { changedFields, diff } = computeDiff(result.before as any, result.after as any);

    await req.audit.log({
      action: AuditEventType.USER_UPDATED,
      outcome: "SUCCESS",
      actor: { type: "user", id: auth.userId },
      target: { type: AuditResourceType.API, id: "admin:site-settings:awards:update" },
      metadata: {
        eventType: "SITE_AWARD_UPDATED",
        description: "Site award updated.",
        awardId: id,
        changedFields,
        diff,
      },
    });

    return json.ok({ message: "Award updated successfully.", item: result.after });
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

    const result = await softDeleteSiteAward(id);
    if (!result) {
      return json.notFound("Award not found.");
    }

    await req.audit.log({
      action: AuditEventType.USER_DELETED,
      outcome: "SUCCESS",
      actor: { type: "user", id: auth.userId },
      target: { type: AuditResourceType.API, id: "admin:site-settings:awards:delete" },
      metadata: {
        eventType: "SITE_AWARD_SOFT_DELETED",
        description: "Site award soft deleted.",
        awardId: id,
      },
    });

    return json.ok({ message: "Award soft-deleted successfully.", item: result.after });
  } catch (error) {
    return handleApiError(error);
  }
}

export const GET = withAuditRoute("GET", GETHandler);
export const PUT = withAuditRoute("PUT", PUTHandler);
export const DELETE = withAuditRoute("DELETE", DELETEHandler);

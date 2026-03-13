import { requireAdmin } from "@/app/lib/authz";
import {
  createSiteFooter,
  getSiteFooter,
  updateSiteFooter,
} from "@/app/db/queries/site-settings";
import { handleApiError, json } from "@/app/lib/http";
import {
  footerCreateSchema,
  footerUpdateSchema,
} from "@/app/lib/validators.site-settings";
import {
  AuditEventType,
  AuditResourceType,
  computeDiff,
  type AuditNextRequest,
  withAuditRoute,
} from "@/lib/audit";

export const runtime = "nodejs";

async function GETHandler(req: AuditNextRequest) {
  try {
    const auth = await requireAdmin(req);
    const item = await getSiteFooter();

    await req.audit.log({
      action: AuditEventType.API_REQUEST,
      outcome: "SUCCESS",
      actor: { type: "user", id: auth.userId },
      target: { type: AuditResourceType.API, id: "admin:site-settings:footer:get" },
      metadata: {
        description: "Site footer retrieved.",
        hasFooter: Boolean(item),
      },
    });

    return json.ok({
      message: "Footer retrieved successfully.",
      item,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

async function POSTHandler(req: AuditNextRequest) {
  try {
    const auth = await requireAdmin(req);
    const parsed = footerCreateSchema.safeParse(await req.json());

    if (!parsed.success) {
      return json.badRequest("Validation failed.", { issues: parsed.error.flatten() });
    }

    const item = await createSiteFooter(parsed.data);
    if (!item) {
      return json.conflict("Footer already exists. Use edit to update it.");
    }

    await req.audit.log({
      action: AuditEventType.USER_CREATED,
      outcome: "SUCCESS",
      actor: { type: "user", id: auth.userId },
      target: { type: AuditResourceType.API, id: "admin:site-settings:footer:create" },
      metadata: {
        eventType: "SITE_FOOTER_CREATED",
        description: "Site footer created.",
      },
    });

    return json.created({
      message: "Footer created successfully.",
      item,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

async function PATCHHandler(req: AuditNextRequest) {
  try {
    const auth = await requireAdmin(req);
    const parsed = footerUpdateSchema.safeParse(await req.json());

    if (!parsed.success) {
      return json.badRequest("Validation failed.", { issues: parsed.error.flatten() });
    }

    const result = await updateSiteFooter(parsed.data);
    if (!result) {
      return json.notFound("Footer not found. Create footer first.");
    }

    const { changedFields, diff } = computeDiff(result.before as any, result.after as any);

    await req.audit.log({
      action: AuditEventType.USER_UPDATED,
      outcome: "SUCCESS",
      actor: { type: "user", id: auth.userId },
      target: { type: AuditResourceType.API, id: "admin:site-settings:footer:update" },
      metadata: {
        eventType: "SITE_FOOTER_UPDATED",
        description: "Site footer updated.",
        changedFields,
        diff,
      },
    });

    return json.ok({
      message: "Footer updated successfully.",
      item: result.after,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export const GET = withAuditRoute("GET", GETHandler);
export const POST = withAuditRoute("POST", POSTHandler);
export const PATCH = withAuditRoute("PATCH", PATCHHandler);

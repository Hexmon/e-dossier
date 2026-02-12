import { requireAdmin } from "@/app/lib/authz";
import { createSiteAward, listSiteAwards } from "@/app/db/queries/site-settings";
import { handleApiError, json } from "@/app/lib/http";
import { awardCreateSchema } from "@/app/lib/validators.site-settings";
import {
  AuditEventType,
  AuditResourceType,
  type AuditNextRequest,
  withAuditRoute,
} from "@/lib/audit";

export const runtime = "nodejs";

async function GETHandler(req: AuditNextRequest) {
  try {
    const auth = await requireAdmin(req);
    const items = await listSiteAwards();

    await req.audit.log({
      action: AuditEventType.API_REQUEST,
      outcome: "SUCCESS",
      actor: { type: "user", id: auth.userId },
      target: { type: AuditResourceType.API, id: "admin:site-settings:awards:list" },
      metadata: {
        description: "Site awards retrieved.",
        count: items.length,
      },
    });

    return json.ok({ message: "Awards retrieved successfully.", items, count: items.length });
  } catch (error) {
    return handleApiError(error);
  }
}

async function POSTHandler(req: AuditNextRequest) {
  try {
    const auth = await requireAdmin(req);
    const parsed = awardCreateSchema.safeParse(await req.json());

    if (!parsed.success) {
      return json.badRequest("Validation failed.", { issues: parsed.error.flatten() });
    }

    const item = await createSiteAward(parsed.data);

    await req.audit.log({
      action: AuditEventType.USER_CREATED,
      outcome: "SUCCESS",
      actor: { type: "user", id: auth.userId },
      target: { type: AuditResourceType.API, id: "admin:site-settings:awards:create" },
      metadata: {
        eventType: "SITE_AWARD_CREATED",
        description: "Site award created.",
        awardId: item.id,
        title: item.title,
      },
    });

    return json.created({ message: "Award created successfully.", item });
  } catch (error) {
    return handleApiError(error);
  }
}

export const GET = withAuditRoute("GET", GETHandler);
export const POST = withAuditRoute("POST", POSTHandler);

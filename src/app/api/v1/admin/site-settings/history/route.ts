import { requireAdmin } from "@/app/lib/authz";
import { createSiteHistory, listSiteHistory } from "@/app/db/queries/site-settings";
import { handleApiError, json } from "@/app/lib/http";
import { historyCreateSchema, sortSchema } from "@/app/lib/validators.site-settings";
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
    const searchParams = new URL(req.url).searchParams;
    const sort = sortSchema.parse((searchParams.get("sort") ?? "asc").toLowerCase());

    const items = await listSiteHistory({ sort });

    await req.audit.log({
      action: AuditEventType.API_REQUEST,
      outcome: "SUCCESS",
      actor: { type: "user", id: auth.userId },
      target: { type: AuditResourceType.API, id: "admin:site-settings:history:list" },
      metadata: {
        description: "Site history entries retrieved.",
        count: items.length,
        sort,
      },
    });

    return json.ok({ message: "History retrieved successfully.", items, count: items.length, sort });
  } catch (error) {
    return handleApiError(error);
  }
}

async function POSTHandler(req: AuditNextRequest) {
  try {
    const auth = await requireAdmin(req);
    const parsed = historyCreateSchema.safeParse(await req.json());

    if (!parsed.success) {
      return json.badRequest("Validation failed.", { issues: parsed.error.flatten() });
    }

    const item = await createSiteHistory(parsed.data);

    await req.audit.log({
      action: AuditEventType.USER_CREATED,
      outcome: "SUCCESS",
      actor: { type: "user", id: auth.userId },
      target: { type: AuditResourceType.API, id: "admin:site-settings:history:create" },
      metadata: {
        eventType: "SITE_HISTORY_CREATED",
        description: "Site history entry created.",
        historyId: item.id,
      },
    });

    return json.created({ message: "History entry created successfully.", item });
  } catch (error) {
    return handleApiError(error);
  }
}

export const GET = withAuditRoute("GET", GETHandler);
export const POST = withAuditRoute("POST", POSTHandler);

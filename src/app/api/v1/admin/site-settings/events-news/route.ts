import { requireAdmin } from "@/app/lib/authz";
import { createSiteEventNews, listSiteEventsNews } from "@/app/db/queries/site-settings";
import { handleApiError, json } from "@/app/lib/http";
import {
  eventNewsCreateSchema,
  eventNewsTypeSchema,
  sortSchema,
} from "@/app/lib/validators.site-settings";
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
    const sort = sortSchema.parse((searchParams.get("sort") ?? "desc").toLowerCase());
    const rawType = searchParams.get("type");
    const type = rawType ? eventNewsTypeSchema.parse(rawType.toLowerCase()) : undefined;

    const items = await listSiteEventsNews({ sort, type });

    await req.audit.log({
      action: AuditEventType.API_REQUEST,
      outcome: "SUCCESS",
      actor: { type: "user", id: auth.userId },
      target: { type: AuditResourceType.API, id: "admin:site-settings:events-news:list" },
      metadata: {
        description: "Site events and news retrieved.",
        count: items.length,
        sort,
        type: type ?? "all",
      },
    });

    return json.ok({
      message: "Events and news retrieved successfully.",
      items,
      count: items.length,
      sort,
      type: type ?? null,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

async function POSTHandler(req: AuditNextRequest) {
  try {
    const auth = await requireAdmin(req);
    const parsed = eventNewsCreateSchema.safeParse(await req.json());

    if (!parsed.success) {
      return json.badRequest("Validation failed.", { issues: parsed.error.flatten() });
    }

    const item = await createSiteEventNews(parsed.data);

    await req.audit.log({
      action: AuditEventType.USER_CREATED,
      outcome: "SUCCESS",
      actor: { type: "user", id: auth.userId },
      target: { type: AuditResourceType.API, id: "admin:site-settings:events-news:create" },
      metadata: {
        eventType: "SITE_EVENTS_NEWS_CREATED",
        description: "Site event/news item created.",
        itemId: item.id,
        itemType: item.type,
        title: item.title,
      },
    });

    return json.created({ message: "Event/news item created successfully.", item });
  } catch (error) {
    return handleApiError(error);
  }
}

export const GET = withAuditRoute("GET", GETHandler);
export const POST = withAuditRoute("POST", POSTHandler);

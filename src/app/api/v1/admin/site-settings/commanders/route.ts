import { requireAdmin } from "@/app/lib/authz";
import { handleApiError, json } from "@/app/lib/http";
import { commanderCreateSchema } from "@/app/lib/validators.site-settings";
import { createSiteCommander, listSiteCommanders } from "@/app/db/queries/site-settings";
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
    const items = await listSiteCommanders();

    await req.audit.log({
      action: AuditEventType.API_REQUEST,
      outcome: "SUCCESS",
      actor: { type: "user", id: auth.userId },
      target: { type: AuditResourceType.API, id: "admin:site-settings:commanders:list" },
      metadata: {
        description: "Commander entries retrieved.",
        count: items.length,
      },
    });

    return json.ok({ message: "Commanders retrieved successfully.", items, count: items.length });
  } catch (error) {
    return handleApiError(error);
  }
}

async function POSTHandler(req: AuditNextRequest) {
  try {
    const auth = await requireAdmin(req);
    const parsed = commanderCreateSchema.safeParse(await req.json());

    if (!parsed.success) {
      return json.badRequest("Validation failed.", { issues: parsed.error.flatten() });
    }

    const commander = await createSiteCommander(parsed.data);

    await req.audit.log({
      action: AuditEventType.USER_CREATED,
      outcome: "SUCCESS",
      actor: { type: "user", id: auth.userId },
      target: { type: AuditResourceType.API, id: "admin:site-settings:commanders:create" },
      metadata: {
        eventType: "SITE_COMMANDER_CREATED",
        description: "Commander entry created.",
        commanderId: commander.id,
        name: commander.name,
      },
    });

    return json.created({ message: "Commander created successfully.", item: commander });
  } catch (error) {
    return handleApiError(error);
  }
}

export const GET = withAuditRoute("GET", GETHandler);
export const POST = withAuditRoute("POST", POSTHandler);

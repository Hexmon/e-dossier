import { handleApiError, json } from "@/app/lib/http";
import { listRelegationHistory } from "@/app/db/queries/relegation";
import { relegationHistoryQuerySchema } from "@/app/lib/validators.relegation";
import { getRelegationAccessContext } from "@/app/lib/relegation-auth";
import {
  AuditEventType,
  AuditResourceType,
  type AuditNextRequest,
  withAuditRoute,
} from "@/lib/audit";

export const runtime = "nodejs";

async function GETHandler(req: AuditNextRequest) {
  try {
    const access = await getRelegationAccessContext(req);
    const searchParams = new URL(req.url).searchParams;

    const parsed = relegationHistoryQuerySchema.safeParse({
      q: searchParams.get("q") ?? undefined,
      courseFromId: searchParams.get("courseFromId") ?? undefined,
      courseToId: searchParams.get("courseToId") ?? undefined,
      movementKind: searchParams.get("movementKind") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
      offset: searchParams.get("offset") ?? undefined,
    });

    if (!parsed.success) {
      return json.badRequest("Validation failed.", { issues: parsed.error.flatten() });
    }

    const result = await listRelegationHistory({
      ...parsed.data,
      scopePlatoonId: access.scopePlatoonId,
    });

    await req.audit.log({
      action: AuditEventType.API_REQUEST,
      outcome: "SUCCESS",
      actor: { type: "user", id: access.userId },
      target: { type: AuditResourceType.API, id: "admin:relegation:history:read" },
      metadata: {
        description: "Relegation history retrieved.",
        count: result.items.length,
        total: result.total,
        query: parsed.data,
        scopePlatoonId: access.scopePlatoonId,
      },
    });

    return json.ok({
      message: "Relegation history retrieved successfully.",
      items: result.items,
      total: result.total,
      limit: result.limit,
      offset: result.offset,
      count: result.items.length,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export const GET = withAuditRoute("GET", GETHandler);

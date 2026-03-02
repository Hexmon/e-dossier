import { handleApiError, json } from "@/app/lib/http";
import { listRelegationOcOptions } from "@/app/db/queries/relegation";
import { getRelegationAccessContext } from "@/app/lib/relegation-auth";
import { relegationOcOptionsQuerySchema } from "@/app/lib/validators.relegation";
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
    const parsed = relegationOcOptionsQuerySchema.safeParse({
      q: searchParams.get("q") ?? undefined,
      courseId: searchParams.get("courseId") ?? undefined,
      activeOnly: searchParams.get("activeOnly") ?? undefined,
    });

    if (!parsed.success) {
      return json.badRequest("Validation failed.", { issues: parsed.error.flatten() });
    }

    const items = await listRelegationOcOptions({
      q: parsed.data.q,
      courseId: parsed.data.courseId,
      activeOnly: parsed.data.activeOnly,
      scopePlatoonId: access.scopePlatoonId,
    });

    await req.audit.log({
      action: AuditEventType.API_REQUEST,
      outcome: "SUCCESS",
      actor: { type: "user", id: access.userId },
      target: { type: AuditResourceType.API, id: "admin:relegation:ocs:read" },
      metadata: {
        description: "Relegation OC options retrieved.",
        count: items.length,
        query: parsed.data,
        scopePlatoonId: access.scopePlatoonId,
      },
    });

    return json.ok({
      message: "Relegation OC options retrieved successfully.",
      items,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export const GET = withAuditRoute("GET", GETHandler);

import { handleApiError, json } from "@/app/lib/http";
import { listOcEnrollmentTimeline } from "@/app/db/queries/relegation";
import { getRelegationAccessContext } from "@/app/lib/relegation-auth";
import { relegationEnrollmentPathSchema } from "@/app/lib/validators.relegation";
import {
  AuditEventType,
  AuditResourceType,
  type AuditNextRequest,
  withAuditRoute,
} from "@/lib/audit";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    ocId: string;
  }>;
};

async function GETHandler(req: AuditNextRequest, context: RouteContext) {
  try {
    const access = await getRelegationAccessContext(req);
    const { ocId } = await context.params;

    const parsed = relegationEnrollmentPathSchema.safeParse({ ocId });
    if (!parsed.success) {
      return json.badRequest("Validation failed.", { issues: parsed.error.flatten() });
    }

    const items = await listOcEnrollmentTimeline(parsed.data.ocId, access.scopePlatoonId);

    await req.audit.log({
      action: AuditEventType.API_REQUEST,
      outcome: "SUCCESS",
      actor: { type: "user", id: access.userId },
      target: { type: AuditResourceType.API, id: "admin:relegation:enrollments:read" },
      metadata: {
        description: "Enrollment timeline retrieved.",
        ocId: parsed.data.ocId,
        count: items.length,
        scopePlatoonId: access.scopePlatoonId,
      },
    });

    return json.ok({
      message: "Enrollment timeline retrieved successfully.",
      items,
      count: items.length,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export const GET = withAuditRoute("GET", GETHandler);

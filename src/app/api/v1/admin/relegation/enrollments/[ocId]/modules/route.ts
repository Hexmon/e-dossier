import { handleApiError, json } from "@/app/lib/http";
import { getEnrollmentModuleDataset } from "@/app/db/queries/relegation";
import { getRelegationAccessContext } from "@/app/lib/relegation-auth";
import {
  relegationEnrollmentModulesQuerySchema,
  relegationEnrollmentPathSchema,
} from "@/app/lib/validators.relegation";
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

    const pathParsed = relegationEnrollmentPathSchema.safeParse({ ocId });
    if (!pathParsed.success) {
      return json.badRequest("Validation failed.", { issues: pathParsed.error.flatten() });
    }

    const searchParams = new URL(req.url).searchParams;
    const queryParsed = relegationEnrollmentModulesQuerySchema.safeParse({
      enrollmentId: searchParams.get("enrollmentId") ?? undefined,
      module: searchParams.get("module") ?? undefined,
      semester: searchParams.get("semester") ?? undefined,
    });

    if (!queryParsed.success) {
      return json.badRequest("Validation failed.", { issues: queryParsed.error.flatten() });
    }

    const items = await getEnrollmentModuleDataset({
      ocId: pathParsed.data.ocId,
      enrollmentId: queryParsed.data.enrollmentId,
      module: queryParsed.data.module,
      semester: queryParsed.data.semester,
      scopePlatoonId: access.scopePlatoonId,
    });

    await req.audit.log({
      action: AuditEventType.API_REQUEST,
      outcome: "SUCCESS",
      actor: { type: "user", id: access.userId },
      target: { type: AuditResourceType.API, id: "admin:relegation:enrollments:modules:read" },
      metadata: {
        description: "Enrollment module dataset retrieved.",
        ocId: pathParsed.data.ocId,
        enrollmentId: queryParsed.data.enrollmentId,
        module: queryParsed.data.module,
        semester: queryParsed.data.semester ?? null,
        count: Array.isArray(items) ? items.length : null,
      },
    });

    return json.ok({
      message: "Enrollment module dataset retrieved successfully.",
      enrollmentId: queryParsed.data.enrollmentId,
      module: queryParsed.data.module,
      items,
      count: Array.isArray(items) ? items.length : 0,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export const GET = withAuditRoute("GET", GETHandler);

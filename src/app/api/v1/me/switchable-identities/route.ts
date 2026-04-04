import { json, handleApiError } from "@/app/lib/http";
import { requireAuth } from "@/app/lib/guard";
import { listSwitchableIdentities } from "@/app/lib/effective-authority";
import {
  withAuditRoute,
  AuditEventType,
  AuditResourceType,
} from "@/lib/audit";
import type { AuditNextRequest } from "@/lib/audit";

async function GETHandler(req: AuditNextRequest) {
  try {
    const principal = await requireAuth(req);
    const identities = await listSwitchableIdentities();

    await req.audit.log({
      action: AuditEventType.API_REQUEST,
      outcome: "SUCCESS",
      actor: { type: "user", id: principal.userId },
      target: { type: AuditResourceType.USER, id: principal.userId },
      metadata: {
        description: "Retrieved switchable identities.",
        count: identities.length,
      },
    });

    return json.ok({
      message: "Switchable identities retrieved successfully.",
      items: identities,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export const GET = withAuditRoute("GET", GETHandler);

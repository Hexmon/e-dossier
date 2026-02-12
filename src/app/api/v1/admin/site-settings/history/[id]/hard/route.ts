import { z } from "zod";

import { requireAdmin } from "@/app/lib/authz";
import { hardDeleteSiteHistory } from "@/app/db/queries/site-settings";
import { handleApiError, json } from "@/app/lib/http";
import {
  AuditEventType,
  AuditResourceType,
  type AuditNextRequest,
  withAuditRoute,
} from "@/lib/audit";

export const runtime = "nodejs";

const Params = z.object({ id: z.string().uuid() });

async function DELETEHandler(
  req: AuditNextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin(req);
    const { id } = Params.parse(await params);

    const result = await hardDeleteSiteHistory(id);
    if (!result) {
      return json.notFound("History entry not found.");
    }

    await req.audit.log({
      action: AuditEventType.USER_DELETED,
      outcome: "SUCCESS",
      actor: { type: "user", id: auth.userId },
      target: { type: AuditResourceType.API, id: "admin:site-settings:history:hard-delete" },
      metadata: {
        eventType: "SITE_HISTORY_HARD_DELETED",
        description: "History entry hard deleted.",
        historyId: id,
      },
    });

    return json.ok({ message: "History entry hard-deleted successfully.", id });
  } catch (error) {
    return handleApiError(error);
  }
}

export const DELETE = withAuditRoute("DELETE", DELETEHandler);

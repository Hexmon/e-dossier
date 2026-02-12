import { z } from "zod";

import { requireAdmin } from "@/app/lib/authz";
import { hardDeleteSiteAward } from "@/app/db/queries/site-settings";
import { deleteObject } from "@/app/lib/storage";
import { handleApiError, json } from "@/app/lib/http";
import {
  AuditEventType,
  AuditResourceType,
  type AuditNextRequest,
  withAuditRoute,
} from "@/lib/audit";

export const runtime = "nodejs";

const Params = z.object({ id: z.string().uuid() });

function isNotFoundError(error: unknown): boolean {
  const status = (error as any)?.$metadata?.httpStatusCode;
  const name = (error as any)?.name;
  return status === 404 || name === "NotFound";
}

async function DELETEHandler(
  req: AuditNextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin(req);
    const { id } = Params.parse(await params);

    const result = await hardDeleteSiteAward(id);
    if (!result) {
      return json.notFound("Award not found.");
    }

    if (result.before.imageObjectKey) {
      try {
        await deleteObject(result.before.imageObjectKey);
      } catch (error) {
        if (!isNotFoundError(error)) {
          throw error;
        }
      }
    }

    await req.audit.log({
      action: AuditEventType.USER_DELETED,
      outcome: "SUCCESS",
      actor: { type: "user", id: auth.userId },
      target: { type: AuditResourceType.API, id: "admin:site-settings:awards:hard-delete" },
      metadata: {
        eventType: "SITE_AWARD_HARD_DELETED",
        description: "Site award hard deleted.",
        awardId: id,
      },
    });

    return json.ok({ message: "Award hard-deleted successfully.", id });
  } catch (error) {
    return handleApiError(error);
  }
}

export const DELETE = withAuditRoute("DELETE", DELETEHandler);

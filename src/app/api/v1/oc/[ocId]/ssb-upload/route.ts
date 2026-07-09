import { z } from "zod";
import { handleApiError, json } from "@/app/lib/http";
import { requireAuth } from "@/app/lib/authz";
import { getOcSsbUploadSummary } from "@/app/db/queries/ssb-upload";
import { getSsbUploadViewingDecisionForOc } from "@/app/db/queries/ssb-upload-visibility-settings";
import { AuditEventType, AuditResourceType, type AuditNextRequest, withAuditRoute } from "@/lib/audit";

export const runtime = "nodejs";

const paramsSchema = z.object({ ocId: z.string().uuid() });

async function GETHandler(req: AuditNextRequest, { params }: { params: Promise<{ ocId: string }> }) {
  try {
    const authCtx = await requireAuth(req);
    const { ocId } = paramsSchema.parse(await params);
    const row = await getOcSsbUploadSummary(ocId);
    if (!row) return json.notFound("OC not found.");

    const visibility = await getSsbUploadViewingDecisionForOc({
      ocId,
      viewerAppointmentId: authCtx.claims?.apt?.id ?? null,
      viewerPositionKey: authCtx.claims?.apt?.position ?? null,
      viewerRoles: authCtx.roles,
    });

    await req.audit.log({
      action: AuditEventType.API_REQUEST,
      outcome: "SUCCESS",
      actor: { type: "user", id: authCtx.userId },
      target: { type: AuditResourceType.OC, id: ocId },
      metadata: { description: "OC SSB upload visibility retrieved.", module: "ssb-upload" },
    });

    return json.ok({
      item: { ...row, hasUpload: Boolean(row.fileName), visibility },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export const GET = withAuditRoute("GET", GETHandler);

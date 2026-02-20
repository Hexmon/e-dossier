import { createPresignedGetUrl } from "@/app/lib/storage";
import { getRelegationMediaReference } from "@/app/db/queries/relegation";
import { handleApiError, json } from "@/app/lib/http";
import { getRelegationAccessContext } from "@/app/lib/relegation-auth";
import { relegationMediaPathSchema } from "@/app/lib/validators.relegation";
import {
  AuditEventType,
  AuditResourceType,
  type AuditNextRequest,
  withAuditRoute,
} from "@/lib/audit";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    historyId: string;
  }>;
};

async function GETHandler(req: AuditNextRequest, context: RouteContext) {
  try {
    const access = await getRelegationAccessContext(req);
    const { historyId } = await context.params;

    const parsed = relegationMediaPathSchema.safeParse({ historyId });
    if (!parsed.success) {
      return json.badRequest("Validation failed.", { issues: parsed.error.flatten() });
    }

    const media = await getRelegationMediaReference(parsed.data.historyId, access.scopePlatoonId);

    const signedUrl = media.pdfObjectKey
      ? await createPresignedGetUrl({ key: media.pdfObjectKey, expiresInSeconds: 900 })
      : media.pdfUrl;

    await req.audit.log({
      action: AuditEventType.API_REQUEST,
      outcome: "SUCCESS",
      actor: { type: "user", id: access.userId },
      target: { type: AuditResourceType.API, id: "admin:relegation:media:signed-url:read" },
      metadata: {
        description: "Relegation media signed URL generated.",
        historyId: parsed.data.historyId,
        hasObjectKey: Boolean(media.pdfObjectKey),
      },
    });

    return json.ok({
      message: "Signed URL generated successfully.",
      historyId: media.historyId,
      signedUrl,
      expiresInSeconds: media.pdfObjectKey ? 900 : null,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export const GET = withAuditRoute("GET", GETHandler);

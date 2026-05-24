import { createPresignedGetUrl, getObjectBytes, getObjectKeyFromPublicUrl } from "@/app/lib/storage";
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
    const objectKey = media.pdfObjectKey ?? (media.pdfUrl ? getObjectKeyFromPublicUrl(media.pdfUrl) : null);
    const inlineView = new URL(req.url).searchParams.get("inline") === "1";

    if (inlineView) {
      if (!objectKey) {
        return json.notFound("No embeddable PDF media is attached to this history record.");
      }

      const object = await getObjectBytes(objectKey);

      await req.audit.log({
        action: AuditEventType.API_REQUEST,
        outcome: "SUCCESS",
        actor: { type: "user", id: access.userId },
        target: { type: AuditResourceType.API, id: "admin:relegation:media:signed-url:read" },
        metadata: {
          description: "Relegation media PDF streamed for inline viewing.",
          historyId: parsed.data.historyId,
          hasObjectKey: true,
        },
      });

      const body = new ArrayBuffer(object.bytes.byteLength);
      new Uint8Array(body).set(object.bytes);

      return new Response(body, {
        status: 200,
        headers: {
          "Content-Type": object.contentType || "application/pdf",
          "Content-Disposition": 'inline; filename="relegation-document.pdf"',
          "Cache-Control": "private, max-age=300",
          ...(object.contentLength != null ? { "Content-Length": String(object.contentLength) } : {}),
        },
      });
    }

    const signedUrl = objectKey
      ? await createPresignedGetUrl({ key: objectKey, expiresInSeconds: 900 })
      : media.pdfUrl;

    await req.audit.log({
      action: AuditEventType.API_REQUEST,
      outcome: "SUCCESS",
      actor: { type: "user", id: access.userId },
      target: { type: AuditResourceType.API, id: "admin:relegation:media:signed-url:read" },
      metadata: {
        description: "Relegation media signed URL generated.",
        historyId: parsed.data.historyId,
        hasObjectKey: Boolean(objectKey),
      },
    });

    return json.ok({
      message: "Signed URL generated successfully.",
      historyId: media.historyId,
      signedUrl,
      expiresInSeconds: objectKey ? 900 : null,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export const GET = withAuditRoute("GET", GETHandler);

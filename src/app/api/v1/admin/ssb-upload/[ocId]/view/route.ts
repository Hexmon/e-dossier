import * as argon2 from 'argon2';
import { z } from 'zod';
import { requireAuth } from '@/app/lib/authz';
import { handleApiError, json } from '@/app/lib/http';
import { getObjectBytes } from '@/app/lib/storage';
import { getOcSsbUpload } from '@/app/db/queries/ssb-upload';
import { decryptSsbPdf } from '@/app/lib/ssb-upload-crypto';
import { AuditEventType, AuditResourceType, type AuditNextRequest, withAuditRoute } from '@/lib/audit';

export const runtime = 'nodejs';

const paramsSchema = z.object({ ocId: z.string().uuid() });
const bodySchema = z.object({ password: z.string().trim().min(1).max(128) });

async function POSTHandler(req: AuditNextRequest, { params }: { params: Promise<{ ocId: string }> }) {
  try {
    const authCtx = await requireAuth(req);
    const { ocId } = paramsSchema.parse(await params);
    const body = bodySchema.parse(await req.json());
    const upload = await getOcSsbUpload(ocId);

    if (!upload?.objectKey || !upload.passwordHash || !upload.salt || !upload.iv || !upload.authTag) {
      return json.notFound('SSB PDF upload not found.');
    }

    const ok = await argon2.verify(upload.passwordHash, body.password);
    if (!ok) return json.forbidden('Invalid SSB PDF password.');

    const object = await getObjectBytes(upload.objectKey);
    const pdf = await decryptSsbPdf(object.bytes, body.password, {
      salt: upload.salt,
      iv: upload.iv,
      authTag: upload.authTag,
    });
    const fileName = upload.fileName || 'ssb-upload.pdf';

    await req.audit.log({
      action: AuditEventType.SENSITIVE_DATA_EXPORTED,
      outcome: 'SUCCESS',
      actor: { type: 'user', id: authCtx.userId },
      target: { type: AuditResourceType.OC, id: ocId },
      metadata: {
        description: 'SSB PDF opened after password verification.',
        module: 'ssb-upload',
      },
    });

    return new Response(Uint8Array.from(pdf), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${fileName.replace(/"/g, '')}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export const POST = withAuditRoute('POST', POSTHandler);

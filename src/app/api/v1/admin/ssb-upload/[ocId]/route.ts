import { randomUUID } from 'node:crypto';
import * as argon2 from 'argon2';
import { z } from 'zod';
import { requireAdmin } from '@/app/lib/authz';
import { handleApiError, json } from '@/app/lib/http';
import { deleteObject, putObjectBytes } from '@/app/lib/storage';
import { getOcSsbUploadSummary, saveOcSsbUpload } from '@/app/db/queries/ssb-upload';
import { encryptSsbPdf, encryptSsbStoredPassword } from '@/app/lib/ssb-upload-crypto';
import { AuditEventType, AuditResourceType, type AuditNextRequest, withAuditRoute } from '@/lib/audit';

export const runtime = 'nodejs';

const paramsSchema = z.object({ ocId: z.string().uuid() });
const MAX_PDF_BYTES = 15 * 1024 * 1024;

function isPdf(file: File) {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
}

async function POSTHandler(req: AuditNextRequest, { params }: { params: Promise<{ ocId: string }> }) {
  try {
    const authCtx = await requireAdmin(req);
    const { ocId } = paramsSchema.parse(await params);
    const form = await req.formData();
    const file = form.get('file');
    const password = String(form.get('password') ?? '').trim();

    if (!(file instanceof File)) return json.badRequest('PDF file is required.');
    if (!isPdf(file)) return json.badRequest('Only PDF uploads are supported.');
    if (file.size <= 0 || file.size > MAX_PDF_BYTES) return json.badRequest('PDF must be between 1 byte and 15 MB.');
    if (!password) return json.badRequest('Password is required.');

    const oc = await getOcSsbUploadSummary(ocId);
    if (!oc) return json.notFound('OC not found.');

    const encrypted = await encryptSsbPdf(Buffer.from(await file.arrayBuffer()), password);
    const objectKey = `ssb-upload/${ocId}/${randomUUID()}.pdf.enc`;
    await putObjectBytes({
      key: objectKey,
      body: encrypted.encrypted,
      contentType: 'application/octet-stream',
    });

    const passwordHash = await argon2.hash(password);
    const passwordCiphertext = encryptSsbStoredPassword(password);
    const result = await saveOcSsbUpload({
      ocId,
      objectKey,
      fileName: file.name || `ssb-${oc.ocNo}.pdf`,
      contentType: 'application/pdf',
      sizeBytes: file.size,
      passwordHash,
      passwordCiphertext,
      salt: encrypted.salt,
      iv: encrypted.iv,
      authTag: encrypted.authTag,
      uploadedByUserId: authCtx.userId,
    });

    if (result.oldObjectKey && result.oldObjectKey !== objectKey) {
      await deleteObject(result.oldObjectKey).catch(() => undefined);
    }

    await req.audit.log({
      action: AuditEventType.OC_RECORD_UPDATED,
      outcome: 'SUCCESS',
      actor: { type: 'user', id: authCtx.userId },
      target: { type: AuditResourceType.OC, id: ocId },
      metadata: {
        description: 'Encrypted SSB PDF uploaded.',
        module: 'ssb-upload',
        fileName: file.name,
        sizeBytes: file.size,
      },
    });

    return json.ok({
      item: {
        ocId,
        fileName: file.name,
        sizeBytes: file.size,
        uploadedAt: result.saved.ssbPdfUploadedAt,
        hasUpload: true,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export const POST = withAuditRoute('POST', POSTHandler);

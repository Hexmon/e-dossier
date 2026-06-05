import { z } from 'zod';
import { handleApiError, json } from '@/app/lib/http';
import { requireAdmin } from '@/app/lib/authz';
import { getOcSsbUploadSummary, listCourseSsbUploadRows } from '@/app/db/queries/ssb-upload';
import { decryptSsbStoredPassword } from '@/app/lib/ssb-upload-crypto';
import { AuditEventType, AuditResourceType, type AuditNextRequest, withAuditRoute } from '@/lib/audit';

export const runtime = 'nodejs';

const querySchema = z.object({
  courseId: z.string().uuid().optional(),
  ocId: z.string().uuid().optional(),
}).refine((value) => value.courseId || value.ocId, {
  message: 'courseId or ocId is required.',
});

async function GETHandler(req: AuditNextRequest) {
  try {
    const authCtx = await requireAdmin(req);
    const sp = new URL(req.url).searchParams;
    const parsed = querySchema.parse({
      courseId: sp.get('courseId') ?? undefined,
      ocId: sp.get('ocId') ?? undefined,
    });

    if (parsed.ocId) {
      const row = await getOcSsbUploadSummary(parsed.ocId);
      if (!row) return json.notFound('OC not found.');
      return json.ok({
        item: toSsbUploadItem(row),
      });
    }

    const items = await listCourseSsbUploadRows(parsed.courseId!);
    await req.audit.log({
      action: AuditEventType.API_REQUEST,
      outcome: 'SUCCESS',
      actor: { type: 'user', id: authCtx.userId },
      target: { type: AuditResourceType.COURSE, id: parsed.courseId! },
      metadata: {
        description: 'SSB upload course roster retrieved.',
        module: 'ssb-upload',
        count: items.length,
      },
    });

    return json.ok({ items: items.map(toSsbUploadItem) });
  } catch (error) {
    return handleApiError(error);
  }
}

export const GET = withAuditRoute('GET', GETHandler);

function toSsbUploadItem<T extends { fileName: string | null; savedPasswordCiphertext?: string | null }>(row: T) {
  const { savedPasswordCiphertext: _savedPasswordCiphertext, ...item } = row;
  return {
    ...item,
    hasUpload: Boolean(row.fileName),
    savedPassword: decryptSsbStoredPassword(_savedPasswordCiphertext),
  };
}

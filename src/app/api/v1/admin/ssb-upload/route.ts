import { z } from 'zod';
import { handleApiError, json } from '@/app/lib/http';
import { requireAuth } from '@/app/lib/authz';
import { getOcSsbUploadSummary, listCourseSsbUploadRows } from '@/app/db/queries/ssb-upload';
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
    const authCtx = await requireAuth(req);
    const sp = new URL(req.url).searchParams;
    const parsed = querySchema.parse({
      courseId: sp.get('courseId') ?? undefined,
      ocId: sp.get('ocId') ?? undefined,
    });

    if (parsed.ocId) {
      const row = await getOcSsbUploadSummary(parsed.ocId);
      if (!row) return json.notFound('OC not found.');
      return json.ok({
        item: {
          ...row,
          hasUpload: Boolean(row.fileName),
        },
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

    return json.ok({ items: items.map((item) => ({ ...item, hasUpload: Boolean(item.fileName) })) });
  } catch (error) {
    return handleApiError(error);
  }
}

export const GET = withAuditRoute('GET', GETHandler);

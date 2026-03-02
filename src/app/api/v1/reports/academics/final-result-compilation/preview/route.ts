import { handleApiError, json } from '@/app/lib/http';
import { finalResultCompilationPreviewQuerySchema } from '@/app/lib/validators.reports';
import { assertSemesterAllowed, resolveCourseWithSemesters } from '@/app/lib/reports/semester-resolution';
import { buildFinalResultCompilationPreview } from '@/app/lib/reports/report-data';
import { requireAuth } from '@/app/lib/authz';
import { withAuthz } from '@/app/lib/acx/withAuthz';
import { AuditEventType, AuditResourceType, withAuditRoute } from '@/lib/audit';
import type { AuditNextRequest } from '@/lib/audit';

export const runtime = 'nodejs';

async function GETHandler(req: AuditNextRequest) {
  try {
    const authCtx = await requireAuth(req);
    const sp = new URL(req.url).searchParams;
    const query = finalResultCompilationPreviewQuerySchema.parse({
      courseId: sp.get('courseId') ?? undefined,
      semester: sp.get('semester') ?? undefined,
    });

    const courseMeta = await resolveCourseWithSemesters(query.courseId);
    assertSemesterAllowed(query.semester, courseMeta.allowedSemesters);

    const preview = await buildFinalResultCompilationPreview(query);

    await req.audit.log({
      action: AuditEventType.API_REQUEST,
      outcome: 'SUCCESS',
      actor: { type: 'user', id: authCtx.userId },
      target: { type: AuditResourceType.COURSE, id: query.courseId },
      metadata: {
        description: 'Final result compilation preview generated.',
        module: 'reports',
        reportType: 'academics_final_result_compilation',
        courseId: query.courseId,
        semester: query.semester,
        rowCount: preview.rows.length,
        subjectColumnCount: preview.subjectColumns.length,
      },
    });

    return json.ok({
      message: 'Final result compilation preview fetched successfully.',
      data: preview,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export const GET = withAuditRoute('GET', withAuthz(GETHandler));

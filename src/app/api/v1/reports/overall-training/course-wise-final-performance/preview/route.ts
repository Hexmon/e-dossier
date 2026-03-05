import { handleApiError, json } from '@/app/lib/http';
import { courseWiseFinalPerformancePreviewQuerySchema } from '@/app/lib/validators.reports';
import { buildCourseWiseFinalPerformancePreview } from '@/app/lib/reports/report-data';
import { requireAuth } from '@/app/lib/authz';
import { withAuthz } from '@/app/lib/acx/withAuthz';
import { AuditEventType, AuditResourceType, withAuditRoute } from '@/lib/audit';
import type { AuditNextRequest } from '@/lib/audit';

export const runtime = 'nodejs';

async function GETHandler(req: AuditNextRequest) {
  try {
    const authCtx = await requireAuth(req);
    const sp = new URL(req.url).searchParams;
    const query = courseWiseFinalPerformancePreviewQuerySchema.parse({
      courseId: sp.get('courseId') ?? undefined,
    });

    const preview = await buildCourseWiseFinalPerformancePreview({
      courseId: query.courseId,
    });

    await req.audit.log({
      action: AuditEventType.API_REQUEST,
      outcome: 'SUCCESS',
      actor: { type: 'user', id: authCtx.userId },
      target: { type: AuditResourceType.COURSE, id: query.courseId },
      metadata: {
        description: 'Course wise final performance preview fetched successfully.',
        module: 'reports',
        reportType: 'overall_training_course_wise_final_performance',
        courseId: query.courseId,
        rowCount: preview.rows.length,
      },
    });

    return json.ok({
      message: 'Course wise final performance preview fetched successfully.',
      data: preview,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export const GET = withAuditRoute('GET', withAuthz(GETHandler));

import { handleApiError, json } from '@/app/lib/http';
import { ptAssessmentPreviewQuerySchema } from '@/app/lib/validators.reports';
import { assertSemesterAllowed, resolveCourseWithSemesters } from '@/app/lib/reports/semester-resolution';
import { buildPtAssessmentPreview } from '@/app/lib/reports/report-data';
import { requireAuth } from '@/app/lib/authz';
import { withAuthz } from '@/app/lib/acx/withAuthz';
import { AuditEventType, AuditResourceType, withAuditRoute } from '@/lib/audit';
import type { AuditNextRequest } from '@/lib/audit';

export const runtime = 'nodejs';

async function GETHandler(req: AuditNextRequest) {
  try {
    const authCtx = await requireAuth(req);
    const sp = new URL(req.url).searchParams;
    const query = ptAssessmentPreviewQuerySchema.parse({
      courseId: sp.get('courseId') ?? undefined,
      semester: sp.get('semester') ?? undefined,
      ptTypeId: sp.get('ptTypeId') ?? undefined,
    });

    const courseMeta = await resolveCourseWithSemesters(query.courseId);
    assertSemesterAllowed(query.semester, courseMeta.allowedSemesters);

    const data = await buildPtAssessmentPreview(query);

    await req.audit.log({
      action: AuditEventType.API_REQUEST,
      outcome: 'SUCCESS',
      actor: { type: 'user', id: authCtx.userId },
      target: { type: AuditResourceType.COURSE, id: query.courseId },
      metadata: {
        description: 'Physical assessment preview generated.',
        module: 'reports',
        reportType: 'mil_training_physical_assessment',
        courseId: query.courseId,
        semester: query.semester,
        ptTypeId: query.ptTypeId,
        count: data.rows.length,
      },
    });

    return json.ok({
      message: 'Physical assessment preview fetched successfully.',
      data,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export const GET = withAuditRoute('GET', withAuthz(GETHandler));

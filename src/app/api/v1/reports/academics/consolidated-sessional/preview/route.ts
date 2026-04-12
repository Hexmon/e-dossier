import { handleApiError, json } from '@/app/lib/http';
import { consolidatedSessionalPreviewQuerySchema } from '@/app/lib/validators.reports';
import { assertSemesterAllowed, resolveCourseWithSemesters } from '@/app/lib/reports/semester-resolution';
import { buildConsolidatedSessionalPreview } from '@/app/lib/reports/report-data';
import { requireAuth } from '@/app/lib/authz';
import { withAuthz } from '@/app/lib/acx/withAuthz';
import { AuditEventType, AuditResourceType, withAuditRoute } from '@/lib/audit';
import type { AuditNextRequest } from '@/lib/audit';

export const runtime = 'nodejs';

async function GETHandler(req: AuditNextRequest) {
  try {
    const authCtx = await requireAuth(req);
    const sp = new URL(req.url).searchParams;
    const query = consolidatedSessionalPreviewQuerySchema.parse({
      courseId: sp.get('courseId') ?? undefined,
      semester: sp.get('semester') ?? undefined,
      subjectId: sp.get('subjectId') ?? undefined,
      subjectType: sp.get('subjectType') ?? undefined,
      branches: sp.get('branches') ?? undefined,
    });

    const courseMeta = await resolveCourseWithSemesters(query.courseId);
    assertSemesterAllowed(query.semester, courseMeta.allowedSemesters);

    const preview = await buildConsolidatedSessionalPreview(query);

    await req.audit.log({
      action: AuditEventType.API_REQUEST,
      outcome: 'SUCCESS',
      actor: { type: 'user', id: authCtx.userId },
      target: { type: AuditResourceType.COURSE, id: query.courseId },
      metadata: {
        description: 'Consolidated sessional preview generated.',
        module: 'reports',
        reportType: 'academics_consolidated_sessional',
        courseId: query.courseId,
        semester: query.semester,
        subjectId: query.subjectId,
        subjectType: query.subjectType ?? 'all',
        branchCount: query.branches.length,
        theoryCount: preview.theoryRows.length,
        practicalCount: preview.practicalRows.length,
      },
    });

    return json.ok({
      message: 'Consolidated sessional preview fetched successfully.',
      data: preview,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export const GET = withAuditRoute('GET', withAuthz(GETHandler));

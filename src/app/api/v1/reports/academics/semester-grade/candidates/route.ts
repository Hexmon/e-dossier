import { handleApiError, json } from '@/app/lib/http';
import { semesterGradeCandidatesQuerySchema } from '@/app/lib/validators.reports';
import { assertSemesterAllowed, resolveCourseWithSemesters } from '@/app/lib/reports/semester-resolution';
import { listSemesterGradeCandidates } from '@/app/lib/reports/report-data';
import { requireAuth } from '@/app/lib/authz';
import { withAuthz } from '@/app/lib/acx/withAuthz';
import { AuditEventType, AuditResourceType, withAuditRoute } from '@/lib/audit';
import type { AuditNextRequest } from '@/lib/audit';

export const runtime = 'nodejs';

async function GETHandler(req: AuditNextRequest) {
  try {
    const authCtx = await requireAuth(req);
    const sp = new URL(req.url).searchParams;
    const query = semesterGradeCandidatesQuerySchema.parse({
      courseId: sp.get('courseId') ?? undefined,
      semester: sp.get('semester') ?? undefined,
      branches: sp.get('branches') ?? undefined,
      q: sp.get('q') ?? undefined,
    });

    const courseMeta = await resolveCourseWithSemesters(query.courseId);
    assertSemesterAllowed(query.semester, courseMeta.allowedSemesters);

    const items = await listSemesterGradeCandidates({
      courseId: query.courseId,
      semester: query.semester,
      branches: query.branches,
      q: query.q,
    });

    await req.audit.log({
      action: AuditEventType.API_REQUEST,
      outcome: 'SUCCESS',
      actor: { type: 'user', id: authCtx.userId },
      target: { type: AuditResourceType.COURSE, id: query.courseId },
      metadata: {
        description: 'Semester grade candidates fetched.',
        module: 'reports',
        reportType: 'academics_semester_grade_candidates',
        courseId: query.courseId,
        semester: query.semester,
        branchCount: query.branches.length,
        count: items.length,
      },
    });

    return json.ok({
      message: 'Semester grade candidates fetched successfully.',
      items,
      count: items.length,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export const GET = withAuditRoute('GET', withAuthz(GETHandler));

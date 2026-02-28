import { z } from 'zod';
import { handleApiError, json } from '@/app/lib/http';
import { semesterGradePreviewQuerySchema } from '@/app/lib/validators.reports';
import { assertSemesterAllowed, resolveCourseWithSemesters } from '@/app/lib/reports/semester-resolution';
import { buildSemesterGradePreview } from '@/app/lib/reports/report-data';
import { requireAuth } from '@/app/lib/authz';
import { withAuthz } from '@/app/lib/acx/withAuthz';
import { AuditEventType, AuditResourceType, withAuditRoute } from '@/lib/audit';
import type { AuditNextRequest } from '@/lib/audit';

export const runtime = 'nodejs';

const OcIdParamsSchema = z.object({ ocId: z.string().uuid() });

async function GETHandler(
  req: AuditNextRequest,
  { params }: { params: Promise<{ ocId: string }> }
) {
  try {
    const authCtx = await requireAuth(req);
    const routeParams = OcIdParamsSchema.parse(await params);

    const sp = new URL(req.url).searchParams;
    const query = semesterGradePreviewQuerySchema.parse({
      courseId: sp.get('courseId') ?? undefined,
      semester: sp.get('semester') ?? undefined,
    });

    const courseMeta = await resolveCourseWithSemesters(query.courseId);
    assertSemesterAllowed(query.semester, courseMeta.allowedSemesters);

    const data = await buildSemesterGradePreview({
      courseId: query.courseId,
      semester: query.semester,
      ocId: routeParams.ocId,
    });

    await req.audit.log({
      action: AuditEventType.API_REQUEST,
      outcome: 'SUCCESS',
      actor: { type: 'user', id: authCtx.userId },
      target: { type: AuditResourceType.OC, id: routeParams.ocId },
      metadata: {
        description: 'Semester grade preview fetched for OC.',
        module: 'reports',
        reportType: 'academics_semester_grade_preview',
        courseId: query.courseId,
        semester: query.semester,
        ocId: routeParams.ocId,
      },
    });

    return json.ok({
      message: 'Semester grade preview fetched successfully.',
      data,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export const GET = withAuditRoute('GET', withAuthz(GETHandler));

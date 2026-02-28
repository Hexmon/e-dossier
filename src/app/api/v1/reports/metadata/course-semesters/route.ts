import { handleApiError, json } from '@/app/lib/http';
import { reportCourseSemesterMetadataQuerySchema } from '@/app/lib/validators.reports';
import { resolveCourseWithSemesters } from '@/app/lib/reports/semester-resolution';
import { requireAuth } from '@/app/lib/authz';
import { withAuthz } from '@/app/lib/acx/withAuthz';
import { AuditEventType, AuditResourceType, withAuditRoute } from '@/lib/audit';
import type { AuditNextRequest } from '@/lib/audit';

export const runtime = 'nodejs';

async function GETHandler(req: AuditNextRequest) {
  try {
    const authCtx = await requireAuth(req);
    const sp = new URL(req.url).searchParams;
    const query = reportCourseSemesterMetadataQuerySchema.parse({
      courseId: sp.get('courseId') ?? undefined,
    });

    const course = await resolveCourseWithSemesters(query.courseId);

    await req.audit.log({
      action: AuditEventType.API_REQUEST,
      outcome: 'SUCCESS',
      actor: { type: 'user', id: authCtx.userId },
      target: { type: AuditResourceType.COURSE, id: course.id },
      metadata: {
        description: 'Course semester metadata generated for reports.',
        module: 'reports',
        reportType: 'metadata_course_semesters',
        courseId: course.id,
        currentSemester: course.currentSemester,
      },
    });

    return json.ok({
      message: 'Course semester metadata fetched successfully.',
      data: {
        courseId: course.id,
        courseCode: course.code,
        courseTitle: course.title,
        currentSemester: course.currentSemester,
        allowedSemesters: course.allowedSemesters,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export const GET = withAuditRoute('GET', withAuthz(GETHandler));

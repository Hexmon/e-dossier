import { handleApiError } from '@/app/lib/http';
import { courseWisePerformanceDownloadBodySchema } from '@/app/lib/validators.reports';
import { assertSemesterAllowed, resolveCourseWithSemesters } from '@/app/lib/reports/semester-resolution';
import { buildCourseWisePerformancePreview } from '@/app/lib/reports/report-data';
import { REPORT_TYPES } from '@/app/lib/reports/types';
import { renderEncryptedPdf } from '@/app/lib/reports/pdf/pdf-engine';
import { renderCourseWisePerformanceTemplate } from '@/app/lib/reports/pdf/templates/course-wise-performance';
import { generateReportVersionId, sanitizePdfFileName } from '@/app/lib/reports/pdf/versioning';
import { createReportDownloadVersion } from '@/app/db/queries/reportDownloadVersions';
import { requireAuth } from '@/app/lib/authz';
import { withAuthz } from '@/app/lib/acx/withAuthz';
import { AuditEventType, AuditResourceType, withAuditRoute } from '@/lib/audit';
import type { AuditNextRequest } from '@/lib/audit';

export const runtime = 'nodejs';

async function POSTHandler(req: AuditNextRequest) {
  try {
    const authCtx = await requireAuth(req);
    const body = courseWisePerformanceDownloadBodySchema.parse(await req.json());

    const courseMeta = await resolveCourseWithSemesters(body.courseId);
    assertSemesterAllowed(body.semester, courseMeta.allowedSemesters);

    const preview = await buildCourseWisePerformancePreview({
      courseId: body.courseId,
      semester: body.semester,
    });

    const versionId = generateReportVersionId();
    const generatedAt = new Date();
    const fileName = sanitizePdfFileName(
      `course-wise-performance-${preview.course.code}-sem-${body.semester}-${versionId}.pdf`
    );
    const pdfSize = preview.columns.length > 11 ? 'A3' : 'A4';

    const pdf = await renderEncryptedPdf(
      {
        password: body.password,
        title: 'Course Wise Performance Record',
        layout: 'landscape',
        size: pdfSize,
      },
      (doc) => {
        renderCourseWisePerformanceTemplate(doc, preview, {
          versionId,
          generatedAt,
        });
      }
    );

    await createReportDownloadVersion({
      versionId,
      reportType: REPORT_TYPES.OVERALL_TRAINING_COURSE_WISE_PERFORMANCE,
      requestedByUserId: authCtx.userId,
      filters: {
        courseId: body.courseId,
        semester: body.semester,
        ocCount: preview.rows.length,
        maxTotalForSemester: preview.maxTotalForSemester,
        format: 'pdf',
      },
      preparedBy: '-',
      checkedBy: '-',
      fileName,
      encrypted: true,
      checksumSha256: pdf.checksumSha256,
    });

    await req.audit.log({
      action: AuditEventType.SENSITIVE_DATA_EXPORTED,
      outcome: 'SUCCESS',
      actor: { type: 'user', id: authCtx.userId },
      target: { type: AuditResourceType.COURSE, id: body.courseId },
      metadata: {
        description: 'Course wise performance report downloaded.',
        module: 'reports',
        reportType: REPORT_TYPES.OVERALL_TRAINING_COURSE_WISE_PERFORMANCE,
        courseId: body.courseId,
        semester: body.semester,
        versionId,
        ocCount: preview.rows.length,
      },
    });

    return new Response(Uint8Array.from(pdf.buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export const POST = withAuditRoute('POST', withAuthz(POSTHandler));


import { handleApiError } from '@/app/lib/http';
import { courseWiseFinalPerformanceDownloadBodySchema } from '@/app/lib/validators.reports';
import { buildCourseWiseFinalPerformancePreview } from '@/app/lib/reports/report-data';
import { REPORT_TYPES } from '@/app/lib/reports/types';
import { renderEncryptedPdf } from '@/app/lib/reports/pdf/pdf-engine';
import { renderCourseWiseFinalPerformanceTemplate } from '@/app/lib/reports/pdf/templates/course-wise-final-performance';
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
    const body = courseWiseFinalPerformanceDownloadBodySchema.parse(await req.json());

    const preview = await buildCourseWiseFinalPerformancePreview({
      courseId: body.courseId,
    });

    const versionId = generateReportVersionId();
    const generatedAt = new Date();
    const fileName = sanitizePdfFileName(
      `course-wise-final-performance-${preview.course.code}-${versionId}.pdf`
    );

    const pdf = await renderEncryptedPdf(
      {
        password: body.password,
        title: 'Course Wise Final Performance Record',
        layout: 'landscape',
        size: 'A4',
      },
      (doc) => {
        renderCourseWiseFinalPerformanceTemplate(doc, preview, {
          versionId,
          generatedAt,
        });
      }
    );

    await createReportDownloadVersion({
      versionId,
      reportType: REPORT_TYPES.OVERALL_TRAINING_COURSE_WISE_FINAL_PERFORMANCE,
      requestedByUserId: authCtx.userId,
      filters: {
        courseId: body.courseId,
        ocCount: preview.rows.length,
        maxTotal: preview.maxTotal,
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
        description: 'Course wise final performance report downloaded.',
        module: 'reports',
        reportType: REPORT_TYPES.OVERALL_TRAINING_COURSE_WISE_FINAL_PERFORMANCE,
        courseId: body.courseId,
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

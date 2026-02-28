import { handleApiError } from '@/app/lib/http';
import { ptAssessmentDownloadBodySchema } from '@/app/lib/validators.reports';
import { assertSemesterAllowed, resolveCourseWithSemesters } from '@/app/lib/reports/semester-resolution';
import { buildPtAssessmentPreview } from '@/app/lib/reports/report-data';
import { REPORT_TYPES } from '@/app/lib/reports/types';
import { renderEncryptedPdf } from '@/app/lib/reports/pdf/pdf-engine';
import { renderPtAssessmentTemplate } from '@/app/lib/reports/pdf/templates/pt-assessment';
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
    const body = ptAssessmentDownloadBodySchema.parse(await req.json());

    const courseMeta = await resolveCourseWithSemesters(body.courseId);
    assertSemesterAllowed(body.semester, courseMeta.allowedSemesters);

    const preview = await buildPtAssessmentPreview(body);
    const versionId = generateReportVersionId();
    const generatedAt = new Date();

    const fileName = sanitizePdfFileName(
      `pt-assessment-${preview.course.code}-sem-${body.semester}-${preview.ptType.code}-${versionId}.pdf`
    );

    const pdf = await renderEncryptedPdf(
      {
        password: body.password,
        title: 'Physical Assessment Training Report',
        layout: 'landscape',
      },
      (doc) => {
        renderPtAssessmentTemplate(doc, preview, {
          versionId,
          preparedBy: body.preparedBy,
          checkedBy: body.checkedBy,
          generatedAt,
        });
      }
    );

    await createReportDownloadVersion({
      versionId,
      reportType: REPORT_TYPES.MIL_TRAINING_PHYSICAL_ASSESSMENT,
      requestedByUserId: authCtx.userId,
      filters: {
        courseId: body.courseId,
        semester: body.semester,
        ptTypeId: body.ptTypeId,
      },
      preparedBy: body.preparedBy,
      checkedBy: body.checkedBy,
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
        description: 'Physical assessment report downloaded.',
        module: 'reports',
        reportType: REPORT_TYPES.MIL_TRAINING_PHYSICAL_ASSESSMENT,
        courseId: body.courseId,
        semester: body.semester,
        ptTypeId: body.ptTypeId,
        versionId,
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

import { handleApiError, json } from '@/app/lib/http';
import { consolidatedSessionalDownloadBodySchema } from '@/app/lib/validators.reports';
import { assertSemesterAllowed, resolveCourseWithSemesters } from '@/app/lib/reports/semester-resolution';
import { buildConsolidatedSessionalPreview } from '@/app/lib/reports/report-data';
import { REPORT_TYPES } from '@/app/lib/reports/types';
import { renderEncryptedPdf } from '@/app/lib/reports/pdf/pdf-engine';
import { renderConsolidatedSessionalTemplate } from '@/app/lib/reports/pdf/templates/consolidated-sessional';
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
    const body = consolidatedSessionalDownloadBodySchema.parse(await req.json());

    const courseMeta = await resolveCourseWithSemesters(body.courseId);
    assertSemesterAllowed(body.semester, courseMeta.allowedSemesters);

    const preview = await buildConsolidatedSessionalPreview(body);
    const versionId = generateReportVersionId();
    const generatedAt = new Date();
    const fileName = sanitizePdfFileName(
      `consolidated-sessional-${preview.course.code}-sem-${body.semester}-${preview.subject.code}-${versionId}.pdf`
    );

    const pdf = await renderEncryptedPdf(
      {
        password: body.password,
        title: 'Consolidated Sessional Mark Sheet',
        layout: 'landscape',
      },
      (doc) => {
        renderConsolidatedSessionalTemplate(doc, preview, {
          versionId,
          preparedBy: body.preparedBy,
          checkedBy: body.checkedBy,
          generatedAt,
        });
      }
    );

    await createReportDownloadVersion({
      versionId,
      reportType: REPORT_TYPES.ACADEMICS_CONSOLIDATED_SESSIONAL,
      requestedByUserId: authCtx.userId,
      filters: {
        courseId: body.courseId,
        semester: body.semester,
        subjectId: body.subjectId,
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
        description: 'Consolidated sessional report downloaded.',
        module: 'reports',
        reportType: REPORT_TYPES.ACADEMICS_CONSOLIDATED_SESSIONAL,
        courseId: body.courseId,
        semester: body.semester,
        subjectId: body.subjectId,
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
    if (error instanceof Response) return error;
    return handleApiError(error);
  }
}

export const POST = withAuditRoute('POST', withAuthz(POSTHandler));

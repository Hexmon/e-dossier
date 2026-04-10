import { createHash } from 'node:crypto';
import { handleApiError } from '@/app/lib/http';
import { finalResultCompilationDownloadBodySchema } from '@/app/lib/validators.reports';
import { assertSemesterAllowed, resolveCourseWithSemesters } from '@/app/lib/reports/semester-resolution';
import { buildFinalResultCompilationPreview } from '@/app/lib/reports/report-data';
import { REPORT_TYPES } from '@/app/lib/reports/types';
import { renderEncryptedPdf } from '@/app/lib/reports/pdf/pdf-engine';
import { renderFinalResultCompilationTemplate } from '@/app/lib/reports/pdf/templates/final-result-compilation';
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
    const body = finalResultCompilationDownloadBodySchema.parse(await req.json());

    const courseMeta = await resolveCourseWithSemesters(body.courseId);
    assertSemesterAllowed(body.semester, courseMeta.allowedSemesters);

    const preview = await buildFinalResultCompilationPreview({
      courseId: body.courseId,
      semester: body.semester,
      branches: body.branches,
    });

    const identityHash = createHash('sha256')
      .update(
        JSON.stringify(
          preview.rows
            .map((row) => ({
              ocId: row.ocId,
              enrolmentNumber: row.enrolmentNumber,
              certSerialNo: row.certSerialNo,
            }))
            .sort((a, b) => a.ocId.localeCompare(b.ocId))
        )
      )
      .digest('hex');

    const versionId = generateReportVersionId();
    const generatedAt = new Date();
    const fileName = sanitizePdfFileName(
      `final-result-compilation-${preview.course.code}-sem-${body.semester}-${versionId}.pdf`
    );

    const preparedBy = body.preparedBy?.trim() || '-';
    const checkedBy = body.checkedBy?.trim() || '-';
    const pdf = await renderEncryptedPdf(
      {
        password: body.password,
        title: 'Final Result Compilation Sheet',
        layout: 'landscape',
        size: 'A4',
      },
      (doc) => {
        renderFinalResultCompilationTemplate(doc, preview, {
          versionId,
          generatedAt,
          preparedBy,
          checkedBy,
        });
      }
    );

    await createReportDownloadVersion({
      versionId,
      reportType: REPORT_TYPES.ACADEMICS_FINAL_RESULT_COMPILATION,
      requestedByUserId: authCtx.userId,
      filters: {
        courseId: body.courseId,
        semester: body.semester,
        branches: body.branches,
        branchCount: body.branches.length,
        ocCount: preview.rows.length,
        subjectColumnCount: preview.subjectColumns.length,
        identityHash,
        format: 'pdf',
      },
      preparedBy,
      checkedBy,
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
        description: 'Final result compilation report downloaded.',
        module: 'reports',
        reportType: REPORT_TYPES.ACADEMICS_FINAL_RESULT_COMPILATION,
        courseId: body.courseId,
        semester: body.semester,
        branchCount: body.branches.length,
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

import { createHash } from 'node:crypto';
import { ApiError, handleApiError } from '@/app/lib/http';
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
    const sectionLabel = body.section === 'theory' ? 'Theory' : 'Practical';
    const sectionAvailable =
      body.section === 'theory' ? preview.subject.hasTheory : preview.subject.hasPractical;

    if (!sectionAvailable) {
      throw new ApiError(400, `${sectionLabel} sessional marksheet is not available for this subject.`, 'bad_request');
    }

    const versionId = generateReportVersionId();
    const generatedAt = new Date();
    const preparedBy = body.preparedBy?.trim() || '-';
    const checkedBy = body.checkedBy?.trim() || '-';
    const instructorName = body.instructorName?.trim() || preview.subject.instructorName?.trim() || '-';

    const fileName = sanitizePdfFileName(
      `consolidated-sessional-${body.section}-${preview.course.code}-sem-${body.semester}-${preview.subject.code}-${versionId}.pdf`
    );

    const pdf = await renderEncryptedPdf(
      {
        password: body.password,
        title: `${sectionLabel} Consolidated Sessional Mark Sheet`,
        layout: 'landscape',
      },
      (doc) => {
        renderConsolidatedSessionalTemplate(doc, preview, {
          versionId,
          preparedBy,
          checkedBy,
          instructorName,
          generatedAt,
        }, body.section);
      }
    );

    const checksumSha256 = createHash('sha256').update(pdf.buffer).digest('hex');

    await createReportDownloadVersion({
      versionId,
      reportType: REPORT_TYPES.ACADEMICS_CONSOLIDATED_SESSIONAL,
      requestedByUserId: authCtx.userId,
      filters: {
        courseId: body.courseId,
        semester: body.semester,
        subjectId: body.subjectId,
        section: body.section,
        instructorName,
        format: 'pdf',
      },
      preparedBy,
      checkedBy,
      fileName,
      encrypted: true,
      checksumSha256,
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
        section: body.section,
        format: 'pdf',
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

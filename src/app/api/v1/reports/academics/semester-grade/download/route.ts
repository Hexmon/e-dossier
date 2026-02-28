import { randomUUID } from 'node:crypto';
import { handleApiError } from '@/app/lib/http';
import { semesterGradeDownloadBodySchema } from '@/app/lib/validators.reports';
import { assertSemesterAllowed, resolveCourseWithSemesters } from '@/app/lib/reports/semester-resolution';
import { buildSemesterGradePreview } from '@/app/lib/reports/report-data';
import { REPORT_TYPES } from '@/app/lib/reports/types';
import { renderEncryptedPdf } from '@/app/lib/reports/pdf/pdf-engine';
import { renderSemesterGradeTemplate } from '@/app/lib/reports/pdf/templates/semester-grade';
import { buildZipBuffer } from '@/app/lib/reports/pdf/zip';
import { generateReportVersionId, sanitizePdfFileName } from '@/app/lib/reports/pdf/versioning';
import {
  createReportDownloadVersion,
  createReportDownloadVersionsBatch,
} from '@/app/db/queries/reportDownloadVersions';
import { requireAuth } from '@/app/lib/authz';
import { withAuthz } from '@/app/lib/acx/withAuthz';
import { AuditEventType, AuditResourceType, withAuditRoute } from '@/lib/audit';
import type { AuditNextRequest } from '@/lib/audit';

export const runtime = 'nodejs';

type BuiltPdf = {
  ocId: string;
  versionId: string;
  fileName: string;
  checksumSha256: string;
  buffer: Buffer;
};

async function POSTHandler(req: AuditNextRequest) {
  try {
    const authCtx = await requireAuth(req);
    const body = semesterGradeDownloadBodySchema.parse(await req.json());

    const courseMeta = await resolveCourseWithSemesters(body.courseId);
    assertSemesterAllowed(body.semester, courseMeta.allowedSemesters);

    const generatedAt = new Date();
    const batchId = body.ocIds.length > 1 ? randomUUID() : null;

    const builtPdfs: BuiltPdf[] = [];

    for (const ocId of body.ocIds) {
      const preview = await buildSemesterGradePreview({
        courseId: body.courseId,
        semester: body.semester,
        ocId,
      });

      const versionId = generateReportVersionId();
      const fileName = sanitizePdfFileName(
        `semester-grade-${preview.course.code}-sem-${body.semester}-${preview.oc.ocNo}-${versionId}.pdf`
      );

      const pdf = await renderEncryptedPdf(
        {
          password: body.password,
          title: `Semester Grade Report - ${preview.oc.name}`,
        },
        (doc) => {
          renderSemesterGradeTemplate(doc, preview, {
            versionId,
            preparedBy: body.preparedBy,
            checkedBy: body.checkedBy,
            generatedAt,
          });
        }
      );

      builtPdfs.push({
        ocId,
        versionId,
        fileName,
        checksumSha256: pdf.checksumSha256,
        buffer: pdf.buffer,
      });
    }

    if (builtPdfs.length === 1) {
      const only = builtPdfs[0];
      await createReportDownloadVersion({
        versionId: only.versionId,
        reportType: REPORT_TYPES.ACADEMICS_SEMESTER_GRADE,
        requestedByUserId: authCtx.userId,
        filters: {
          courseId: body.courseId,
          semester: body.semester,
          ocIds: body.ocIds,
        },
        preparedBy: body.preparedBy,
        checkedBy: body.checkedBy,
        fileName: only.fileName,
        encrypted: true,
        checksumSha256: only.checksumSha256,
        batchId,
      });

      await req.audit.log({
        action: AuditEventType.SENSITIVE_DATA_EXPORTED,
        outcome: 'SUCCESS',
        actor: { type: 'user', id: authCtx.userId },
        target: { type: AuditResourceType.OC, id: only.ocId },
        metadata: {
          description: 'Semester grade report downloaded.',
          module: 'reports',
          reportType: REPORT_TYPES.ACADEMICS_SEMESTER_GRADE,
          courseId: body.courseId,
          semester: body.semester,
          ocId: only.ocId,
          versionId: only.versionId,
        },
      });

      return new Response(Uint8Array.from(only.buffer), {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${only.fileName}"`,
          'Cache-Control': 'no-store',
        },
      });
    }

    await createReportDownloadVersionsBatch(
      builtPdfs.map((item) => ({
        versionId: item.versionId,
        reportType: REPORT_TYPES.ACADEMICS_SEMESTER_GRADE,
        requestedByUserId: authCtx.userId,
        filters: {
          courseId: body.courseId,
          semester: body.semester,
          ocId: item.ocId,
          batchId,
          totalCadets: body.ocIds.length,
        },
        preparedBy: body.preparedBy,
        checkedBy: body.checkedBy,
        fileName: item.fileName,
        encrypted: true,
        checksumSha256: item.checksumSha256,
        batchId,
      }))
    );

    const zipFileName = sanitizePdfFileName(
      `semester-grade-batch-${courseMeta.code}-sem-${body.semester}-${generatedAt
        .toISOString()
        .slice(0, 10)}.zip`
    );
    const zipBuffer = await buildZipBuffer(
      builtPdfs.map((item) => ({ name: item.fileName, data: item.buffer }))
    );

    await req.audit.log({
      action: AuditEventType.SENSITIVE_DATA_EXPORTED,
      outcome: 'SUCCESS',
      actor: { type: 'user', id: authCtx.userId },
      target: { type: AuditResourceType.COURSE, id: body.courseId },
      metadata: {
        description: 'Semester grade reports downloaded in batch ZIP.',
        module: 'reports',
        reportType: REPORT_TYPES.ACADEMICS_SEMESTER_GRADE,
        courseId: body.courseId,
        semester: body.semester,
        batchId,
        count: builtPdfs.length,
        versionIds: builtPdfs.map((item) => item.versionId),
      },
    });

    return new Response(Uint8Array.from(zipBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${zipFileName}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export const POST = withAuditRoute('POST', withAuthz(POSTHandler));

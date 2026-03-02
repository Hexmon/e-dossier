import { withAuthz } from '@/app/lib/acx/withAuthz';
import { requireAdmin } from '@/app/lib/authz';
import { handleApiError, json } from '@/app/lib/http';
import { verifyReportVersionByCodeAndFile } from '@/app/lib/reports/verification';
import { reportVerificationVersionCodeSchema } from '@/app/lib/validators.reports';
import { AuditEventType, AuditResourceType, type AuditNextRequest, withAuditRoute } from '@/lib/audit';

export const runtime = 'nodejs';

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

function isPdfFile(file: File): boolean {
  if (file.type === 'application/pdf') return true;
  return file.name.toLowerCase().endsWith('.pdf');
}

async function POSTHandler(req: AuditNextRequest) {
  try {
    const auth = await requireAdmin(req);
    const contentType = req.headers.get('content-type') ?? '';
    if (!contentType.includes('multipart/form-data')) {
      return json.badRequest('Use multipart/form-data with versionId and optional PDF file.');
    }

    const formData = await req.formData();
    const parsedVersionId = reportVerificationVersionCodeSchema.safeParse(formData.get('versionId'));
    if (!parsedVersionId.success) {
      return json.badRequest('Valid versionId is required.');
    }
    const versionId = parsedVersionId.data.toUpperCase();

    const fileEntry = formData.get('file');
    let uploadedPdfBuffer: Buffer | null = null;
    if (fileEntry instanceof File) {
      if (fileEntry.size > 0) {
        if (!isPdfFile(fileEntry)) {
          return json.badRequest('Only PDF files are allowed for verification.');
        }
        if (fileEntry.size > MAX_UPLOAD_BYTES) {
          return json.badRequest('PDF file too large. Maximum allowed size is 25 MB.');
        }
        uploadedPdfBuffer = Buffer.from(await fileEntry.arrayBuffer());
      }
    } else if (fileEntry !== null && fileEntry !== '') {
      return json.badRequest('Invalid file input.');
    }

    const result = await verifyReportVersionByCodeAndFile({
      versionId,
      uploadedPdf: uploadedPdfBuffer,
    });

    await req.audit.log({
      action: AuditEventType.SENSITIVE_DATA_ACCESSED,
      outcome: result.overallVerdict === 'NOT_AUTHENTIC' ? 'FAILURE' : 'SUCCESS',
      actor: { type: 'user', id: auth.userId },
      target: { type: AuditResourceType.API, id: '/api/v1/admin/reports/verification/verify' },
      metadata: {
        description: 'Verified report PDF authenticity by version code and optional checksum.',
        versionId: result.versionId,
        codeStatus: result.codeStatus,
        fileStatus: result.fileStatus,
        overallVerdict: result.overallVerdict,
      },
    });

    return json.ok({
      message: 'Report verification completed.',
      data: result,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export const POST = withAuditRoute('POST', withAuthz(POSTHandler));

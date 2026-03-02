import { createHash } from 'node:crypto';
import { getReportDownloadVersionByVersionId } from '@/app/db/queries/reportDownloadVersions';

export type ReportVerificationCodeStatus = 'FOUND' | 'NOT_FOUND';
export type ReportVerificationFileStatus =
  | 'NOT_PROVIDED'
  | 'MATCH'
  | 'MISMATCH'
  | 'CHECKSUM_UNAVAILABLE';
export type ReportVerificationVerdict =
  | 'AUTHENTIC_EXACT'
  | 'AUTHENTIC_CODE_ONLY'
  | 'NOT_AUTHENTIC';

export type ReportVerificationResult = {
  versionId: string;
  codeStatus: ReportVerificationCodeStatus;
  fileStatus: ReportVerificationFileStatus;
  overallVerdict: ReportVerificationVerdict;
  details: {
    reportType: string;
    generatedAt: string;
    requestedBy: {
      id: string | null;
      username: string | null;
      name: string | null;
      rank: string | null;
    };
    fileName: string;
    encrypted: boolean;
    preparedBy: string;
    checkedBy: string;
    batchId: string | null;
    filters: Record<string, unknown>;
    checksumSha256: string | null;
  } | null;
};

function hashSha256(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex');
}

export async function verifyReportVersionByCodeAndFile(input: {
  versionId: string;
  uploadedPdf?: Buffer | null;
}): Promise<ReportVerificationResult> {
  const versionId = input.versionId.trim();
  const uploadedChecksum = input.uploadedPdf ? hashSha256(input.uploadedPdf) : null;
  const record = await getReportDownloadVersionByVersionId(versionId);

  if (!record) {
    return {
      versionId,
      codeStatus: 'NOT_FOUND',
      fileStatus: uploadedChecksum ? 'MISMATCH' : 'NOT_PROVIDED',
      overallVerdict: 'NOT_AUTHENTIC',
      details: null,
    };
  }

  const details = {
    reportType: record.reportType,
    generatedAt: record.generatedAt.toISOString(),
    requestedBy: {
      id: record.requestedByUserId ?? null,
      username: record.requestedByUsername ?? null,
      name: record.requestedByName ?? null,
      rank: record.requestedByRank ?? null,
    },
    fileName: record.fileName,
    encrypted: record.encrypted,
    preparedBy: record.preparedBy,
    checkedBy: record.checkedBy,
    batchId: record.batchId ?? null,
    filters: record.filters ?? {},
    checksumSha256: record.checksumSha256 ?? null,
  } satisfies ReportVerificationResult['details'];

  if (!uploadedChecksum) {
    return {
      versionId,
      codeStatus: 'FOUND',
      fileStatus: 'NOT_PROVIDED',
      overallVerdict: 'AUTHENTIC_CODE_ONLY',
      details,
    };
  }

  if (!record.checksumSha256) {
    return {
      versionId,
      codeStatus: 'FOUND',
      fileStatus: 'CHECKSUM_UNAVAILABLE',
      overallVerdict: 'AUTHENTIC_CODE_ONLY',
      details,
    };
  }

  const isMatch = record.checksumSha256 === uploadedChecksum;
  return {
    versionId,
    codeStatus: 'FOUND',
    fileStatus: isMatch ? 'MATCH' : 'MISMATCH',
    overallVerdict: isMatch ? 'AUTHENTIC_EXACT' : 'NOT_AUTHENTIC',
    details,
  };
}

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

export type ReportVerificationDetails = {
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
};

export type ReportVerificationResult = {
  versionId: string;
  codeStatus: ReportVerificationCodeStatus;
  fileStatus: ReportVerificationFileStatus;
  overallVerdict: ReportVerificationVerdict;
  details: ReportVerificationDetails | null;
};

export type ReportVerificationRequest = {
  versionId: string;
  file?: File | null;
};

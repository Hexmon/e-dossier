import { describe, expect, it, vi, beforeEach } from 'vitest';

const getReportDownloadVersionByVersionIdMock = vi.fn();

vi.mock('@/app/db/queries/reportDownloadVersions', () => ({
  getReportDownloadVersionByVersionId: getReportDownloadVersionByVersionIdMock,
}));

describe('verifyReportVersionByCodeAndFile', () => {
  beforeEach(() => {
    getReportDownloadVersionByVersionIdMock.mockReset();
  });

  it('returns NOT_AUTHENTIC when version code is not found', async () => {
    getReportDownloadVersionByVersionIdMock.mockResolvedValue(null);
    const { verifyReportVersionByCodeAndFile } = await import('@/app/lib/reports/verification');

    const result = await verifyReportVersionByCodeAndFile({ versionId: 'RPT-260302-123456' });

    expect(result.codeStatus).toBe('NOT_FOUND');
    expect(result.overallVerdict).toBe('NOT_AUTHENTIC');
    expect(result.fileStatus).toBe('NOT_PROVIDED');
    expect(result.details).toBeNull();
  });

  it('returns AUTHENTIC_CODE_ONLY when code exists and file is not provided', async () => {
    getReportDownloadVersionByVersionIdMock.mockResolvedValue({
      versionId: 'RPT-260302-123456',
      reportType: 'ACADEMICS_SEMESTER_GRADE',
      requestedByUserId: 'u-1',
      generatedAt: new Date('2026-03-02T12:00:00.000Z'),
      filters: { courseId: 'c-1' },
      preparedBy: 'prep',
      checkedBy: 'check',
      fileName: 'test.pdf',
      encrypted: true,
      checksumSha256: 'abc123',
      batchId: null,
      requestedByUsername: 'admin',
      requestedByName: 'Admin User',
      requestedByRank: 'Maj',
    });
    const { verifyReportVersionByCodeAndFile } = await import('@/app/lib/reports/verification');

    const result = await verifyReportVersionByCodeAndFile({ versionId: 'RPT-260302-123456' });

    expect(result.codeStatus).toBe('FOUND');
    expect(result.fileStatus).toBe('NOT_PROVIDED');
    expect(result.overallVerdict).toBe('AUTHENTIC_CODE_ONLY');
    expect(result.details?.requestedBy.username).toBe('admin');
  });

  it('returns AUTHENTIC_EXACT when file checksum matches', async () => {
    const content = Buffer.from('pdf-file-content');
    getReportDownloadVersionByVersionIdMock.mockResolvedValue({
      versionId: 'RPT-260302-123456',
      reportType: 'ACADEMICS_SEMESTER_GRADE',
      requestedByUserId: null,
      generatedAt: new Date('2026-03-02T12:00:00.000Z'),
      filters: {},
      preparedBy: '-',
      checkedBy: '-',
      fileName: 'test.pdf',
      encrypted: true,
      checksumSha256: 'c5b8e2aea4424e884c151f4f48bfb369068a8a2641432d856f9220f69dbd70de',
      batchId: null,
      requestedByUsername: null,
      requestedByName: null,
      requestedByRank: null,
    });
    const { verifyReportVersionByCodeAndFile } = await import('@/app/lib/reports/verification');

    const result = await verifyReportVersionByCodeAndFile({
      versionId: 'RPT-260302-123456',
      uploadedPdf: content,
    });

    expect(result.fileStatus).toBe('MATCH');
    expect(result.overallVerdict).toBe('AUTHENTIC_EXACT');
  });

  it('returns NOT_AUTHENTIC when file checksum mismatches', async () => {
    getReportDownloadVersionByVersionIdMock.mockResolvedValue({
      versionId: 'RPT-260302-123456',
      reportType: 'ACADEMICS_SEMESTER_GRADE',
      requestedByUserId: null,
      generatedAt: new Date('2026-03-02T12:00:00.000Z'),
      filters: {},
      preparedBy: '-',
      checkedBy: '-',
      fileName: 'test.pdf',
      encrypted: true,
      checksumSha256: 'deadbeef',
      batchId: null,
      requestedByUsername: null,
      requestedByName: null,
      requestedByRank: null,
    });
    const { verifyReportVersionByCodeAndFile } = await import('@/app/lib/reports/verification');

    const result = await verifyReportVersionByCodeAndFile({
      versionId: 'RPT-260302-123456',
      uploadedPdf: Buffer.from('different-content'),
    });

    expect(result.fileStatus).toBe('MISMATCH');
    expect(result.overallVerdict).toBe('NOT_AUTHENTIC');
  });

  it('returns AUTHENTIC_CODE_ONLY with CHECKSUM_UNAVAILABLE when checksum not stored', async () => {
    getReportDownloadVersionByVersionIdMock.mockResolvedValue({
      versionId: 'RPT-260302-123456',
      reportType: 'ACADEMICS_SEMESTER_GRADE',
      requestedByUserId: null,
      generatedAt: new Date('2026-03-02T12:00:00.000Z'),
      filters: {},
      preparedBy: '-',
      checkedBy: '-',
      fileName: 'test.pdf',
      encrypted: true,
      checksumSha256: null,
      batchId: null,
      requestedByUsername: null,
      requestedByName: null,
      requestedByRank: null,
    });
    const { verifyReportVersionByCodeAndFile } = await import('@/app/lib/reports/verification');

    const result = await verifyReportVersionByCodeAndFile({
      versionId: 'RPT-260302-123456',
      uploadedPdf: Buffer.from('any-content'),
    });

    expect(result.fileStatus).toBe('CHECKSUM_UNAVAILABLE');
    expect(result.overallVerdict).toBe('AUTHENTIC_CODE_ONLY');
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GET as previewFinalResultCompilation } from '@/app/api/v1/reports/academics/final-result-compilation/preview/route';
import { POST as downloadFinalResultCompilation } from '@/app/api/v1/reports/academics/final-result-compilation/download/route';
import { ApiError } from '@/app/lib/http';
import { makeJsonRequest, createRouteContext } from '../utils/next';

import * as authz from '@/app/lib/authz';
import * as semesterResolution from '@/app/lib/reports/semester-resolution';
import * as reportData from '@/app/lib/reports/report-data';
import * as pdfEngine from '@/app/lib/reports/pdf/pdf-engine';
import * as versioning from '@/app/lib/reports/pdf/versioning';
import * as reportDownloadVersions from '@/app/db/queries/reportDownloadVersions';

const auditLogMock = vi.fn(async () => undefined);
const courseId = '33333333-3333-4333-8333-333333333333';

vi.mock('@/app/lib/acx/withAuthz', () => ({
  withAuthz: (handler: any) => handler,
}));

vi.mock('@/lib/audit', () => ({
  withAuditRoute: (_method: string, handler: any) => {
    return (req: any, context: any) => {
      req.audit = { log: auditLogMock };
      return handler(req, context);
    };
  },
  AuditEventType: {
    API_REQUEST: 'ACCESS.REQUEST',
    SENSITIVE_DATA_EXPORTED: 'SECURITY.DATA_EXPORT',
  },
  AuditResourceType: {
    COURSE: 'course',
  },
}));

vi.mock('@/app/lib/authz', () => ({
  requireAuth: vi.fn(),
}));

vi.mock('@/app/lib/reports/semester-resolution', () => ({
  resolveCourseWithSemesters: vi.fn(),
  assertSemesterAllowed: vi.fn(),
}));

vi.mock('@/app/lib/reports/report-data', () => ({
  buildFinalResultCompilationPreview: vi.fn(),
}));

vi.mock('@/app/lib/reports/pdf/pdf-engine', () => ({
  renderEncryptedPdf: vi.fn(),
}));

vi.mock('@/app/lib/reports/pdf/versioning', () => ({
  generateReportVersionId: vi.fn(),
  sanitizePdfFileName: vi.fn(),
}));

vi.mock('@/app/db/queries/reportDownloadVersions', () => ({
  createReportDownloadVersion: vi.fn(),
}));

const previewData = {
  reportType: 'ACADEMICS_FINAL_RESULT_COMPILATION',
  course: {
    id: courseId,
    code: 'TES-50',
    title: 'TES 50',
  },
  semester: 4,
  subjectColumns: [
    {
      subjectId: '44444444-4444-4444-8444-444444444444',
      subjectCode: 'EC-401',
      subjectName: 'Electronic Circuits II',
      branch: 'E',
      order: 0,
      components: [
        { key: '44444444-4444-4444-8444-444444444444:L', kind: 'L', credits: 2 },
        { key: '44444444-4444-4444-8444-444444444444:P', kind: 'P', credits: 1 },
      ],
    },
  ],
  rows: [
    {
      ocId: '55555555-5555-4555-8555-555555555555',
      sNo: 1,
      tesNo: '4046',
      name: 'Cadet One',
      branchTag: 'E',
      enrolmentNumber: 'MCEME/TES-50/001',
      certSerialNo: 'TES-50/Sem-IV(E)/01',
      previousCumulativePoints: 492,
      previousCumulativeCredits: 66,
      previousCumulativeCgpa: 7.45,
      semesterPoints: 177,
      semesterCredits: 22,
      semesterSgpa: 8.04,
      uptoSemesterPoints: 669,
      uptoSemesterCredits: 88,
      uptoSemesterCgpa: 7.6,
      subjectGrades: {
        '44444444-4444-4444-8444-444444444444:L': 'AO',
        '44444444-4444-4444-8444-444444444444:P': 'AP',
      },
    },
  ],
  gradeBands: [],
  semesterCreditsTotal: 22,
  previousSemesterCreditsReference: 66,
  uptoSemesterCreditsReference: 88,
};

beforeEach(() => {
  vi.clearAllMocks();

  vi.mocked(authz.requireAuth).mockResolvedValue({
    userId: 'user-1',
    roles: ['ADMIN'],
    claims: {},
  } as Awaited<ReturnType<typeof authz.requireAuth>>);

  vi.mocked(semesterResolution.resolveCourseWithSemesters).mockResolvedValue({
    id: courseId,
    code: 'TES-50',
    title: 'TES 50',
    currentSemester: 4,
    allowedSemesters: [1, 2, 3, 4, 5, 6],
  } as Awaited<ReturnType<typeof semesterResolution.resolveCourseWithSemesters>>);

  vi.mocked(reportData.buildFinalResultCompilationPreview).mockResolvedValue(
    previewData as Awaited<ReturnType<typeof reportData.buildFinalResultCompilationPreview>>,
  );

  vi.mocked(pdfEngine.renderEncryptedPdf).mockResolvedValue({
    buffer: Buffer.from('pdf'),
    checksumSha256: 'checksum',
  } as Awaited<ReturnType<typeof pdfEngine.renderEncryptedPdf>>);

  vi.mocked(versioning.generateReportVersionId).mockReturnValue('RPT-0001');
  vi.mocked(versioning.sanitizePdfFileName).mockImplementation((fileName) => fileName);
});

describe('Final result compilation report routes', () => {
  it('preview returns 401 when auth fails', async () => {
    vi.mocked(authz.requireAuth).mockRejectedValueOnce(
      new ApiError(401, 'Unauthorized', 'unauthorized'),
    );

    const req = makeJsonRequest({
      method: 'GET',
      path: `/api/v1/reports/academics/final-result-compilation/preview?courseId=${courseId}&semester=4`,
    });

    const res = await previewFinalResultCompilation(req as any, createRouteContext());

    expect(res.status).toBe(401);
  });

  it('preview returns grouped subject data with db-driven identity fields', async () => {
    const req = makeJsonRequest({
      method: 'GET',
      path: `/api/v1/reports/academics/final-result-compilation/preview?courseId=${courseId}&semester=4`,
    });

    const res = await previewFinalResultCompilation(req as any, createRouteContext());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.message).toBe('Final result compilation preview fetched successfully.');
    expect(body.data).toEqual(previewData);
    expect(reportData.buildFinalResultCompilationPreview).toHaveBeenCalledWith({
      courseId,
      semester: 4,
    });
  });

  it('download returns an encrypted pdf using derived enrollment and cert values', async () => {
    const req = makeJsonRequest({
      method: 'POST',
      path: '/api/v1/reports/academics/final-result-compilation/download',
      body: {
        courseId,
        semester: 4,
        password: 'password123',
        preparedBy: 'Prepared By',
        checkedBy: 'Checked By',
      },
    });

    const res = await downloadFinalResultCompilation(req as any, createRouteContext());

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('application/pdf');
    expect(res.headers.get('Content-Disposition')).toContain('final-result-compilation-TES-50-sem-4-RPT-0001.pdf');
    expect(pdfEngine.renderEncryptedPdf).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Final Result Compilation Sheet',
        size: 'A4',
      }),
      expect.any(Function),
    );
    expect(reportDownloadVersions.createReportDownloadVersion).toHaveBeenCalledWith(
      expect.objectContaining({
        versionId: 'RPT-0001',
        requestedByUserId: 'user-1',
        fileName: 'final-result-compilation-TES-50-sem-4-RPT-0001.pdf',
        encrypted: true,
        filters: expect.objectContaining({
          ocCount: 1,
          subjectColumnCount: 1,
          format: 'pdf',
        }),
      }),
    );
  });
});

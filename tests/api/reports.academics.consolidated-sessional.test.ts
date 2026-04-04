import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GET as previewConsolidatedSessional } from '@/app/api/v1/reports/academics/consolidated-sessional/preview/route';
import { POST as downloadConsolidatedSessional } from '@/app/api/v1/reports/academics/consolidated-sessional/download/route';
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
const subjectId = '44444444-4444-4444-8444-444444444444';

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
  buildConsolidatedSessionalPreview: vi.fn(),
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
  course: {
    id: courseId,
    code: 'TES-50',
    title: 'TES 50',
  },
  semester: 1,
  subject: {
    id: subjectId,
    code: 'MATH',
    name: 'Mathematics',
    instructorName: 'Instructor One',
    noOfPhaseTests: 2,
    hasTheory: true,
    hasPractical: true,
    theoryCredits: 4,
    practicalCredits: 1,
  },
  theoryRows: [{ ocId: 'oc-1' }],
  practicalRows: [{ ocId: 'oc-2' }],
  theorySummary: [{ grade: 'AO', count: 1 }],
  practicalSummary: [{ grade: 'AP', count: 1 }],
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
    currentSemester: 1,
    allowedSemesters: [1, 2, 3, 4],
  } as Awaited<ReturnType<typeof semesterResolution.resolveCourseWithSemesters>>);

  vi.mocked(reportData.buildConsolidatedSessionalPreview).mockResolvedValue(
    previewData as Awaited<ReturnType<typeof reportData.buildConsolidatedSessionalPreview>>,
  );

  vi.mocked(pdfEngine.renderEncryptedPdf).mockResolvedValue({
    buffer: Buffer.from('pdf'),
    checksumSha256: 'checksum',
  } as Awaited<ReturnType<typeof pdfEngine.renderEncryptedPdf>>);

  vi.mocked(versioning.generateReportVersionId).mockReturnValue('RPT-0001');
  vi.mocked(versioning.sanitizePdfFileName).mockImplementation((fileName) => fileName);
});

describe('Consolidated sessional report routes', () => {
  it('preview returns 401 when auth fails', async () => {
    vi.mocked(authz.requireAuth).mockRejectedValueOnce(
      new ApiError(401, 'Unauthorized', 'unauthorized'),
    );

    const req = makeJsonRequest({
      method: 'GET',
      path: `/api/v1/reports/academics/consolidated-sessional/preview?courseId=${courseId}&semester=1&subjectId=${subjectId}`,
    });

    const res = await previewConsolidatedSessional(req as any, createRouteContext());

    expect(res.status).toBe(401);
  });

  it('preview returns report data for a valid request', async () => {
    const req = makeJsonRequest({
      method: 'GET',
      path: `/api/v1/reports/academics/consolidated-sessional/preview?courseId=${courseId}&semester=1&subjectId=${subjectId}`,
    });

    const res = await previewConsolidatedSessional(req as any, createRouteContext());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.message).toBe('Consolidated sessional preview fetched successfully.');
    expect(body.data).toEqual(previewData);
    expect(semesterResolution.assertSemesterAllowed).toHaveBeenCalledWith(1, [1, 2, 3, 4]);
    expect(auditLogMock).toHaveBeenCalledWith(
      expect.objectContaining({
        outcome: 'SUCCESS',
        metadata: expect.objectContaining({
          courseId,
          semester: 1,
          subjectId,
          theoryCount: 1,
          practicalCount: 1,
        }),
      }),
    );
  });

  it('download returns 401 when auth fails', async () => {
    vi.mocked(authz.requireAuth).mockRejectedValueOnce(
      new ApiError(401, 'Unauthorized', 'unauthorized'),
    );

    const req = makeJsonRequest({
      method: 'POST',
      path: '/api/v1/reports/academics/consolidated-sessional/download',
      body: {
        courseId,
        semester: 1,
        subjectId,
        section: 'theory',
        password: 'password123',
        preparedBy: 'Prepared By',
        checkedBy: 'Checked By',
      },
    });

    const res = await downloadConsolidatedSessional(req as any, createRouteContext());

    expect(res.status).toBe(401);
  });

  it('download returns an encrypted pdf and records the version', async () => {
    const req = makeJsonRequest({
      method: 'POST',
      path: '/api/v1/reports/academics/consolidated-sessional/download',
      body: {
        courseId,
        semester: 1,
        subjectId,
        section: 'practical',
        instructorName: 'Instructor One',
        password: 'password123',
        preparedBy: 'Prepared By',
        checkedBy: 'Checked By',
      },
    });

    const res = await downloadConsolidatedSessional(req as any, createRouteContext());

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('application/pdf');
    expect(res.headers.get('Content-Disposition')).toContain(
      'consolidated-sessional-practical-TES-50-sem-1-MATH-RPT-0001.pdf',
    );
    expect(reportDownloadVersions.createReportDownloadVersion).toHaveBeenCalledWith(
      expect.objectContaining({
        versionId: 'RPT-0001',
        requestedByUserId: 'user-1',
        fileName: 'consolidated-sessional-practical-TES-50-sem-1-MATH-RPT-0001.pdf',
        encrypted: true,
        filters: expect.objectContaining({
          section: 'practical',
        }),
      }),
    );
    expect(auditLogMock).toHaveBeenCalledWith(
      expect.objectContaining({
        outcome: 'SUCCESS',
        metadata: expect.objectContaining({
          reportType: 'ACADEMICS_CONSOLIDATED_SESSIONAL',
          section: 'practical',
          versionId: 'RPT-0001',
        }),
      }),
    );
  });

  it('download rejects a section that is not available for the subject', async () => {
    vi.mocked(reportData.buildConsolidatedSessionalPreview).mockResolvedValueOnce({
      ...previewData,
      subject: {
        ...previewData.subject,
        hasPractical: false,
      },
    } as Awaited<ReturnType<typeof reportData.buildConsolidatedSessionalPreview>>);

    const req = makeJsonRequest({
      method: 'POST',
      path: '/api/v1/reports/academics/consolidated-sessional/download',
      body: {
        courseId,
        semester: 1,
        subjectId,
        section: 'practical',
        password: 'password123',
        preparedBy: 'Prepared By',
        checkedBy: 'Checked By',
      },
    });

    const res = await downloadConsolidatedSessional(req as any, createRouteContext());
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.message).toBe('Practical sessional marksheet is not available for this subject.');
  });
});

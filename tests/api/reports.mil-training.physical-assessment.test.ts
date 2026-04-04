import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GET as previewPhysicalAssessment } from '@/app/api/v1/reports/mil-training/physical-assessment/preview/route';
import { POST as downloadPhysicalAssessment } from '@/app/api/v1/reports/mil-training/physical-assessment/download/route';
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
  buildPtAssessmentPreview: vi.fn(),
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
  reportType: 'MIL_TRAINING_PHYSICAL_ASSESSMENT',
  course: {
    id: courseId,
    code: 'TES-50',
    title: 'TES 50',
  },
  semester: 1,
  selection: {
    ptTypeId: 'ALL',
    label: 'ALL',
    isAll: true,
  },
  sections: [
    {
      ptType: {
        id: '44444444-4444-4444-8444-444444444444',
        code: 'PPT',
        title: 'Physical Proficiency Test',
      },
      tasks: [{ taskId: 'task-1', title: '1.6 KM Run', maxMarks: 26 }],
      rows: [
        {
          ocId: '55555555-5555-4555-8555-555555555555',
          sNo: 1,
          tesNo: 'TES-01',
          rank: 'OC',
          name: 'Cadet One',
          cells: {
            'task-1': { attemptCode: 'A1/C1', gradeCode: 'E/G/S', marks: 21 },
          },
          totalMarksScored: 21,
        },
      ],
    },
  ],
};
const singleTypeId = '44444444-4444-4444-8444-444444444444';

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

  vi.mocked(reportData.buildPtAssessmentPreview).mockResolvedValue(
    previewData as Awaited<ReturnType<typeof reportData.buildPtAssessmentPreview>>,
  );

  vi.mocked(pdfEngine.renderEncryptedPdf).mockResolvedValue({
    buffer: Buffer.from('pdf'),
    checksumSha256: 'checksum',
  } as Awaited<ReturnType<typeof pdfEngine.renderEncryptedPdf>>);

  vi.mocked(versioning.generateReportVersionId).mockReturnValue('RPT-0001');
  vi.mocked(versioning.sanitizePdfFileName).mockImplementation((fileName) => fileName);
});

describe('Physical assessment report routes', () => {
  it('preview preserves lowercase ptTypeId uuids', async () => {
    const req = makeJsonRequest({
      method: 'GET',
      path: `/api/v1/reports/mil-training/physical-assessment/preview?courseId=${courseId}&semester=1&ptTypeId=${singleTypeId.toLowerCase()}`,
    });

    const res = await previewPhysicalAssessment(req as any, createRouteContext());

    expect(res.status).toBe(200);
    expect(reportData.buildPtAssessmentPreview).toHaveBeenCalledWith({
      courseId,
      semester: 1,
      ptTypeId: singleTypeId.toLowerCase(),
    });
  });

  it('preview accepts ALL ptTypeId and returns grouped section data', async () => {
    const req = makeJsonRequest({
      method: 'GET',
      path: `/api/v1/reports/mil-training/physical-assessment/preview?courseId=${courseId}&semester=1&ptTypeId=ALL`,
    });

    const res = await previewPhysicalAssessment(req as any, createRouteContext());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.message).toBe('Physical assessment preview fetched successfully.');
    expect(body.data).toEqual(previewData);
    expect(reportData.buildPtAssessmentPreview).toHaveBeenCalledWith({
      courseId,
      semester: 1,
      ptTypeId: 'ALL',
    });
  });

  it('download builds the ALL report pdf and records the version', async () => {
    const req = makeJsonRequest({
      method: 'POST',
      path: '/api/v1/reports/mil-training/physical-assessment/download',
      body: {
        courseId,
        semester: 1,
        ptTypeId: 'ALL',
        password: 'password123',
        preparedBy: 'Prepared By',
        checkedBy: 'Checked By',
      },
    });

    const res = await downloadPhysicalAssessment(req as any, createRouteContext());

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('application/pdf');
    expect(res.headers.get('Content-Disposition')).toContain('pt-assessment-TES-50-sem-1-ALL-RPT-0001.pdf');
    expect(pdfEngine.renderEncryptedPdf).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Physical Assessment Training Report',
        size: expect.arrayContaining([expect.any(Number), expect.any(Number)]),
      }),
      expect.any(Function),
    );
    expect(reportDownloadVersions.createReportDownloadVersion).toHaveBeenCalledWith(
      expect.objectContaining({
        versionId: 'RPT-0001',
        requestedByUserId: 'user-1',
        fileName: 'pt-assessment-TES-50-sem-1-ALL-RPT-0001.pdf',
        encrypted: true,
      }),
    );
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_ACADEMIC_GRADING_POLICY } from '@/app/lib/grading-policy';
import { buildConsolidatedSessionalPreview } from '@/app/lib/reports/report-data';
import { db } from '@/app/db/client';
import { listCourseOfferings } from '@/app/db/queries/courses';
import { listOCsBasic } from '@/app/db/queries/oc';
import { getAcademicGradingPolicy } from '@/app/db/queries/academicGradingPolicy';
import { getOcAcademicSemester } from '@/app/services/oc-academics';

vi.mock('@/app/db/client', () => ({
  db: {
    select: vi.fn(),
  },
}));

vi.mock('@/app/db/queries/courses', () => ({
  listCourseOfferings: vi.fn(),
}));

vi.mock('@/app/db/queries/oc', () => ({
  listOCsBasic: vi.fn(),
}));

vi.mock('@/app/db/queries/academicGradingPolicy', () => ({
  getAcademicGradingPolicy: vi.fn(),
}));

vi.mock('@/app/services/oc-academics', () => ({
  getOcAcademicSemester: vi.fn(),
  getOcAcademics: vi.fn(),
}));

describe('buildConsolidatedSessionalPreview practical rows', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    (db.select as any)
      .mockImplementationOnce(() => ({
        from: () => ({
          where: () => ({
            limit: async () => [{ id: 'course-1', code: 'TES-50', title: 'TES 50' }],
          }),
        }),
      }))
      .mockImplementationOnce(() => ({
        from: () => ({
          innerJoin: () => ({
            where: async () => [{ name: 'Instructor One', role: 'PRIMARY' }],
          }),
        }),
      }));

    vi.mocked(listCourseOfferings).mockResolvedValue([
      {
        id: 'off-1',
        semester: 1,
        includeTheory: false,
        includePractical: true,
        practicalCredits: 1,
        theoryCredits: 0,
        subject: {
          id: 'subject-1',
          code: 'ETP101',
          name: 'Electrical Technology',
          branch: 'C',
          hasTheory: false,
          hasPractical: true,
          defaultTheoryCredits: 0,
          defaultPracticalCredits: 1,
        },
      },
    ] as any);

    vi.mocked(listOCsBasic).mockResolvedValue([
      {
        id: 'oc-1',
        ocNo: '7599',
        name: 'Akshit Kumar Kanth',
        branch: 'C',
      },
    ] as any);

    vi.mocked(getAcademicGradingPolicy).mockResolvedValue(DEFAULT_ACADEMIC_GRADING_POLICY);

    vi.mocked(getOcAcademicSemester).mockResolvedValue({
      semester: 1,
      branchTag: 'C',
      sgpa: null,
      cgpa: null,
      marksScored: null,
      subjects: [
        {
          includeTheory: false,
          includePractical: true,
          theoryCredits: 0,
          practicalCredits: 1,
          subject: {
            id: 'subject-1',
            code: 'ETP101',
            name: 'Electrical Technology',
            branch: 'C',
            hasTheory: false,
            hasPractical: true,
          },
          practical: {
            conductOfExp: 14,
            maintOfApp: 17,
            practicalTest: 29,
            vivaVoce: 13,
            finalMarks: 73,
            totalMarks: 73,
            grade: 'AO',
          },
        },
      ],
      createdAt: new Date('2026-01-01T00:00:00Z').toISOString(),
      updatedAt: new Date('2026-01-01T00:00:00Z').toISOString(),
    } as any);
  });

  it('maps named practical components and total into the preview rows', async () => {
    const preview = await buildConsolidatedSessionalPreview({
      courseId: 'course-1',
      semester: 1,
      subjectId: 'subject-1',
    });

    expect(preview.practicalRows).toHaveLength(1);
    expect(preview.practicalRows[0]).toMatchObject({
      ocNo: '7599',
      conductOfExpObtained: 14,
      conductOfExpMax: 20,
      maintOfAppObtained: 17,
      maintOfAppMax: 20,
      practicalTestObtained: 29,
      practicalTestMax: 45,
      vivaVoceObtained: 13,
      vivaVoceMax: 15,
      totalObtained: 73,
      totalMax: 100,
    });
    expect(preview.practicalRows[0]?.letterGrade).toBe('AO');
  });
});

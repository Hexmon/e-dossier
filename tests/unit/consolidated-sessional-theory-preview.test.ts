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

describe('buildConsolidatedSessionalPreview theory rows', () => {
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
        includeTheory: true,
        includePractical: false,
        practicalCredits: 0,
        theoryCredits: 3,
        subject: {
          id: 'subject-1',
          code: 'MATH101',
          name: 'Mathematics',
          branch: 'C',
          noOfPhaseTests: 1,
          hasTheory: true,
          hasPractical: false,
          defaultTheoryCredits: 3,
          defaultPracticalCredits: 0,
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
          includeTheory: true,
          includePractical: false,
          theoryCredits: 3,
          practicalCredits: 0,
          subject: {
            id: 'subject-1',
            code: 'MATH101',
            name: 'Mathematics',
            branch: 'C',
            noOfPhaseTests: 1,
            hasTheory: true,
            hasPractical: false,
          },
          theory: {
            phaseTest1Marks: 17,
            phaseTest2Marks: 19,
            tutorial: '8',
            finalMarks: 41,
            totalMarks: 66,
            grade: 'AO',
          },
        },
      ],
      createdAt: new Date('2026-01-01T00:00:00Z').toISOString(),
      updatedAt: new Date('2026-01-01T00:00:00Z').toISOString(),
    } as any);
  });

  it('uses the subject phase-test count to hide PT2 and derive the correct maxima', async () => {
    const preview = await buildConsolidatedSessionalPreview({
      courseId: 'course-1',
      semester: 1,
      subjectId: 'subject-1',
    });

    expect(preview.subject.noOfPhaseTests).toBe(1);
    expect(preview.theoryRows).toHaveLength(1);
    expect(preview.theoryRows[0]).toMatchObject({
      ocNo: '7599',
      phaseTest1Obtained: 17,
      phaseTest1Max: 20,
      phaseTest2Obtained: null,
      phaseTest2Max: 0,
      tutorialObtained: 8,
      tutorialMax: 10,
      sessionalObtained: 25,
      sessionalMax: 30,
      finalObtained: 41,
      finalMax: 50,
      totalObtained: 66,
      totalMax: 80,
    });
  });
});

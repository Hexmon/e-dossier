import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_ACADEMIC_GRADING_POLICY } from '@/app/lib/grading-policy';
import { buildSemesterGradePreview, listSemesterGradeCandidates } from '@/app/lib/reports/report-data';
import { db } from '@/app/db/client';
import { getAcademicGradingPolicy } from '@/app/db/queries/academicGradingPolicy';
import { listOCsBasic } from '@/app/db/queries/oc';
import { getSiteSettingsOrDefault } from '@/app/db/queries/site-settings';
import { getOcAcademicSemester, getOcAcademics } from '@/app/services/oc-academics';

vi.mock('@/app/db/client', () => ({
  db: {
    select: vi.fn(),
  },
}));

vi.mock('@/app/db/queries/academicGradingPolicy', () => ({
  getAcademicGradingPolicy: vi.fn(),
}));

vi.mock('@/app/db/queries/oc', () => ({
  listOCsBasic: vi.fn(),
}));

vi.mock('@/app/db/queries/site-settings', () => ({
  getSiteSettingsOrDefault: vi.fn(),
}));

vi.mock('@/app/services/oc-academics', () => ({
  getOcAcademicSemester: vi.fn(),
  getOcAcademics: vi.fn(),
}));

describe('buildSemesterGradePreview', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    (db.select as any).mockImplementation(() => ({
      from: () => ({
        where: () => ({
          limit: async () => [{ id: 'course-1', code: 'TES-50', title: 'TES 50' }],
        }),
      }),
    }));

    vi.mocked(listOCsBasic).mockResolvedValue([
      {
        id: 'oc-1',
        ocNo: '4046',
        name: 'Cadet One',
        branch: 'E',
        jnuEnrollmentNo: '001',
      },
    ] as any);

    vi.mocked(getAcademicGradingPolicy).mockResolvedValue(DEFAULT_ACADEMIC_GRADING_POLICY);
    vi.mocked(getSiteSettingsOrDefault).mockResolvedValue({
      heroTitle: 'MCEME',
    } as any);

    vi.mocked(getOcAcademicSemester).mockResolvedValue({
      semester: 4,
      sgpa: 8.04,
      cgpa: 7.6,
      subjects: [
        {
          includeTheory: true,
          includePractical: false,
          theoryCredits: 2,
          practicalCredits: 0,
          subject: {
            id: 'subject-2',
            code: 'EC401',
            name: 'Electronic Circuits II',
            branch: 'E',
            hasTheory: true,
            hasPractical: false,
            defaultTheoryCredits: 2,
            defaultPracticalCredits: 0,
          },
          theory: { finalMarks: 76, totalMarks: 76, grade: 'AO' },
        },
        {
          includeTheory: true,
          includePractical: false,
          theoryCredits: 3,
          practicalCredits: 0,
          subject: {
            id: 'subject-1',
            code: 'MA401',
            name: 'Military Art IV',
            branch: 'C',
            hasTheory: true,
            hasPractical: false,
            defaultTheoryCredits: 3,
            defaultPracticalCredits: 0,
          },
          theory: { finalMarks: 74, totalMarks: 74, grade: 'AO' },
        },
      ],
    } as any);

    vi.mocked(getOcAcademics).mockResolvedValue([
      {
        semester: 3,
        sgpa: 7.45,
        cgpa: 7.45,
        subjects: [
          {
            includeTheory: true,
            includePractical: false,
            theoryCredits: 3,
            practicalCredits: 0,
            subject: {
              id: 'subject-0',
              code: 'MA301',
              name: 'Military Art III',
              branch: 'C',
              hasTheory: true,
              hasPractical: false,
              defaultTheoryCredits: 3,
              defaultPracticalCredits: 0,
            },
            theory: { finalMarks: 70, totalMarks: 70, grade: 'AP' },
          },
        ],
      },
      {
        semester: 4,
        sgpa: 8.04,
        cgpa: 7.6,
        subjects: [
          {
            includeTheory: true,
            includePractical: false,
            theoryCredits: 2,
            practicalCredits: 0,
            subject: {
              id: 'subject-2',
              code: 'EC401',
              name: 'Electronic Circuits II',
              branch: 'E',
              hasTheory: true,
              hasPractical: false,
              defaultTheoryCredits: 2,
              defaultPracticalCredits: 0,
            },
            theory: { finalMarks: 76, totalMarks: 76, grade: 'AO' },
          },
          {
            includeTheory: true,
            includePractical: false,
            theoryCredits: 3,
            practicalCredits: 0,
            subject: {
              id: 'subject-1',
              code: 'MA401',
              name: 'Military Art IV',
              branch: 'C',
              hasTheory: true,
              hasPractical: false,
              defaultTheoryCredits: 3,
              defaultPracticalCredits: 0,
            },
            theory: { finalMarks: 74, totalMarks: 74, grade: 'AO' },
          },
        ],
      },
    ] as any);
  });

  it('builds the formatted enrollment number from site prefix, course code, and saved jnu number', async () => {
    const preview = await buildSemesterGradePreview({
      courseId: 'course-1',
      semester: 4,
      ocId: 'oc-1',
    });

    expect(preview.oc.jnuEnrollmentNo).toBe('001');
    expect(preview.oc.enrolmentNumber).toBe('MCEME/TES-50/001');
  });

  it('returns branch-specific subjects together with common subjects in the grade preview', async () => {
    const preview = await buildSemesterGradePreview({
      courseId: 'course-1',
      semester: 4,
      ocId: 'oc-1',
    });

    expect(preview.subjects.map((subject) => subject.subject)).toEqual([
      'Electronic Circuits II',
      'Military Art IV',
    ]);
  });

  it('filters semester grade candidates by E/M only and does not require an O filter for common subjects', async () => {
    vi.mocked(listOCsBasic).mockResolvedValueOnce([
      {
        id: 'oc-1',
        ocNo: '4046',
        name: 'Cadet One',
        branch: 'E',
      },
      {
        id: 'oc-2',
        ocNo: '4047',
        name: 'Cadet Two',
        branch: 'M',
      },
      {
        id: 'oc-3',
        ocNo: '4048',
        name: 'Cadet Three',
        branch: 'O',
      },
    ] as any);

    const candidates = await listSemesterGradeCandidates({
      courseId: 'course-1',
      semester: 4,
      branches: ['E'],
    });

    expect(candidates.map((candidate) => candidate.ocId)).toEqual(['oc-1']);
  });
});

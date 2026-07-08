import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_ACADEMIC_GRADING_POLICY } from '@/app/lib/grading-policy';
import { buildFinalResultCompilationPreview, buildMeritRankingPreview } from '@/app/lib/reports/report-data';
import { db } from '@/app/db/client';
import { listCourseOfferings } from '@/app/db/queries/courses';
import { listOCsBasic } from '@/app/db/queries/oc';
import { getAcademicGradingPolicy } from '@/app/db/queries/academicGradingPolicy';
import { getSiteSettingsOrDefault } from '@/app/db/queries/site-settings';
import { getAllSemesterSourceMarks, getSprRecord } from '@/app/db/queries/performance-records';
import { getOcAcademics } from '@/app/services/oc-academics';

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

vi.mock('@/app/db/queries/site-settings', () => ({
  getSiteSettingsOrDefault: vi.fn(),
}));

vi.mock('@/app/db/queries/performance-records', () => ({
  getAllSemesterSourceMarks: vi.fn(),
  getSemesterSourceScoresDetailed: vi.fn(),
  getSprRecord: vi.fn(),
}));

vi.mock('@/app/services/oc-academics', () => ({
  getOcAcademicSemester: vi.fn(),
  getOcAcademics: vi.fn(),
}));

describe('buildFinalResultCompilationPreview', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    (db.select as any).mockImplementation(() => ({
      from: () => ({
        where: () => ({
          limit: async () => [{ id: 'course-1', code: 'TES-50', title: 'TES 50' }],
        }),
      }),
    }));

    vi.mocked(listCourseOfferings).mockResolvedValue([
      {
        id: 'off-1',
        semester: 4,
        includeTheory: true,
        includePractical: true,
        theoryCredits: 2,
        practicalCredits: 1,
        subject: {
          id: 'subject-1',
          code: 'EC401',
          name: 'Electronic Circuits II',
          branch: 'E',
          hasTheory: true,
          hasPractical: true,
          defaultTheoryCredits: 2,
          defaultPracticalCredits: 1,
        },
      },
      {
        id: 'off-2',
        semester: 4,
        includeTheory: true,
        includePractical: false,
        theoryCredits: 3,
        practicalCredits: 0,
        subject: {
          id: 'subject-2',
          code: 'MA401',
          name: 'Military Art IV',
          branch: 'C',
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
        ocNo: '4046',
        name: 'Cadet One',
        branch: 'E',
        jnuEnrollmentNo: '001',
      },
      {
        id: 'oc-2',
        ocNo: '4047',
        name: 'Cadet Two',
        branch: 'E',
        jnuEnrollmentNo: '002',
      },
      {
        id: 'oc-3',
        ocNo: '5048',
        name: 'Cadet Three',
        branch: 'M',
        jnuEnrollmentNo: '010',
      },
    ] as any);

    vi.mocked(getAcademicGradingPolicy).mockResolvedValue(DEFAULT_ACADEMIC_GRADING_POLICY);
    vi.mocked(getSiteSettingsOrDefault).mockResolvedValue({
      heroTitle: 'MCEME',
    } as any);

    vi.mocked(getOcAcademics).mockImplementation(async (ocId: string) => {
      const branchTag = ocId === 'oc-3' ? 'M' : 'E';
      return [
        {
          semester: 3,
          branchTag,
          sgpa: 7.45,
          cgpa: 7.45,
          marksScored: null,
          subjects: [
            {
              includeTheory: true,
              includePractical: true,
              theoryCredits: 2,
              practicalCredits: 1,
              subject: {
                id: 'subject-1',
                code: 'EC401',
                name: 'Electronic Circuits II',
                branch: branchTag,
                hasTheory: true,
                hasPractical: true,
              },
              theory: { finalMarks: 72, totalMarks: 72, grade: 'AO' },
              practical: { finalMarks: 68, totalMarks: 68, grade: 'AP' },
            },
          ],
          createdAt: new Date('2026-01-01T00:00:00Z').toISOString(),
          updatedAt: new Date('2026-01-01T00:00:00Z').toISOString(),
        },
        {
          semester: 4,
          branchTag,
          sgpa: 8.04,
          cgpa: 7.6,
          marksScored: null,
          subjects: [
            {
              includeTheory: true,
              includePractical: true,
              theoryCredits: 2,
              practicalCredits: 1,
              subject: {
                id: 'subject-1',
                code: 'EC401',
                name: 'Electronic Circuits II',
                branch: branchTag,
                hasTheory: true,
                hasPractical: true,
              },
              theory: { finalMarks: 75, totalMarks: 75, grade: 'AO' },
              practical: { finalMarks: 70, totalMarks: 70, grade: 'AP' },
            },
            {
              includeTheory: true,
              includePractical: false,
              theoryCredits: 3,
              practicalCredits: 0,
              subject: {
                id: 'subject-2',
                code: 'MA401',
                name: 'Military Art IV',
                branch: 'C',
                hasTheory: true,
                hasPractical: false,
              },
              theory: { finalMarks: 74, totalMarks: 74, grade: 'AO' },
            },
          ],
          createdAt: new Date('2026-02-01T00:00:00Z').toISOString(),
          updatedAt: new Date('2026-02-01T00:00:00Z').toISOString(),
        },
      ] as any;
    });
  });

  it('groups theory and practical under one subject and derives enrollment/cert values from saved data', async () => {
    const preview = await buildFinalResultCompilationPreview({
      courseId: 'course-1',
      semester: 4,
    });

    expect(preview.branches).toEqual([]);
    expect(preview.subjectColumns).toHaveLength(2);
    expect(preview.subjectColumns[0]).toMatchObject({
      subjectCode: 'EC401',
      components: [
        { kind: 'L', credits: 2 },
        { kind: 'P', credits: 1 },
      ],
    });
    expect(preview.semesterCreditsTotal).toBe(6);

    expect(preview.rows[0]).toMatchObject({
      enrolmentNumber: 'MCEME/TES-50/001',
      certSerialNo: 'TES-50/Sem-IV(E)/01',
    });
    expect(preview.rows[1]).toMatchObject({
      enrolmentNumber: 'MCEME/TES-50/002',
      certSerialNo: 'TES-50/Sem-IV(E)/02',
    });
    expect(preview.rows[2]).toMatchObject({
      enrolmentNumber: 'MCEME/TES-50/010',
      certSerialNo: 'TES-50/Sem-IV(M)/01',
    });
  });

  it('filters rows and keeps common subject columns with the selected branch from third semester onwards', async () => {
    const preview = await buildFinalResultCompilationPreview({
      courseId: 'course-1',
      semester: 4,
      branches: ['E'],
    });

    expect(preview.branches).toEqual(['E']);
    expect(preview.rows).toHaveLength(2);
    expect(preview.rows.map((row) => row.branchTag)).toEqual(['E', 'E']);
    expect(preview.subjectColumns).toHaveLength(2);
    expect(preview.subjectColumns.map((column) => column.branch)).toEqual(['E', 'C']);
    expect(preview.subjectColumns.map((column) => column.subjectCode)).toEqual(['EC401', 'MA401']);
    expect(preview.rows[0]?.certSerialNo).toBe('TES-50/Sem-IV(E)/01');
    expect(preview.rows[1]?.certSerialNo).toBe('TES-50/Sem-IV(E)/02');
  });

  it('ignores branch filters for semesters one and two', async () => {
    vi.mocked(listCourseOfferings).mockResolvedValueOnce([
      {
        id: 'off-1',
        semester: 2,
        includeTheory: true,
        includePractical: false,
        theoryCredits: 3,
        practicalCredits: 0,
        subject: {
          id: 'subject-common-1',
          code: 'MA201',
          name: 'Military Art II',
          branch: 'C',
          hasTheory: true,
          hasPractical: false,
          defaultTheoryCredits: 3,
          defaultPracticalCredits: 0,
        },
      },
    ] as any);

    vi.mocked(getOcAcademics).mockImplementationOnce(async () => ([
      {
        semester: 2,
        branchTag: 'C',
        sgpa: 7.25,
        cgpa: 7.25,
        marksScored: null,
        subjects: [
          {
            includeTheory: true,
            includePractical: false,
            theoryCredits: 3,
            practicalCredits: 0,
            subject: {
              id: 'subject-common-1',
              code: 'MA201',
              name: 'Military Art II',
              branch: 'C',
              hasTheory: true,
              hasPractical: false,
            },
            theory: { finalMarks: 71, totalMarks: 71, grade: 'AO' },
          },
        ],
        createdAt: new Date('2026-01-01T00:00:00Z').toISOString(),
        updatedAt: new Date('2026-01-01T00:00:00Z').toISOString(),
      },
    ] as any));

    vi.mocked(getOcAcademics).mockImplementationOnce(async () => ([
      {
        semester: 2,
        branchTag: 'C',
        sgpa: 7.1,
        cgpa: 7.1,
        marksScored: null,
        subjects: [
          {
            includeTheory: true,
            includePractical: false,
            theoryCredits: 3,
            practicalCredits: 0,
            subject: {
              id: 'subject-common-1',
              code: 'MA201',
              name: 'Military Art II',
              branch: 'C',
              hasTheory: true,
              hasPractical: false,
            },
            theory: { finalMarks: 69, totalMarks: 69, grade: 'AP' },
          },
        ],
        createdAt: new Date('2026-01-01T00:00:00Z').toISOString(),
        updatedAt: new Date('2026-01-01T00:00:00Z').toISOString(),
      },
    ] as any));

    vi.mocked(getOcAcademics).mockImplementationOnce(async () => ([
      {
        semester: 2,
        branchTag: 'C',
        sgpa: 7,
        cgpa: 7,
        marksScored: null,
        subjects: [
          {
            includeTheory: true,
            includePractical: false,
            theoryCredits: 3,
            practicalCredits: 0,
            subject: {
              id: 'subject-common-1',
              code: 'MA201',
              name: 'Military Art II',
              branch: 'C',
              hasTheory: true,
              hasPractical: false,
            },
            theory: { finalMarks: 68, totalMarks: 68, grade: 'AP' },
          },
        ],
        createdAt: new Date('2026-01-01T00:00:00Z').toISOString(),
        updatedAt: new Date('2026-01-01T00:00:00Z').toISOString(),
      },
    ] as any));

    const preview = await buildFinalResultCompilationPreview({
      courseId: 'course-1',
      semester: 2,
      branches: ['E'],
    });

    expect(preview.branches).toEqual([]);
    expect(preview.rows).toHaveLength(3);
    expect(preview.rows.map((row) => row.branchTag)).toEqual(['C', 'C', 'C']);
    expect(preview.subjectColumns).toHaveLength(1);
    expect(preview.subjectColumns[0]).toMatchObject({ branch: 'C' });
  });

  it('builds merit rankings from cumulative FPR marks through the selected semester', async () => {
    const sourceMarksByOc: Record<string, Record<number, any>> = {
      'oc-1': {
        1: { academics: 40, ptSwimming: 5, games: 0, olq: 0, cfe: 0, camp: 0, drill: 0 },
        2: { academics: 45, ptSwimming: 5, games: 0, olq: 0, cfe: 0, camp: 0, drill: 0 },
        3: { academics: 55, ptSwimming: 5, games: 0, olq: 0, cfe: 0, camp: 0, drill: 0 },
        4: { academics: 60, ptSwimming: 5, games: 0, olq: 0, cfe: 0, camp: 0, drill: 0 },
        5: { academics: 900, ptSwimming: 0, games: 0, olq: 0, cfe: 0, camp: 0, drill: 0 },
        6: { academics: 900, ptSwimming: 0, games: 0, olq: 0, cfe: 0, camp: 0, drill: 0 },
      },
      'oc-2': {
        1: { academics: 60, ptSwimming: 10, games: 0, olq: 0, cfe: 0, camp: 0, drill: 0 },
        2: { academics: 70, ptSwimming: 10, games: 0, olq: 0, cfe: 0, camp: 0, drill: 0 },
        3: { academics: 80, ptSwimming: 10, games: 0, olq: 0, cfe: 0, camp: 0, drill: 0 },
        4: { academics: 90, ptSwimming: 10, games: 0, olq: 0, cfe: 0, camp: 0, drill: 0 },
        5: { academics: 0, ptSwimming: 0, games: 0, olq: 0, cfe: 0, camp: 0, drill: 0 },
        6: { academics: 0, ptSwimming: 0, games: 0, olq: 0, cfe: 0, camp: 0, drill: 0 },
      },
      'oc-3': {
        1: { academics: 30, ptSwimming: 0, games: 0, olq: 0, cfe: 0, camp: 0, drill: 0 },
        2: { academics: 30, ptSwimming: 0, games: 0, olq: 0, cfe: 0, camp: 0, drill: 0 },
        3: { academics: 30, ptSwimming: 0, games: 0, olq: 0, cfe: 0, camp: 0, drill: 0 },
        4: { academics: 30, ptSwimming: 0, games: 0, olq: 0, cfe: 0, camp: 0, drill: 0 },
        5: { academics: 0, ptSwimming: 0, games: 0, olq: 0, cfe: 0, camp: 0, drill: 0 },
        6: { academics: 0, ptSwimming: 0, games: 0, olq: 0, cfe: 0, camp: 0, drill: 0 },
      },
    };
    const cdrMarksByOc: Record<string, Record<number, number>> = {
      'oc-1': { 1: 1, 2: 2, 3: 3, 4: 4 },
      'oc-2': { 1: 5, 2: 5, 3: 5, 4: 5 },
      'oc-3': { 1: 0, 2: 0, 3: 0, 4: 0 },
    };

    vi.mocked(getAllSemesterSourceMarks).mockImplementation(async (ocId: string) => sourceMarksByOc[ocId]);
    vi.mocked(getSprRecord).mockImplementation(async (ocId: string, semester: number) => ({
      cdrMarks: cdrMarksByOc[ocId]?.[semester] ?? 0,
    }) as any);

    const preview = await buildMeritRankingPreview({
      courseId: 'course-1',
      semester: 4,
    });

    expect(preview.reportType).toBe('OVERALL_TRAINING_MERIT_RANKINGS');
    expect(preview.rows.map((row) => row.ocId)).toEqual(['oc-2', 'oc-1', 'oc-3']);
    expect(preview.rows.map((row) => row.meritRank)).toEqual([1, 2, 3]);
    expect(preview.rows.map((row) => row.marksObtained)).toEqual([360, 230, 120]);
    expect(preview.categories.map((category) => category.key)).toEqual([
      'academics',
      'ptSwimming',
      'games',
      'olq',
      'cfe',
      'camp',
      'drill',
      'cdrMarks',
    ]);
    expect(preview.rows[0].categoryTotals).toMatchObject({
      academics: 300,
      ptSwimming: 40,
      cdrMarks: 20,
    });
    expect(getSprRecord).toHaveBeenCalledWith('oc-1', 4);
    expect(getSprRecord).not.toHaveBeenCalledWith('oc-1', 5);
  });

  it('adds platoon theme colors to merit ranking rows', async () => {
    (db.select as any).mockReset();
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
          where: async () => [
            { id: 'platoon-1', themeColor: '#b45309' },
            { id: 'platoon-2', themeColor: '#0369a1' },
          ],
        }),
      }));

    vi.mocked(listOCsBasic).mockResolvedValue([
      {
        id: 'oc-1',
        ocNo: '1001',
        name: 'OC Alpha',
        platoonId: 'platoon-1',
        platoonKey: 'ALPHA',
        platoonName: 'Alpha Platoon',
      },
      {
        id: 'oc-2',
        ocNo: '1002',
        name: 'OC Bravo',
        platoonId: 'platoon-2',
        platoonKey: 'BRAVO',
        platoonName: 'Bravo Platoon',
      },
    ] as any);
    vi.mocked(getAllSemesterSourceMarks).mockResolvedValue({
      1: { academics: 10, ptSwimming: 0, games: 0, olq: 0, cfe: 0, camp: 0, drill: 0 },
      2: { academics: 10, ptSwimming: 0, games: 0, olq: 0, cfe: 0, camp: 0, drill: 0 },
    } as any);
    vi.mocked(getSprRecord).mockResolvedValue({ cdrMarks: 0 } as any);

    const preview = await buildMeritRankingPreview({
      courseId: 'course-1',
      semester: 2,
    });

    expect(preview.rows.map((row) => ({
      ocId: row.ocId,
      platoonName: row.platoonName,
      platoonThemeColor: row.platoonThemeColor,
    }))).toEqual([
      { ocId: 'oc-1', platoonName: 'Alpha Platoon', platoonThemeColor: '#B45309' },
      { ocId: 'oc-2', platoonName: 'Bravo Platoon', platoonThemeColor: '#0369A1' },
    ]);
  });
});

import { describe, expect, it } from 'vitest';

import {
  buildTopPerformerCardStyle,
  buildMeritRankingDisplayRows,
  shouldShowMeritRankingsLoadingState,
  summarizeMeritRankingRows,
} from '@/components/reports/cards/MeritRankingsCard';

describe('MeritRankingsCard loading state', () => {
  it('shows loading immediately after a course is selected while semesters are resolving', () => {
    expect(
      shouldShowMeritRankingsLoadingState({
        hasCourse: true,
        courseSemestersLoading: true,
        courseSemestersFetching: false,
        hasCourseSemesterData: false,
        hasAllowedMeritSemesters: false,
        hasSemester: false,
        previewFetching: false,
      })
    ).toBe(true);
  });

  it('keeps loading while a valid default merit semester is being selected', () => {
    expect(
      shouldShowMeritRankingsLoadingState({
        hasCourse: true,
        courseSemestersLoading: false,
        courseSemestersFetching: false,
        hasCourseSemesterData: true,
        hasAllowedMeritSemesters: true,
        hasSemester: false,
        previewFetching: false,
      })
    ).toBe(true);
  });

  it('does not mask the semester availability message when no merit semesters exist', () => {
    expect(
      shouldShowMeritRankingsLoadingState({
        hasCourse: true,
        courseSemestersLoading: false,
        courseSemestersFetching: false,
        hasCourseSemesterData: true,
        hasAllowedMeritSemesters: false,
        hasSemester: false,
        previewFetching: false,
      })
    ).toBe(false);
  });

  it('recalculates display ranks from selected FPR categories', () => {
    const preview = {
      reportType: 'OVERALL_TRAINING_MERIT_RANKINGS',
      course: { id: 'course-1', code: 'TES-51', title: 'TES 51' },
      semester: 4,
      categories: [
        { key: 'academics', label: 'Academics' },
        { key: 'games', label: 'Games' },
      ],
      rows: [
        {
          ocId: 'oc-1',
          meritRank: 1,
          ocNo: '1001',
          name: 'OC Alpha',
          platoonId: 'platoon-alpha',
          platoonKey: 'ALPHA',
          platoonName: 'Alpha Platoon',
          platoonThemeColor: '#B45309',
          currentSemester: 4,
          marksObtained: 90,
          categoryTotals: { academics: 10, games: 80 },
        },
        {
          ocId: 'oc-2',
          meritRank: 2,
          ocNo: '1002',
          name: 'OC Bravo',
          platoonId: 'platoon-bravo',
          platoonKey: 'BRAVO',
          platoonName: 'Bravo Platoon',
          platoonThemeColor: '#0369A1',
          currentSemester: 4,
          marksObtained: 70,
          categoryTotals: { academics: 70, games: 0 },
        },
      ],
      formulaLabel: 'Marks Obtained = cumulative FPR source marks',
    } as const;

    const rows = buildMeritRankingDisplayRows(preview, ['academics']);

    expect(rows.map((row) => row.ocId)).toEqual(['oc-2', 'oc-1']);
    expect(rows.map((row) => row.displayRank)).toEqual([1, 2]);
    expect(rows.map((row) => row.selectedMarks)).toEqual([70, 10]);
    expect(summarizeMeritRankingRows(rows)).toMatchObject({
      candidateCount: 2,
      averageMarks: 40,
    });
  });

  it('builds a light platoon themed card style for top performers', () => {
    const style = buildTopPerformerCardStyle({ platoonThemeColor: '#b45309' });

    expect(style.background).toContain('#B453092E');
    expect(style.background).toContain('#B453090F');
    expect(style.borderLeftColor).toBe('#B45309');
  });
});

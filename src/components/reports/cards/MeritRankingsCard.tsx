'use client';

import { type CSSProperties, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { academicsApi } from '@/app/lib/api/academicsMarksApi';
import { useCourseSemesters, useMeritRankingPreview } from '@/hooks/useReports';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { normalizePlatoonThemeColor } from '@/lib/platoon-theme';
import type { MeritRankingPreview, MeritRankingRow } from '@/types/reports';

function MeritRankingsLoadingState({ message }: { message: string }) {
  return (
    <div className="space-y-3 rounded border bg-muted/20 p-3" aria-live="polite" aria-busy="true">
      <div className="text-sm font-medium">{message}</div>
      <div className="space-y-2">
        <div className="h-9 animate-pulse rounded bg-muted" />
        <div className="h-9 animate-pulse rounded bg-muted" />
        <div className="h-9 animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
}

export function shouldShowMeritRankingsLoadingState(params: {
  hasCourse: boolean;
  courseSemestersLoading: boolean;
  courseSemestersFetching: boolean;
  hasCourseSemesterData: boolean;
  hasAllowedMeritSemesters: boolean;
  hasSemester: boolean;
  previewFetching: boolean;
}) {
  const isResolvingCourseSelection =
    params.hasCourse &&
    (params.courseSemestersLoading ||
      params.courseSemestersFetching ||
      (params.hasCourseSemesterData && params.hasAllowedMeritSemesters && !params.hasSemester));

  return isResolvingCourseSelection || params.previewFetching;
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function hexWithAlpha(hex: string, alpha: number) {
  const normalized = normalizePlatoonThemeColor(hex);
  const alphaHex = Math.round(Math.max(0, Math.min(alpha, 1)) * 255)
    .toString(16)
    .padStart(2, '0')
    .toUpperCase();
  return `${normalized}${alphaHex}`;
}

export function buildTopPerformerCardStyle(row: Pick<MeritRankingRow, 'platoonThemeColor'>): CSSProperties {
  const themeColor = normalizePlatoonThemeColor(row.platoonThemeColor);

  return {
    background: `linear-gradient(135deg, ${hexWithAlpha(themeColor, 0.18)}, ${hexWithAlpha(themeColor, 0.06)})`,
    borderColor: hexWithAlpha(themeColor, 0.42),
    borderLeftColor: themeColor,
    boxShadow: `inset 4px 0 0 ${themeColor}`,
  };
}

type MeritRankingDisplayRow = MeritRankingRow & {
  displayRank: number;
  selectedMarks: number;
};

export function buildMeritRankingDisplayRows(
  preview: MeritRankingPreview,
  selectedCategoryKeys: string[]
): MeritRankingDisplayRow[] {
  const activeCategoryKeys = selectedCategoryKeys.length
    ? selectedCategoryKeys
    : preview.categories.map((category) => category.key);

  return preview.rows
    .map((row) => {
      const selectedMarks = activeCategoryKeys.length
        ? activeCategoryKeys.reduce((sum, key) => sum + Number(row.categoryTotals?.[key] ?? 0), 0)
        : row.marksObtained;
      return { ...row, selectedMarks: round2(selectedMarks) };
    })
    .filter((row) => !selectedCategoryKeys.length || row.selectedMarks > 0)
    .sort((left, right) => {
      const marksDiff = right.selectedMarks - left.selectedMarks;
      if (marksDiff !== 0) return marksDiff;
      const ocNoDiff = String(left.ocNo).localeCompare(String(right.ocNo), undefined, { numeric: true });
      if (ocNoDiff !== 0) return ocNoDiff;
      return left.name.localeCompare(right.name);
    })
    .map((row, index) => ({ ...row, displayRank: index + 1 }));
}

export function summarizeMeritRankingRows(rows: MeritRankingDisplayRow[]) {
  const totalMarks = rows.reduce((sum, row) => sum + row.selectedMarks, 0);
  return {
    candidateCount: rows.length,
    topPerformer: rows[0] ?? null,
    averageMarks: rows.length ? round2(totalMarks / rows.length) : 0,
    topFive: rows.slice(0, 5),
  };
}

export function MeritRankingsCard() {
  const [courseId, setCourseId] = useState('');
  const [semester, setSemester] = useState<number | null>(null);
  const [selectedCategoryKeys, setSelectedCategoryKeys] = useState<string[]>([]);

  const coursesQuery = useQuery({
    queryKey: ['reports', 'courses'],
    queryFn: () => academicsApi.getCourses().then((res) => res.items ?? []),
  });
  const courseSemesters = useCourseSemesters(courseId || null);
  const courseSemesterData = courseSemesters.data?.data;
  const allowedMeritSemesters = useMemo(
    () => (courseSemesterData?.allowedSemesters ?? []).filter((item) => item >= 2),
    [courseSemesterData?.allowedSemesters]
  );

  useEffect(() => {
    if (!courseId || !courseSemesterData) return;
    if (!allowedMeritSemesters.length) {
      if (semester !== null) setSemester(null);
      return;
    }
    if (semester && allowedMeritSemesters.includes(semester)) return;

    const currentSemester = courseSemesterData.currentSemester;
    const preferredSemester = allowedMeritSemesters.includes(currentSemester)
      ? currentSemester
      : allowedMeritSemesters[allowedMeritSemesters.length - 1];
    setSemester(preferredSemester);
  }, [allowedMeritSemesters, courseId, courseSemesterData, semester]);

  const previewQuery = useMeritRankingPreview({
    courseId,
    semester,
    enabled: Boolean(courseId && semester),
  });
  const preview = previewQuery.data?.data ?? null;
  const displayRows = useMemo(
    () => (preview ? buildMeritRankingDisplayRows(preview, selectedCategoryKeys) : []),
    [preview, selectedCategoryKeys]
  );
  const meritStats = useMemo(() => summarizeMeritRankingRows(displayRows), [displayRows]);
  const isResolvingCourseSelection =
    Boolean(courseId) &&
    (courseSemesters.isLoading ||
      courseSemesters.isFetching ||
      Boolean(courseSemesterData && allowedMeritSemesters.length && !semester));
  const showLoadingState = shouldShowMeritRankingsLoadingState({
    hasCourse: Boolean(courseId),
    courseSemestersLoading: courseSemesters.isLoading,
    courseSemestersFetching: courseSemesters.isFetching,
    hasCourseSemesterData: Boolean(courseSemesterData),
    hasAllowedMeritSemesters: Boolean(allowedMeritSemesters.length),
    hasSemester: Boolean(semester),
    previewFetching: previewQuery.isFetching,
  });

  return (
    <Card className="md:col-span-2">
      <CardHeader>
        <CardTitle>Merit Rankings</CardTitle>
        <CardDescription>
          Course-wise OC rankings by cumulative FPR marks from semester II onwards.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="min-w-0 space-y-2">
            <Label>Course</Label>
            <Select
              value={courseId}
              onValueChange={(value) => {
                setCourseId(value);
                setSemester(null);
              }}
            >
              <SelectTrigger className="w-full min-w-0">
                <SelectValue placeholder="Select course" />
              </SelectTrigger>
              <SelectContent>
                {(coursesQuery.data ?? []).map((course) => (
                  <SelectItem key={course.id} value={course.id}>
                    {course.code} - {course.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="min-w-0 space-y-2">
            <Label>Semester</Label>
            <Select
              value={semester ? String(semester) : ''}
              onValueChange={(value) => setSemester(Number(value))}
              disabled={!courseId || !allowedMeritSemesters.length}
            >
              <SelectTrigger className="w-full min-w-0">
                <SelectValue placeholder="Select semester" />
              </SelectTrigger>
              <SelectContent>
                {allowedMeritSemesters.map((item) => (
                  <SelectItem key={item} value={String(item)}>
                    Semester {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {!courseId ? (
          <div className="rounded border p-3 text-sm text-muted-foreground">
            Select a course to view merit rankings.
          </div>
        ) : null}

        {courseId && !courseSemesters.isLoading && !allowedMeritSemesters.length ? (
          <div className="rounded border p-3 text-sm text-muted-foreground">
            Merit rankings are available from semester II onwards.
          </div>
        ) : null}

        {showLoadingState ? (
          <MeritRankingsLoadingState
            message={isResolvingCourseSelection ? 'Preparing merit rankings...' : 'Loading merit rankings...'}
          />
        ) : null}

        {!showLoadingState && previewQuery.error ? (
          <div className="rounded border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            {(previewQuery.error as Error).message}
          </div>
        ) : null}

        {!showLoadingState && preview ? (
          <div className="min-w-0 space-y-3">
            <div className="rounded border bg-muted/20 p-3 text-sm">
              Rows: {displayRows.length} of {preview.rows.length} | {preview.formulaLabel}
            </div>

            <div className="rounded border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold">FPR category filters</p>
                  <p className="text-xs text-muted-foreground">
                    Select categories to recalculate and filter the merit list.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!selectedCategoryKeys.length}
                  onClick={() => setSelectedCategoryKeys([])}
                >
                  Show all
                </Button>
              </div>
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {preview.categories.map((category) => (
                  <label
                    key={category.key}
                    className="flex items-center gap-2 rounded border bg-background px-3 py-2 text-sm"
                  >
                    <Checkbox
                      checked={selectedCategoryKeys.includes(category.key)}
                      onCheckedChange={(checked) => {
                        setSelectedCategoryKeys((current) =>
                          checked
                            ? Array.from(new Set([...current, category.key]))
                            : current.filter((key) => key !== category.key)
                        );
                      }}
                    />
                    <span>{category.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="rounded border bg-muted/20 p-3">
                <p className="text-xs text-muted-foreground">Candidates in view</p>
                <p className="text-2xl font-semibold">{meritStats.candidateCount}</p>
              </div>
              <div className="rounded border bg-muted/20 p-3">
                <p className="text-xs text-muted-foreground">Top score</p>
                <p className="text-2xl font-semibold">
                  {meritStats.topPerformer ? meritStats.topPerformer.selectedMarks.toFixed(2) : '0.00'}
                </p>
              </div>
              <div className="rounded border bg-muted/20 p-3">
                <p className="text-xs text-muted-foreground">Average score</p>
                <p className="text-2xl font-semibold">{meritStats.averageMarks.toFixed(2)}</p>
              </div>
            </div>

            <div className="rounded border p-3">
              <p className="text-sm font-semibold">Top 5 performers</p>
              <div className="mt-3 grid grid-cols-1 gap-2 lg:grid-cols-5">
                {meritStats.topFive.length ? (
                  meritStats.topFive.map((row) => (
                    <div
                      key={row.ocId}
                      className="rounded border border-l-4 p-2"
                      style={buildTopPerformerCardStyle(row)}
                    >
                      <p className="text-xs font-medium text-foreground/70">Rank {row.displayRank}</p>
                      <p className="truncate text-sm font-semibold">{row.name}</p>
                      <p className="text-xs text-foreground/70">
                        {row.ocNo} | {row.selectedMarks.toFixed(2)}
                      </p>
                      {row.platoonName || row.platoonKey ? (
                        <p className="mt-1 truncate text-xs font-medium text-foreground/80">
                          {row.platoonName ?? row.platoonKey}
                        </p>
                      ) : null}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No candidates match the selected categories.</p>
                )}
              </div>
            </div>

            <div className="max-h-[70vh] w-full overflow-hidden rounded border">
              <table className="w-full table-fixed text-sm">
                <colgroup>
                  <col className="w-[72px]" />
                  <col className="w-[120px]" />
                  <col />
                  <col className="w-[150px]" />
                  <col className="w-[150px]" />
                </colgroup>
                <thead className="sticky top-0 z-10 bg-muted/70 backdrop-blur">
                  <tr>
                    <th className="border-b px-3 py-2 text-center">Rank</th>
                    <th className="border-b px-3 py-2 text-center">OC No</th>
                    <th className="border-b px-3 py-2 text-left">OC Name</th>
                    <th className="border-b px-3 py-2 text-center">Current Semester</th>
                    <th className="border-b px-3 py-2 text-center">
                      {selectedCategoryKeys.length ? 'Filtered Marks' : 'Marks Obtained'}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {displayRows.map((row) => (
                    <tr key={row.ocId} className="border-b">
                      <td className="px-3 py-2 text-center">{row.displayRank}</td>
                      <td className="truncate px-3 py-2 text-center">{row.ocNo}</td>
                      <td className="truncate px-3 py-2 text-left">{row.name}</td>
                      <td className="px-3 py-2 text-center">Semester {row.currentSemester}</td>
                      <td className="px-3 py-2 text-center">{row.selectedMarks.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

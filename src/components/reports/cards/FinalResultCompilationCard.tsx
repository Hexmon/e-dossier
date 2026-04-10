'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { academicsApi } from '@/app/lib/api/academicsMarksApi';
import { useCourseSemesters, useFinalResultCompilationPreview, useReportsDownloads } from '@/hooks/useReports';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PasswordField } from '@/components/reports/common/PasswordField';
import type { ReportBranch } from '@/types/reports';

const BRANCH_OPTIONS: ReportBranch[] = ['E', 'M', 'O'];

export function FinalResultCompilationCard() {
  const [courseId, setCourseId] = useState('');
  const [semester, setSemester] = useState<number | null>(null);
  const [branches, setBranches] = useState<ReportBranch[]>([]);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewRequested, setViewRequested] = useState(false);
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [preparedBy, setPreparedBy] = useState('');
  const [checkedBy, setCheckedBy] = useState('');
  const [isPreparingDownload, setIsPreparingDownload] = useState(false);

  const courseSemesters = useCourseSemesters(courseId || null);
  const downloads = useReportsDownloads();
  const branchFilterRequired = useMemo(() => Boolean(semester && semester >= 3), [semester]);
  const effectiveBranches = useMemo(
    () => (branchFilterRequired ? branches : []),
    [branchFilterRequired, branches]
  );
  const effectiveBranchKey = effectiveBranches.join(',');
  const previewQuery = useFinalResultCompilationPreview({
    courseId,
    semester,
    branches: effectiveBranches,
    enabled: Boolean(courseId && semester && (!branchFilterRequired || branches.length)),
  });

  const coursesQuery = useQuery({
    queryKey: ['reports', 'courses'],
    queryFn: () => academicsApi.getCourses().then((res) => res.items ?? []),
  });

  useEffect(() => {
    setViewRequested(false);
    setViewModalOpen(false);
  }, [courseId, semester, effectiveBranchKey]);

  useEffect(() => {
    if (!branchFilterRequired && branches.length) {
      setBranches([]);
    }
  }, [branchFilterRequired, branches.length]);

  useEffect(() => {
    if (downloadOpen) return;
    setPassword('');
    setPreparedBy('');
    setCheckedBy('');
  }, [downloadOpen]);

  const topDownloadDisabled =
    !courseId ||
    !semester ||
    (branchFilterRequired && !branches.length) ||
    isPreparingDownload ||
    downloads.finalResultCompilationDownload.isPending;

  const handleTopDownloadClick = async () => {
    if (!courseId || !semester) {
      toast.error('Select course and semester first.');
      return;
    }
    if (branchFilterRequired && !branches.length) {
      toast.error('Select at least one branch for semester 3 onwards.');
      return;
    }
    setIsPreparingDownload(true);
    try {
      let data = previewQuery.data?.data;
      if (!data) {
        const refreshed = await previewQuery.refetch();
        data = refreshed.data?.data;
      }

      if (!data || !data.rows.length) {
        toast.error('No rows available for selected course and semester.');
        return;
      }

      setDownloadOpen(true);
    } finally {
      setIsPreparingDownload(false);
    }
  };

  const handleDownload = async () => {
    if (!courseId || !semester) {
      toast.error('Select course and semester first.');
      return;
    }
    if (branchFilterRequired && !branches.length) {
      toast.error('Select at least one branch for semester 3 onwards.');
      return;
    }
    if (!password.trim()) {
      toast.error('Enter a file password.');
      return;
    }
    const rows = previewQuery.data?.data.rows ?? [];
    if (!rows.length) {
      toast.error('No rows available for download.');
      return;
    }

    try {
      await downloads.finalResultCompilationDownload.mutateAsync({
        courseId,
        semester,
        branches: effectiveBranches,
        password: password.trim(),
        preparedBy: preparedBy.trim() || undefined,
        checkedBy: checkedBy.trim() || undefined,
      });
      toast.success('Encrypted PDF download started.');
      setDownloadOpen(false);
      setPassword('');
      setPreparedBy('');
      setCheckedBy('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to download report.');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Final Result Compilation Sheet</CardTitle>
        <CardDescription>
          Preview the final result compilation sheet and download the encrypted PDF.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label>Course</Label>
            <Select
              value={courseId}
              onValueChange={(value) => {
                setCourseId(value);
                setSemester(null);
                setBranches([]);
              }}
            >
              <SelectTrigger>
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

          <div className="space-y-2">
            <Label>Semester</Label>
            <Select
              value={semester ? String(semester) : ''}
              onValueChange={(value) => {
                setSemester(Number(value));
                setBranches([]);
              }}
              disabled={!courseId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select semester" />
              </SelectTrigger>
              <SelectContent>
                {(courseSemesters.data?.data.allowedSemesters ?? []).map((item) => (
                  <SelectItem key={item} value={String(item)}>
                    Semester {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {branchFilterRequired ? (
          <div className="flex flex-wrap items-center gap-3 rounded border p-3">
            <Label>Branch Filter</Label>
            {BRANCH_OPTIONS.map((branch) => (
              <label key={branch} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={branches.includes(branch)}
                  onCheckedChange={(checked) => {
                    setBranches((prev) =>
                      checked
                        ? Array.from(new Set([...prev, branch]))
                        : prev.filter((item) => item !== branch)
                    );
                  }}
                />
                {branch}
              </label>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setBranches([])}
              disabled={!branches.length}
            >
              Clear Branches
            </Button>
          </div>
        ) : semester ? (
          <div className="rounded border bg-muted/20 p-3 text-sm text-muted-foreground">
            Semester 1 and 2 reports remain common for all branches.
          </div>
        ) : null}

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={!courseId || !semester || (branchFilterRequired && !branches.length) || previewQuery.isFetching}
            onClick={() => {
              if (branchFilterRequired && !branches.length) {
                toast.error('Select at least one branch for semester 3 onwards.');
                return;
              }
              if (!viewRequested) setViewRequested(true);
              setViewModalOpen(true);
              void previewQuery.refetch();
            }}
          >
            {previewQuery.isFetching ? 'Loading...' : 'View'}
          </Button>
          <Button
            type="button"
            onClick={() => void handleTopDownloadClick()}
            disabled={topDownloadDisabled}
          >
            {isPreparingDownload
              ? 'Preparing...'
              : downloads.finalResultCompilationDownload.isPending
                ? 'Generating...'
                : 'Download PDF'}
          </Button>
        </div>

        <Dialog open={viewModalOpen} onOpenChange={setViewModalOpen}>
          <DialogContent className="w-[96vw] max-w-[96vw] md:w-[85vw] md:max-w-[85vw] lg:w-[88vw] lg:max-w-[88vw] xl:w-[90vw] xl:max-w-[90vw] overflow-hidden">
            <DialogHeader>
              <DialogTitle>Final Result Compilation Preview</DialogTitle>
            </DialogHeader>

            {viewRequested && previewQuery.isLoading ? (
              <div className="rounded border p-3 text-sm text-muted-foreground">Loading preview...</div>
            ) : null}

            {viewRequested && previewQuery.error ? (
              <div className="rounded border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                {(previewQuery.error as Error).message}
              </div>
            ) : null}

            {previewQuery.data?.data ? (
              <div className="max-h-[70vh] space-y-3 overflow-auto">
                <div className="rounded border bg-muted/20 p-2 text-sm">
                  Rows: {previewQuery.data.data.rows.length} | Subject groups: {previewQuery.data.data.subjectColumns.length} | Ready for download
                  {previewQuery.data.data.branches.length ? ` | Branches: ${previewQuery.data.data.branches.join(', ')}` : ''}
                </div>

                <div className="overflow-auto rounded border">
                  <table className="min-w-max text-xs">
                    <thead className="sticky top-0 z-10 bg-muted/70 backdrop-blur">
                      <tr>
                        <th className="border-b px-2 py-2 text-left" rowSpan={3}>Ser No</th>
                        <th className="border-b px-2 py-2 text-left" rowSpan={3}>TES No</th>
                        <th className="border-b px-2 py-2 text-left" rowSpan={3}>Name</th>
                        <th className="border-b px-2 py-2 text-left" rowSpan={2}>Enrollment Number</th>
                        <th className="border-b px-2 py-2 text-left" rowSpan={2}>Cert Ser No</th>
                        <th className="border-b px-2 py-2 text-center" colSpan={2}>
                          Upto Semester {Math.max(0, semester! - 1)} Cumulative Grade Point Average (CGPA)
                        </th>
                        {previewQuery.data.data.subjectColumns.map((col) => (
                          <th key={`${col.subjectId}-${col.subjectCode}`} className="border-b px-2 py-2 text-center" colSpan={col.components.length}>
                            <div>{col.subjectCode}</div>
                            <div className="text-[11px] text-muted-foreground">{col.subjectName}</div>
                          </th>
                        ))}
                        <th className="border-b px-2 py-2 text-center" colSpan={2}>
                          Semester {semester} Semester Grade Point Average (SGPA)
                        </th>
                        <th className="border-b px-2 py-2 text-center" colSpan={2}>
                          Upto Semester {semester} Cumulative Grade Point Average (CGPA)
                        </th>
                      </tr>
                      <tr>
                        <th className="border-b px-2 py-2 text-center">Points</th>
                        <th className="border-b px-2 py-2 text-center">{'{CGPA}'}</th>
                        {previewQuery.data.data.subjectColumns.flatMap((col) =>
                          col.components.map((component) => (
                            <th key={component.key} className="border-b px-2 py-2 text-center">
                              {component.kind}
                            </th>
                          ))
                        )}
                        <th className="border-b px-2 py-2 text-center">Points</th>
                        <th className="border-b px-2 py-2 text-center">{'{SGPA}'}</th>
                        <th className="border-b px-2 py-2 text-center">Points</th>
                        <th className="border-b px-2 py-2 text-center">{'{CGPA}'}</th>
                      </tr>
                      <tr>
                        <th className="border-b px-2 py-2 text-center" colSpan={2}>Credits =====&gt;</th>
                        <th className="border-b px-2 py-2 text-center"></th>
                        <th className="border-b px-2 py-2 text-center">({previewQuery.data.data.previousSemesterCreditsReference || '-'})</th>
                        {previewQuery.data.data.subjectColumns.flatMap((col) =>
                          col.components.map((component) => (
                            <th key={`${component.key}-credits`} className="border-b px-2 py-2 text-center">
                              ({component.credits})
                            </th>
                          ))
                        )}
                        <th className="border-b px-2 py-2 text-center"></th>
                        <th className="border-b px-2 py-2 text-center">({previewQuery.data.data.semesterCreditsTotal || '-'})</th>
                        <th className="border-b px-2 py-2 text-center"></th>
                        <th className="border-b px-2 py-2 text-center">({previewQuery.data.data.uptoSemesterCreditsReference || '-'})</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewQuery.data.data.rows.map((row) => {
                        return (
                          <tr key={row.ocId} className="border-b">
                            <td className="px-2 py-2">{row.sNo}</td>
                            <td className="px-2 py-2">{row.tesNo}</td>
                            <td className="px-2 py-2">{row.name}</td>
                            <td className="min-w-[180px] px-2 py-2">{row.enrolmentNumber || '-'}</td>
                            <td className="min-w-[140px] px-2 py-2">{row.certSerialNo || '-'}</td>
                            <td className="px-2 py-2">{row.previousCumulativePoints}</td>
                            <td className="px-2 py-2">
                              {row.previousCumulativeCgpa !== null ? row.previousCumulativeCgpa.toFixed(2) : ''}
                            </td>
                            {previewQuery.data.data.subjectColumns.flatMap((col) =>
                              col.components.map((component) => (
                                <td key={`${row.ocId}-${component.key}`} className="px-2 py-2 text-center">
                                  {row.subjectGrades[component.key] ?? ''}
                                </td>
                              ))
                            )}
                            <td className="px-2 py-2">{row.semesterPoints}</td>
                            <td className="px-2 py-2">
                              {row.semesterSgpa !== null ? row.semesterSgpa.toFixed(2) : ''}
                            </td>
                            <td className="px-2 py-2">{row.uptoSemesterPoints}</td>
                            <td className="px-2 py-2">
                              {row.uptoSemesterCgpa !== null ? row.uptoSemesterCgpa.toFixed(2) : ''}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-end gap-2">
                  <Button
                    type="button"
                    onClick={() => setDownloadOpen(true)}
                    disabled={!previewQuery.data.data.rows.length}
                  >
                    Download PDF
                  </Button>
                </div>
              </div>
            ) : null}
          </DialogContent>
        </Dialog>

        <Dialog open={downloadOpen} onOpenChange={setDownloadOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Download Final Result Compilation (PDF)</DialogTitle>
              <DialogDescription>
                File will be encrypted with this password.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <Label>Password (file encryption)</Label>
              <PasswordField value={password} onChange={setPassword} />
              <div className="space-y-2">
                <Label>Prepared By (Optional)</Label>
                <Input
                  value={preparedBy}
                  onChange={(event) => setPreparedBy(event.target.value)}
                  placeholder="Prepared by"
                />
              </div>
              <div className="space-y-2">
                <Label>Checked By (Optional)</Label>
                <Input
                  value={checkedBy}
                  onChange={(event) => setCheckedBy(event.target.value)}
                  placeholder="Checked by"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDownloadOpen(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => void handleDownload()}
                disabled={downloads.finalResultCompilationDownload.isPending || !password.trim()}
              >
                {downloads.finalResultCompilationDownload.isPending ? 'Preparing...' : 'Download'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

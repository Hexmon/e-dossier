'use client';

import { Fragment, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { academicsApi } from '@/app/lib/api/academicsMarksApi';
import { DownloadDialog } from '@/components/reports/common/DownloadDialog';
import {
  useCourseSemesters,
  useReportsDownloads,
  useSemesterGradeCandidates,
  useSemesterGradePreview,
} from '@/hooks/useReports';
import type { ReportBranch } from '@/types/reports';

const BRANCH_OPTIONS: ReportBranch[] = ['E', 'M', 'O'];

export function SemesterGradeCard() {
  const [courseId, setCourseId] = useState('');
  const [semester, setSemester] = useState<number | null>(null);
  const [branches, setBranches] = useState<ReportBranch[]>([]);
  const [q, setQ] = useState('');
  const [selectedOcIds, setSelectedOcIds] = useState<string[]>([]);
  const [previewOcId, setPreviewOcId] = useState<string | null>(null);
  const [ocListOpen, setOcListOpen] = useState(false);
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [isPreparingAllDownload, setIsPreparingAllDownload] = useState(false);

  const courseSemesters = useCourseSemesters(courseId || null);
  const downloads = useReportsDownloads();

  const coursesQuery = useQuery({
    queryKey: ['reports', 'courses'],
    queryFn: () => academicsApi.getCourses().then((res) => res.items ?? []),
  });

  const candidatesQuery = useSemesterGradeCandidates({
    courseId,
    semester,
    branches,
    q,
  });

  const previewQuery = useSemesterGradePreview({
    courseId,
    semester,
    ocId: previewOcId,
  });

  const toggleOcSelection = (ocId: string, checked: boolean) => {
    setSelectedOcIds((prev) => {
      if (checked) return Array.from(new Set([...prev, ocId]));
      return prev.filter((item) => item !== ocId);
    });
  };

  const allSelected = useMemo(() => {
    const ids = candidatesQuery.data?.items.map((item) => item.ocId) ?? [];
    return ids.length > 0 && ids.every((id) => selectedOcIds.includes(id));
  }, [candidatesQuery.data?.items, selectedOcIds]);

  const filteredCount = candidatesQuery.data?.items.length ?? 0;

  const onDownload = async (meta: { password: string; preparedBy: string; checkedBy: string }) => {
    if (!courseId || !semester) {
      toast.error('Select course and semester first.');
      return;
    }

    const ocIds = selectedOcIds.length
      ? selectedOcIds
      : previewOcId
        ? [previewOcId]
        : [];

    if (!ocIds.length) {
      toast.error('Select at least one cadet for download.');
      return;
    }

    try {
      await downloads.semesterGradeDownload.mutateAsync({
        courseId,
        semester,
        ocIds,
        ...meta,
      });
      toast.success('Download started.');
      setDownloadOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to download report.');
    }
  };

  const onDownloadAllFiltered = async () => {
    if (!courseId || !semester) {
      toast.error('Select course and semester first.');
      return;
    }
    setIsPreparingAllDownload(true);
    try {
      let items = candidatesQuery.data?.items;
      if (!items) {
        const refreshed = await candidatesQuery.refetch();
        items = refreshed.data?.items;
      }

      const ocIds = (items ?? []).map((item) => item.ocId);
      if (!ocIds.length) {
        toast.error('No OCs found for current filters.');
        return;
      }

      setSelectedOcIds(ocIds);
      setPreviewOcId(null);
      setDownloadOpen(true);
    } finally {
      setIsPreparingAllDownload(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Semester Grade Report (Passing Out Cadet)</CardTitle>
        <CardDescription>
          View per-cadet semester grade report and download encrypted PDF for one or many cadets.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="space-y-2">
            <Label>Course</Label>
            <Select
              value={courseId}
              onValueChange={(value) => {
                setCourseId(value);
                setSemester(null);
                setPreviewOcId(null);
                setSelectedOcIds([]);
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
                setPreviewOcId(null);
                setSelectedOcIds([]);
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

          <div className="space-y-2 md:col-span-2">
            <Label>Search OC</Label>
            <Input value={q} onChange={(event) => setQ(event.target.value)} placeholder="Search by name or OC no" />
          </div>
        </div>

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

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={async () => {
              await candidatesQuery.refetch();
              setOcListOpen(true);
            }}
            disabled={!courseId || !semester || candidatesQuery.isFetching}
          >
            {candidatesQuery.isFetching ? 'Loading...' : 'View'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => void onDownloadAllFiltered()}
            disabled={!courseId || !semester || candidatesQuery.isFetching || isPreparingAllDownload}
          >
            {isPreparingAllDownload ? 'Preparing...' : 'Download All (Filtered)'}
          </Button>
        </div>

        <DownloadDialog
          open={downloadOpen}
          onOpenChange={setDownloadOpen}
          title="Download Semester Grade Report"
          description="Select one or many cadets and generate encrypted PDF/ZIP."
          includeDateReadonly
          isPending={downloads.semesterGradeDownload.isPending}
          onSubmit={onDownload}
        />

        <Dialog open={ocListOpen} onOpenChange={setOcListOpen}>
          <DialogContent className="w-[96vw] max-w-[96vw] md:w-[85vw] md:max-w-[85vw] lg:w-[88vw] lg:max-w-[88vw] xl:w-[90vw] xl:max-w-[90vw]">
            <DialogHeader>
              <DialogTitle>Officer Cadets</DialogTitle>
              <DialogDescription>
                Click `View` to expand a cadet preview in-place. Use `Download` for per-cadet export.
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-wrap items-center justify-between gap-2 rounded border bg-muted/20 p-2 text-sm">
              <span className="text-muted-foreground">Filtered OCs: {filteredCount}</span>
              <Button
                type="button"
                size="sm"
                onClick={() => void onDownloadAllFiltered()}
                disabled={!filteredCount || candidatesQuery.isFetching || isPreparingAllDownload}
              >
                {isPreparingAllDownload ? 'Preparing...' : 'Download All (Filtered)'}
              </Button>
            </div>

            <div className="max-h-[70vh] overflow-auto rounded border">
              <table className="min-w-full text-xs">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="p-2 text-left">
                      <Checkbox
                        checked={allSelected}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedOcIds(candidatesQuery.data?.items.map((item) => item.ocId) ?? []);
                            return;
                          }
                          setSelectedOcIds([]);
                        }}
                      />
                    </th>
                    <th className="p-2 text-left">OC No</th>
                    <th className="p-2 text-left">Name</th>
                    <th className="p-2 text-left">Branch</th>
                    <th className="p-2 text-left">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {candidatesQuery.isLoading ? (
                    <tr>
                      <td className="p-3 text-muted-foreground" colSpan={5}>
                        Loading OCs...
                      </td>
                    </tr>
                  ) : null}

                  {!candidatesQuery.isLoading && !candidatesQuery.data?.items?.length ? (
                    <tr>
                      <td className="p-3 text-muted-foreground" colSpan={5}>
                        No OCs found for selected filters.
                      </td>
                    </tr>
                  ) : null}

                  {candidatesQuery.data?.items.map((item) => (
                    <Fragment key={item.ocId}>
                      <tr className="border-t">
                        <td className="p-2">
                          <Checkbox
                            checked={selectedOcIds.includes(item.ocId)}
                            onCheckedChange={(checked) => toggleOcSelection(item.ocId, Boolean(checked))}
                          />
                        </td>
                        <td className="p-2">{item.ocNo}</td>
                        <td className="p-2">{item.name}</td>
                        <td className="p-2">{item.branch ?? '-'}</td>
                        <td className="p-2">
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                setPreviewOcId((current) => (current === item.ocId ? null : item.ocId))
                              }
                            >
                              {previewOcId === item.ocId ? 'Hide' : 'View'}
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => {
                                setSelectedOcIds([item.ocId]);
                                setPreviewOcId(item.ocId);
                                setDownloadOpen(true);
                              }}
                            >
                              Download
                            </Button>
                          </div>
                        </td>
                      </tr>

                      {previewOcId === item.ocId ? (
                        <tr className="border-t bg-muted/10">
                          <td colSpan={5} className="p-3">
                            {previewQuery.isLoading ? (
                              <div className="text-sm text-muted-foreground">Loading preview...</div>
                            ) : previewQuery.error ? (
                              <div className="text-sm text-destructive">
                                {(previewQuery.error as Error).message}
                              </div>
                            ) : previewQuery.data?.data ? (
                              <div className="space-y-2 text-sm">
                                <div className="font-semibold">
                                  {previewQuery.data.data.oc.name} ({previewQuery.data.data.oc.ocNo})
                                </div>
                                <div>Branch: {previewQuery.data.data.oc.branch ?? '-'}</div>
                                <div>
                                  Current Semester SGPA:{' '}
                                  {previewQuery.data.data.currentSemester.sgpa?.toFixed(2) ?? '-'} | Cumulative CGPA:{' '}
                                  {previewQuery.data.data.cumulative.cgpa?.toFixed(2) ?? '-'}
                                </div>
                                <div className="overflow-auto rounded border">
                                  <table className="min-w-full text-xs">
                                    <thead className="bg-muted/50">
                                      <tr>
                                        <th className="p-2 text-left">S.No</th>
                                        <th className="p-2 text-left">Subject</th>
                                        <th className="p-2 text-left">Credits</th>
                                        <th className="p-2 text-left">Letter Grade</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {previewQuery.data.data.subjects.map((subject) => (
                                        <tr key={`${item.ocId}-${subject.sNo}-${subject.subject}`} className="border-t">
                                          <td className="p-2">{subject.sNo}</td>
                                          <td className="p-2">{subject.subject}</td>
                                          <td className="p-2">{subject.credits}</td>
                                          <td className="p-2">{subject.letterGrade ?? '-'}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            ) : (
                              <div className="text-sm text-muted-foreground">No preview data available.</div>
                            )}
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

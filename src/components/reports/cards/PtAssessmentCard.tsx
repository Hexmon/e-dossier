'use client';

import { Fragment, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { academicsApi } from '@/app/lib/api/academicsMarksApi';
import { listPTTypes } from '@/app/lib/api/Physicaltrainingapi';
import { DownloadDialog } from '@/components/reports/common/DownloadDialog';
import { useCourseSemesters, usePtAssessmentPreview, useReportsDownloads } from '@/hooks/useReports';

const EMPTY_TASK_ID = '__no_task__';
const EMPTY_TASK_TITLE = 'No Tasks';

export function PtAssessmentCard() {
  const [courseId, setCourseId] = useState('');
  const [semester, setSemester] = useState<number | null>(null);
  const [ptTypeId, setPtTypeId] = useState('');
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);

  const courseSemesters = useCourseSemesters(courseId || null);
  const previewQuery = usePtAssessmentPreview({ courseId, semester, ptTypeId });
  const downloads = useReportsDownloads();

  const coursesQuery = useQuery({
    queryKey: ['reports', 'courses'],
    queryFn: () => academicsApi.getCourses().then((res) => res.items ?? []),
  });

  const ptTypesQuery = useQuery({
    queryKey: ['reports', 'pt-types', semester],
    queryFn: () => listPTTypes(semester as number).then((res) => res.items ?? []),
    enabled: Boolean(semester),
  });

  const ptTypeOptions = useMemo(
    () => [{ id: 'ALL', code: 'ALL', title: 'All PT Types' }, ...(ptTypesQuery.data ?? [])],
    [ptTypesQuery.data]
  );
  const combinedPreview = useMemo(() => {
    const data = previewQuery.data?.data;
    if (!data) return null;

    const taskGroups = data.sections.flatMap((section) =>
      (section.tasks.length ? section.tasks : [{ taskId: EMPTY_TASK_ID, title: EMPTY_TASK_TITLE }]).map((task) => ({
        key: `${section.ptType.id}:${task.taskId}`,
        ptTypeId: section.ptType.id,
        ptTypeCode: section.ptType.code,
        taskId: task.taskId,
        taskTitle: task.title,
      }))
    );

    const typeGroups = taskGroups.reduce<Array<{ key: string; label: string; colSpan: number }>>((groups, task) => {
      const lastGroup = groups[groups.length - 1];
      if (lastGroup?.key === task.ptTypeId) {
        lastGroup.colSpan += 3;
        return groups;
      }
      groups.push({
        key: task.ptTypeId,
        label: task.ptTypeCode,
        colSpan: 3,
      });
      return groups;
    }, []);

    const rowMap = new Map<
      string,
      {
        ocId: string;
        sNo: number;
        tesNo: string;
        rank: string;
        name: string;
        totalMarksScored: number;
        cells: Record<string, { attemptCode: string | null; gradeCode: string | null; marks: number | null }>;
      }
    >();

    for (const section of data.sections) {
      for (const row of section.rows) {
        const existing = rowMap.get(row.ocId) ?? {
          ocId: row.ocId,
          sNo: row.sNo,
          tesNo: row.tesNo,
          rank: row.rank,
          name: row.name,
          totalMarksScored: 0,
          cells: {},
        };

        existing.totalMarksScored += row.totalMarksScored;
        for (const task of section.tasks) {
          existing.cells[`${section.ptType.id}:${task.taskId}`] = row.cells[task.taskId] ?? {
            attemptCode: null,
            gradeCode: null,
            marks: null,
          };
        }
        rowMap.set(row.ocId, existing);
      }
    }

    return {
      taskGroups,
      typeGroups,
      rows: Array.from(rowMap.values()).sort((left, right) => left.sNo - right.sNo),
    };
  }, [previewQuery.data]);

  const onDownload = async (meta: { password: string; preparedBy: string; checkedBy: string }) => {
    if (!courseId || !semester || !ptTypeId) {
      toast.error('Select course, semester and PT type first.');
      return;
    }

    try {
      await downloads.ptAssessmentDownload.mutateAsync({
        courseId,
        semester,
        ptTypeId,
        ...meta,
      });
      toast.success('Download started.');
      setDownloadOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to download report.');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Physical Assessment Training (All Semesters)</CardTitle>
        <CardDescription>
          View PT matrix and generate encrypted PDF for one PT type or all PT types in the selected semester.
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
                setPtTypeId('');
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
                setPtTypeId('');
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

          <div className="space-y-2">
            <Label>PT Type</Label>
            <Select value={ptTypeId} onValueChange={setPtTypeId} disabled={!semester}>
              <SelectTrigger>
                <SelectValue placeholder="Select PT type" />
              </SelectTrigger>
              <SelectContent>
                {ptTypeOptions.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.code} - {item.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={async () => {
              setViewModalOpen(true);
              await previewQuery.refetch();
            }}
            disabled={!courseId || !semester || !ptTypeId || previewQuery.isFetching}
          >
            {previewQuery.isFetching ? 'Loading...' : 'View'}
          </Button>
          <Button type="button" onClick={() => setDownloadOpen(true)} disabled={!courseId || !semester || !ptTypeId}>
            Download PDF
          </Button>
        </div>

        <Dialog open={viewModalOpen} onOpenChange={setViewModalOpen}>
          <DialogContent className="w-[96vw] max-w-[96vw] md:w-[85vw] md:max-w-[85vw] lg:w-[88vw] lg:max-w-[88vw] xl:w-[90vw] xl:max-w-[90vw]">
            <DialogHeader>
              <DialogTitle>Physical Assessment Preview</DialogTitle>
              <DialogDescription>
                PT matrix preview for the selected course, semester and PT type selection.
              </DialogDescription>
            </DialogHeader>

            {previewQuery.isLoading ? (
              <div className="rounded border p-3 text-sm text-muted-foreground">Loading preview...</div>
            ) : null}

            {previewQuery.error ? (
              <div className="rounded border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                {(previewQuery.error as Error).message}
              </div>
            ) : null}

            {previewQuery.data?.data ? (
              <div className="max-h-[72vh] space-y-3 overflow-auto">
                <div className="rounded border bg-muted/20 p-3 text-sm">
                  Course {previewQuery.data.data.course.code} | Semester {previewQuery.data.data.semester} | PT Type{' '}
                  {previewQuery.data.data.selection.label}
                </div>
                {combinedPreview ? (
                  <div className="overflow-auto rounded border">
                    <table className="min-w-full text-xs">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="border p-2 text-left align-middle" rowSpan={3}>S.No</th>
                          <th className="border p-2 text-left align-middle" rowSpan={3}>TES No</th>
                          <th className="border p-2 text-left align-middle" rowSpan={3}>Rank</th>
                          <th className="border p-2 text-left align-middle" rowSpan={3}>Name</th>
                          {combinedPreview.typeGroups.map((group) => (
                            <th key={group.key} className="border p-2 text-center" colSpan={group.colSpan}>
                              {group.label}
                            </th>
                          ))}
                          <th className="border p-2 text-left align-middle" rowSpan={3}>Marks Scored</th>
                        </tr>
                        <tr>
                          {combinedPreview.taskGroups.map((task) => (
                            <th key={task.key} className="border p-2 text-center" colSpan={3}>
                              {task.taskTitle}
                            </th>
                          ))}
                        </tr>
                        <tr>
                          {combinedPreview.taskGroups.map((task) => (
                            <Fragment key={task.key}>
                              <th className="border p-2 text-left">Attempt</th>
                              <th className="border p-2 text-left">E/G/S</th>
                              <th className="border p-2 text-left">Mks</th>
                            </Fragment>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {combinedPreview.rows.map((row) => (
                          <tr key={row.ocId} className="border-t">
                            <td className="border p-2">{row.sNo}</td>
                            <td className="border p-2">{row.tesNo}</td>
                            <td className="border p-2">{row.rank}</td>
                            <td className="border p-2">{row.name}</td>
                            {combinedPreview.taskGroups.map((task) => (
                              <Fragment key={`${row.ocId}-${task.key}`}>
                                <td className="border p-2">{row.cells[task.key]?.attemptCode ?? ''}</td>
                                <td className="border p-2">{row.cells[task.key]?.gradeCode ?? ''}</td>
                                <td className="border p-2">{row.cells[task.key]?.marks ?? ''}</td>
                              </Fragment>
                            ))}
                            <td className="border p-2">{row.totalMarksScored}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}
              </div>
            ) : null}
          </DialogContent>
        </Dialog>

        <DownloadDialog
          open={downloadOpen}
          onOpenChange={setDownloadOpen}
          title="Download Physical Assessment Report"
          description="Provide metadata and password to download encrypted PDF."
          isPending={downloads.ptAssessmentDownload.isPending}
          onSubmit={onDownload}
        />
      </CardContent>
    </Card>
  );
}

'use client';

import { useMemo, useState } from 'react';
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
import { getPTTemplate } from '@/app/lib/api/Physicaltrainingapi';
import { DownloadDialog } from '@/components/reports/common/DownloadDialog';
import { useCourseSemesters, usePtAssessmentPreview, useReportsDownloads } from '@/hooks/useReports';

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

  const ptTemplateQuery = useQuery({
    queryKey: ['reports', 'pt-template', semester],
    queryFn: () => getPTTemplate(semester as number),
    enabled: Boolean(semester),
  });

  const ptTypeOptions = useMemo(() => ptTemplateQuery.data?.types ?? [], [ptTemplateQuery.data]);
  const previewColumns = useMemo(() => {
    const data = previewQuery.data?.data;
    if (!data) return [];

    return data.tasks.flatMap((task) =>
      task.attempts.flatMap((attempt) =>
        attempt.grades.map((grade) => ({
          key: `${task.taskId}:${attempt.attemptId}:${grade.gradeCode}`,
          task: task.title,
          attempt: attempt.attemptCode,
          grade: grade.gradeCode,
        }))
      )
    );
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
          View PT matrix and generate encrypted PDF for one PT type in selected semester.
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
            onClick={() => {
              setViewModalOpen(true);
              void previewQuery.refetch();
            }}
            disabled={!courseId || !semester || !ptTypeId}
          >
            View
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
                PT matrix preview for selected course, semester and PT type.
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
                  {previewQuery.data.data.ptType.code} - {previewQuery.data.data.ptType.title}
                </div>
                <div className="overflow-auto rounded border">
                  <table className="min-w-full text-xs">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="p-2 text-left">S.No</th>
                        <th className="p-2 text-left">TES No</th>
                        <th className="p-2 text-left">Rank</th>
                        <th className="p-2 text-left">Name</th>
                        {previewColumns.map((column) => (
                          <th key={column.key} className="p-2 text-left">
                            {column.task} | {column.attempt}-{column.grade}
                          </th>
                        ))}
                        <th className="p-2 text-left">Marks Scored</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewQuery.data.data.rows.map((row) => (
                        <tr key={row.ocId} className="border-t">
                          <td className="p-2">{row.sNo}</td>
                          <td className="p-2">{row.tesNo}</td>
                          <td className="p-2">{row.rank}</td>
                          <td className="p-2">{row.name}</td>
                          {previewColumns.map((column) => (
                            <td key={`${row.ocId}-${column.key}`} className="p-2">
                              {row.cells[column.key] ?? ''}
                            </td>
                          ))}
                          <td className="p-2">{row.totalMarksScored}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
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

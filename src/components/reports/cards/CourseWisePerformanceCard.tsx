'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { academicsApi } from '@/app/lib/api/academicsMarksApi';
import { useCourseSemesters, useCourseWisePerformancePreview, useReportsDownloads } from '@/hooks/useReports';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PasswordField } from '@/components/reports/common/PasswordField';
import type { CourseWisePerformanceColumn, CourseWisePerformanceRow } from '@/types/reports';

function readCell(row: CourseWisePerformanceRow, key: CourseWisePerformanceColumn['key']) {
  if (key === 'serNo') return String(row.sNo);
  if (key === 'tesNo') return row.tesNo;
  if (key === 'rank') return row.rank;
  if (key === 'name') return row.name;

  const value = row[key];
  if (typeof value !== 'number') return '';
  return value.toFixed(2);
}

export function CourseWisePerformanceCard() {
  const [courseId, setCourseId] = useState('');
  const [semester, setSemester] = useState<number | null>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [isPreparingDownload, setIsPreparingDownload] = useState(false);

  const courseSemesters = useCourseSemesters(courseId || null);
  const downloads = useReportsDownloads();

  const coursesQuery = useQuery({
    queryKey: ['reports', 'courses'],
    queryFn: () => academicsApi.getCourses().then((res) => res.items ?? []),
  });

  const previewQuery = useCourseWisePerformancePreview({
    courseId,
    semester,
    enabled: Boolean(courseId && semester),
  });

  const handleDownloadClick = async () => {
    if (!courseId || !semester) {
      toast.error('Select course and semester first.');
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
    if (!password.trim()) {
      toast.error('Enter a file password.');
      return;
    }

    try {
      await downloads.courseWisePerformanceDownload.mutateAsync({
        courseId,
        semester,
        password: password.trim(),
      });
      toast.success('Encrypted PDF download started.');
      setDownloadOpen(false);
      setPassword('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to download report.');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Course Wise Performance Record (Sem I - VI)</CardTitle>
        <CardDescription>
          Semester-wise course performance chart with encrypted PDF download.
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
              disabled={!courseId}
            >
              <SelectTrigger className="w-full min-w-0">
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

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={!courseId || !semester || previewQuery.isFetching}
            onClick={async () => {
              setViewModalOpen(true);
              await previewQuery.refetch();
            }}
          >
            {previewQuery.isFetching ? 'Loading...' : 'View'}
          </Button>
          <Button
            type="button"
            onClick={() => void handleDownloadClick()}
            disabled={!courseId || !semester || isPreparingDownload || downloads.courseWisePerformanceDownload.isPending}
          >
            {isPreparingDownload
              ? 'Preparing...'
              : downloads.courseWisePerformanceDownload.isPending
                ? 'Generating...'
                : 'Download PDF'}
          </Button>
        </div>

        <Dialog open={viewModalOpen} onOpenChange={setViewModalOpen}>
          <DialogContent className="min-w-0 overflow-hidden p-4 sm:p-6 w-[96vw] max-w-[96vw] md:w-[90vw] md:max-w-[90vw] lg:w-[92vw] lg:max-w-[92vw] xl:w-[94vw] xl:max-w-[94vw]">
            <DialogHeader>
              <DialogTitle>Course Wise Performance Preview</DialogTitle>
              <DialogDescription>
                Semester-wise OC rows for selected course.
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
              <div className="min-w-0 space-y-3">
                <div className="rounded border bg-muted/20 p-2 text-sm">
                  Rows: {previewQuery.data.data.rows.length} | Formula: {previewQuery.data.data.formulaLabel}
                </div>
                <div className="w-full max-w-full overflow-auto rounded border">
                  <div className="max-h-[70vh] overflow-auto">
                  <table className="min-w-max text-xs">
                    <thead className="sticky top-0 z-10 bg-muted/70 backdrop-blur">
                      <tr>
                        {previewQuery.data.data.columns.map((column) => (
                          <th key={column.key} className="border-b px-2 py-2 text-center">
                            <div>{column.label}</div>
                            {column.maxMarks !== null ? (
                              <div className="text-[11px] text-muted-foreground">(MM {column.maxMarks})</div>
                            ) : null}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewQuery.data.data.rows.map((row) => (
                        <tr key={row.ocId} className="border-b">
                          {previewQuery.data.data.columns.map((column) => (
                            <td
                              key={`${row.ocId}-${column.key}`}
                              className={`px-2 py-2 ${column.key === 'name' ? 'text-left' : 'text-center'}`}
                            >
                              {readCell(row, column.key)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  </div>
                </div>
              </div>
            ) : null}
          </DialogContent>
        </Dialog>

        <Dialog
          open={downloadOpen}
          onOpenChange={(nextOpen) => {
            setDownloadOpen(nextOpen);
            if (!nextOpen) setPassword('');
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Download Course Wise Performance Report (PDF)</DialogTitle>
              <DialogDescription>
                File will be encrypted with this password.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <Label>Password (file encryption)</Label>
              <PasswordField value={password} onChange={setPassword} />
            </div>
            <DialogFooter>
              <Button
                type="button"
                onClick={() => void handleDownload()}
                disabled={downloads.courseWisePerformanceDownload.isPending}
              >
                {downloads.courseWisePerformanceDownload.isPending ? 'Generating...' : 'Download'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

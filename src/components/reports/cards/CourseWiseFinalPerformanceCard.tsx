'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { academicsApi } from '@/app/lib/api/academicsMarksApi';
import { useCourseWiseFinalPerformancePreview, useReportsDownloads } from '@/hooks/useReports';
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
import type { CourseWiseFinalPerformanceRow } from '@/types/reports';

function readCell(row: CourseWiseFinalPerformanceRow, key: string) {
  if (key === 'sNo') return String(row.sNo);
  if (key === 'tesNo') return row.tesNo;
  if (key === 'rank') return row.rank;
  if (key === 'name') return row.name;
  if (key === 'orderOfMerit') return row.orderOfMerit === null ? '' : String(row.orderOfMerit);
  if (key === 'piAllotment') return row.piAllotment ?? '';
  const value = (row as unknown as Record<string, unknown>)[key];
  if (typeof value !== 'number') return '';
  return value.toFixed(2);
}

const columns = [
  { key: 'sNo', label: 'S. No' },
  { key: 'tesNo', label: 'TES No' },
  { key: 'rank', label: 'Rank' },
  { key: 'name', label: 'Name' },
  { key: 'academics', label: 'Academics (MM 8100)' },
  { key: 'ptSwimming', label: 'PT & Swimming (MM 900)' },
  { key: 'games', label: 'Games + X-Country (MM 600)' },
  { key: 'olq', label: 'OLQ (MM 1800)' },
  { key: 'cfe', label: 'Credit for Excellence (MM 150)' },
  { key: 'cdrMarks', label: "Cdr's Mks (MM 150)" },
  { key: 'camp', label: 'Camp Mks (MM 210)' },
  { key: 'drill', label: 'Drill Mks (MM 90)' },
  { key: 'grandTotal', label: 'Grand Total (MM 12000)' },
  { key: 'percentage', label: '%' },
  { key: 'orderOfMerit', label: 'OM' },
  { key: 'piAllotment', label: 'PI Allotment' },
];

export function CourseWiseFinalPerformanceCard() {
  const [courseId, setCourseId] = useState('');
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [isPreparingDownload, setIsPreparingDownload] = useState(false);

  const previewQuery = useCourseWiseFinalPerformancePreview({
    courseId,
    enabled: Boolean(courseId),
  });
  const downloads = useReportsDownloads();

  const coursesQuery = useQuery({
    queryKey: ['reports', 'courses'],
    queryFn: () => academicsApi.getCourses().then((res) => res.items ?? []),
  });

  const handleDownloadClick = async () => {
    if (!courseId) {
      toast.error('Select course first.');
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
        toast.error('No rows available for selected course.');
        return;
      }
      setDownloadOpen(true);
    } finally {
      setIsPreparingDownload(false);
    }
  };

  const handleDownload = async () => {
    if (!courseId) {
      toast.error('Select course first.');
      return;
    }
    if (!password.trim()) {
      toast.error('Enter a file password.');
      return;
    }

    try {
      await downloads.courseWiseFinalPerformanceDownload.mutateAsync({
        courseId,
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
        <CardTitle>Course Wise Final Performance Record</CardTitle>
        <CardDescription>
          I-VI total performance chart with encrypted PDF download.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Course</Label>
            <Select value={courseId} onValueChange={setCourseId}>
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
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={!courseId || previewQuery.isFetching}
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
            disabled={!courseId || isPreparingDownload || downloads.courseWiseFinalPerformanceDownload.isPending}
          >
            {isPreparingDownload
              ? 'Preparing...'
              : downloads.courseWiseFinalPerformanceDownload.isPending
                ? 'Generating...'
                : 'Download PDF'}
          </Button>
        </div>

        <Dialog open={viewModalOpen} onOpenChange={setViewModalOpen}>
          <DialogContent className="w-[96vw] max-w-[96vw] min-w-0 overflow-hidden md:w-[92vw] md:max-w-[92vw] lg:w-[94vw] lg:max-w-[94vw] xl:w-[95vw] xl:max-w-[95vw]">
            <DialogHeader>
              <DialogTitle>Course Wise Final Performance Preview</DialogTitle>
              <DialogDescription>
                Aggregated I-VI semester performance for all active OCs in selected course.
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
                <div className="max-h-[70vh] w-full min-w-0 max-w-full overflow-x-auto overflow-y-auto rounded border">
                  <table className="w-max min-w-[1800px] text-xs">
                    <thead className="sticky top-0 z-10 bg-muted/70 backdrop-blur">
                      <tr>
                        {columns.map((column) => (
                          <th key={column.key} className="border-b px-2 py-2 text-center">
                            {column.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewQuery.data.data.rows.map((row) => (
                        <tr key={row.ocId} className="border-b">
                          {columns.map((column) => (
                            <td
                              key={`${row.ocId}-${column.key}`}
                              className={`px-2 py-2 ${column.key === 'name' || column.key === 'piAllotment' ? 'text-left' : 'text-center'}`}
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
              <DialogTitle>Download Course Wise Final Performance (PDF)</DialogTitle>
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
                disabled={downloads.courseWiseFinalPerformanceDownload.isPending}
              >
                {downloads.courseWiseFinalPerformanceDownload.isPending ? 'Generating...' : 'Download'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { academicsApi } from '@/app/lib/api/academicsMarksApi';
import { getPTTemplate } from '@/app/lib/api/Physicaltrainingapi';
import { DownloadDialog } from '@/components/reports/common/DownloadDialog';
import { downloadCsvFiles, downloadExcelFile } from '@/components/reports/common/report-export';
import { useCourseSemesters, usePtAssessmentPreview, useReportsDownloads } from '@/hooks/useReports';

export function PtAssessmentCard() {
  const [courseId, setCourseId] = useState('');
  const [semester, setSemester] = useState<number | null>(null);
  const [ptTypeId, setPtTypeId] = useState('');
  const [downloadOpen, setDownloadOpen] = useState(false);

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

  const onDownloadCsv = () => {
    const data = previewQuery.data?.data;
    if (!data) return;

    const scoreColumns = data.tasks.flatMap((task) =>
      task.attempts.flatMap((attempt) =>
        attempt.grades.map((grade) => ({
          key: `${task.taskId}:${attempt.attemptId}:${grade.gradeCode}`,
          label: `${task.title} ${attempt.attemptCode}-${grade.gradeCode}`,
        }))
      )
    );

    const rows = data.rows.map((row) => {
      const base: Record<string, string | number | null> = {
        sNo: row.sNo,
        tesNo: row.tesNo,
        rank: row.rank,
        name: row.name,
      };
      for (const col of scoreColumns) {
        base[col.label] = row.cells[col.key] ?? '';
      }
      base.totalMarksScored = row.totalMarksScored;
      return base;
    });

    downloadCsvFiles(`pt-assessment-${data.course.code}-sem-${data.semester}-${data.ptType.code}`, [
      { name: 'pt-assessment', rows },
    ]);
  };

  const onDownloadExcel = () => {
    const data = previewQuery.data?.data;
    if (!data) return;

    const scoreColumns = data.tasks.flatMap((task) =>
      task.attempts.flatMap((attempt) =>
        attempt.grades.map((grade) => ({
          key: `${task.taskId}:${attempt.attemptId}:${grade.gradeCode}`,
          label: `${task.title} ${attempt.attemptCode}-${grade.gradeCode}`,
        }))
      )
    );

    const rows = data.rows.map((row) => {
      const base: Record<string, string | number | null> = {
        sNo: row.sNo,
        tesNo: row.tesNo,
        rank: row.rank,
        name: row.name,
      };
      for (const col of scoreColumns) {
        base[col.label] = row.cells[col.key] ?? '';
      }
      base.totalMarksScored = row.totalMarksScored;
      return base;
    });

    downloadExcelFile(`pt-assessment-${data.course.code}-sem-${data.semester}-${data.ptType.code}.xlsx`, [
      { name: 'PT Assessment', rows },
    ]);
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
            onClick={() => previewQuery.refetch()}
            disabled={!courseId || !semester || !ptTypeId}
          >
            View
          </Button>
          <Button type="button" onClick={() => setDownloadOpen(true)} disabled={!previewQuery.data?.data}>
            Download PDF
          </Button>
          <Button type="button" variant="outline" onClick={onDownloadCsv} disabled={!previewQuery.data?.data}>
            CSV
          </Button>
          <Button type="button" variant="outline" onClick={onDownloadExcel} disabled={!previewQuery.data?.data}>
            Excel
          </Button>
        </div>

        {previewQuery.data?.data ? (
          <div className="overflow-auto rounded border">
            <table className="min-w-full text-xs">
              <thead className="bg-muted/50">
                <tr>
                  <th className="p-2 text-left">S.No</th>
                  <th className="p-2 text-left">TES No</th>
                  <th className="p-2 text-left">Name</th>
                  <th className="p-2 text-left">Marks Scored</th>
                </tr>
              </thead>
              <tbody>
                {previewQuery.data.data.rows.map((row) => (
                  <tr key={row.ocId} className="border-t">
                    <td className="p-2">{row.sNo}</td>
                    <td className="p-2">{row.tesNo}</td>
                    <td className="p-2">{row.name}</td>
                    <td className="p-2">{row.totalMarksScored}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

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

'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { academicsApi } from '@/app/lib/api/academicsMarksApi';
import { DownloadDialog } from '@/components/reports/common/DownloadDialog';
import { downloadCsvFiles, downloadExcelFile } from '@/components/reports/common/report-export';
import { useConsolidatedSessionalPreview, useCourseSemesters, useReportsDownloads } from '@/hooks/useReports';

export function ConsolidatedSessionalCard() {
  const [courseId, setCourseId] = useState('');
  const [semester, setSemester] = useState<number | null>(null);
  const [subjectId, setSubjectId] = useState('');
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [viewRequested, setViewRequested] = useState(false);

  const courseSemesters = useCourseSemesters(courseId || null);
  const previewQuery = useConsolidatedSessionalPreview({
    courseId,
    semester,
    subjectId,
    enabled: viewRequested,
  });
  const downloads = useReportsDownloads();

  const coursesQuery = useQuery({
    queryKey: ['reports', 'courses'],
    queryFn: () => academicsApi.getCourses().then((res) => res.items ?? []),
  });

  const offeringsQuery = useQuery({
    queryKey: ['reports', 'course-offerings', courseId, semester],
    queryFn: () => academicsApi.getCourseOfferings(courseId, semester as number).then((res) => res.items ?? []),
    enabled: Boolean(courseId && semester),
  });

  const subjectOptions = useMemo(() => {
    const map = new Map<string, { id: string; label: string }>();
    for (const offering of offeringsQuery.data ?? []) {
      const label = `${offering.subject.code} - ${offering.subject.name}`;
      map.set(offering.subject.id, { id: offering.subject.id, label });
    }
    return Array.from(map.values());
  }, [offeringsQuery.data]);

  useEffect(() => {
    setViewRequested(false);
  }, [courseId, semester, subjectId]);

  const onDownload = async (meta: { password: string; preparedBy: string; checkedBy: string }) => {
    if (!courseId || !semester || !subjectId) {
      toast.error('Select course, semester and subject first.');
      return;
    }

    try {
      await downloads.consolidatedDownload.mutateAsync({
        courseId,
        semester,
        subjectId,
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

    const theoryRows = data.theoryRows.map((row) => ({
      sNo: row.sNo,
      ocNo: row.ocNo,
      name: row.ocName,
      branch: row.branch ?? '',
      pt1: row.phaseTest1Obtained,
      pt2: row.phaseTest2Obtained,
      tutorial: row.tutorialObtained,
      sessional: row.sessionalObtained,
      final: row.finalObtained,
      total: row.totalObtained,
      letterGrade: row.letterGrade ?? '',
    }));
    const practicalRows = data.practicalRows.map((row) => ({
      sNo: row.sNo,
      ocNo: row.ocNo,
      name: row.ocName,
      branch: row.branch ?? '',
      practical: row.practicalObtained,
      letterGrade: row.letterGrade ?? '',
    }));

    const theoryTotal = data.theorySummary.reduce((sum, item) => sum + item.count, 0);
    const practicalTotal = data.practicalSummary.reduce((sum, item) => sum + item.count, 0);

    downloadCsvFiles(`consolidated-sessional-${data.course.code}-sem-${data.semester}`, [
      {
        name: 'theory',
        rows: [
          ...theoryRows,
          { sNo: '', ocNo: '', name: 'SUMMARY', branch: '', pt1: '', pt2: '', tutorial: '', sessional: '', final: '', total: '', letterGrade: '' },
          ...data.theorySummary.map((item) => ({
            sNo: '',
            ocNo: '',
            name: '',
            branch: '',
            pt1: '',
            pt2: '',
            tutorial: '',
            sessional: '',
            final: '',
            total: item.count,
            letterGrade: item.grade,
          })),
          { sNo: '', ocNo: '', name: '', branch: '', pt1: '', pt2: '', tutorial: '', sessional: '', final: '', total: theoryTotal, letterGrade: 'Total' },
        ],
      },
      {
        name: 'practical',
        rows: [
          ...practicalRows,
          { sNo: '', ocNo: '', name: 'SUMMARY', branch: '', practical: '', letterGrade: '' },
          ...data.practicalSummary.map((item) => ({
            sNo: '',
            ocNo: '',
            name: '',
            branch: '',
            practical: item.count,
            letterGrade: item.grade,
          })),
          { sNo: '', ocNo: '', name: '', branch: '', practical: practicalTotal, letterGrade: 'Total' },
        ],
      },
    ]);
  };

  const onDownloadExcel = () => {
    const data = previewQuery.data?.data;
    if (!data) return;

    const theoryRows = data.theoryRows.map((row) => ({
      sNo: row.sNo,
      ocNo: row.ocNo,
      name: row.ocName,
      branch: row.branch ?? '',
      pt1: row.phaseTest1Obtained,
      pt2: row.phaseTest2Obtained,
      tutorial: row.tutorialObtained,
      sessional: row.sessionalObtained,
      final: row.finalObtained,
      total: row.totalObtained,
      letterGrade: row.letterGrade ?? '',
    }));
    const practicalRows = data.practicalRows.map((row) => ({
      sNo: row.sNo,
      ocNo: row.ocNo,
      name: row.ocName,
      branch: row.branch ?? '',
      practical: row.practicalObtained,
      letterGrade: row.letterGrade ?? '',
    }));

    const theoryTotal = data.theorySummary.reduce((sum, item) => sum + item.count, 0);
    const practicalTotal = data.practicalSummary.reduce((sum, item) => sum + item.count, 0);

    downloadExcelFile(`consolidated-sessional-${data.course.code}-sem-${data.semester}.xlsx`, [
      {
        name: 'Theory',
        rows: [
          ...theoryRows,
          { sNo: '', ocNo: '', name: 'SUMMARY', branch: '', pt1: '', pt2: '', tutorial: '', sessional: '', final: '', total: '', letterGrade: '' },
          ...data.theorySummary.map((item) => ({
            sNo: '',
            ocNo: '',
            name: '',
            branch: '',
            pt1: '',
            pt2: '',
            tutorial: '',
            sessional: '',
            final: '',
            total: item.count,
            letterGrade: item.grade,
          })),
          { sNo: '', ocNo: '', name: '', branch: '', pt1: '', pt2: '', tutorial: '', sessional: '', final: '', total: theoryTotal, letterGrade: 'Total' },
        ],
      },
      {
        name: 'Practical',
        rows: [
          ...practicalRows,
          { sNo: '', ocNo: '', name: 'SUMMARY', branch: '', practical: '', letterGrade: '' },
          ...data.practicalSummary.map((item) => ({
            sNo: '',
            ocNo: '',
            name: '',
            branch: '',
            practical: item.count,
            letterGrade: item.grade,
          })),
          { sNo: '', ocNo: '', name: '', branch: '', practical: practicalTotal, letterGrade: 'Total' },
        ],
      },
    ]);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Consolidated Sessional Mark Sheet (Subject Wise)</CardTitle>
        <CardDescription>
          Generate theory/practical sessional sheet with grade-wise summary.
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
                setSubjectId('');
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
                setSubjectId('');
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
            <Label>Subject</Label>
            <Select value={subjectId} onValueChange={setSubjectId} disabled={!courseId || !semester}>
              <SelectTrigger>
                <SelectValue placeholder="Select subject" />
              </SelectTrigger>
              <SelectContent>
                {subjectOptions.map((subject) => (
                  <SelectItem key={subject.id} value={subject.id}>
                    {subject.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              if (!viewRequested) setViewRequested(true);
              void previewQuery.refetch();
            }}
            disabled={!courseId || !semester || !subjectId}
          >
            View
          </Button>
          <Button
            type="button"
            onClick={() => setDownloadOpen(true)}
            disabled={!previewQuery.data?.data}
          >
            Download PDF
          </Button>
          <Button type="button" variant="outline" onClick={onDownloadCsv} disabled={!previewQuery.data?.data}>
            CSV
          </Button>
          <Button type="button" variant="outline" onClick={onDownloadExcel} disabled={!previewQuery.data?.data}>
            Excel
          </Button>
        </div>

        {viewRequested && previewQuery.isLoading ? (
          <div className="rounded border p-3 text-sm text-muted-foreground">Loading preview...</div>
        ) : null}

        {viewRequested && previewQuery.error ? (
          <div className="rounded border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            {(previewQuery.error as Error).message}
          </div>
        ) : null}

        {viewRequested && previewQuery.data?.data ? (
          <div className="space-y-4">
            <div className="rounded border bg-muted/20 p-3 text-sm">
              Preview loaded: Theory rows {previewQuery.data.data.theoryRows.length}, Practical rows{' '}
              {previewQuery.data.data.practicalRows.length}.
            </div>

            {previewQuery.data.data.theoryRows.length ? (
              <div className="space-y-2 rounded border p-2">
                <div className="text-sm font-semibold">Theory</div>
                <div className="overflow-auto rounded border">
                  <table className="min-w-full text-xs">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="p-2 text-left">S.No</th>
                        <th className="p-2 text-left">OC No</th>
                        <th className="p-2 text-left">Name</th>
                        <th className="p-2 text-left">Branch</th>
                        <th className="p-2 text-left">PT1</th>
                        <th className="p-2 text-left">PT2</th>
                        <th className="p-2 text-left">Tutorial</th>
                        <th className="p-2 text-left">Sessional</th>
                        <th className="p-2 text-left">Final</th>
                        <th className="p-2 text-left">Total</th>
                        <th className="p-2 text-left">Grade</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewQuery.data.data.theoryRows.map((row) => (
                        <tr key={row.ocId} className="border-t">
                          <td className="p-2">{row.sNo}</td>
                          <td className="p-2">{row.ocNo}</td>
                          <td className="p-2">{row.ocName}</td>
                          <td className="p-2">{row.branch ?? '-'}</td>
                          <td className="p-2">{row.phaseTest1Obtained ?? ''}</td>
                          <td className="p-2">{row.phaseTest2Obtained ?? ''}</td>
                          <td className="p-2">{row.tutorialObtained ?? ''}</td>
                          <td className="p-2">{row.sessionalObtained ?? ''}</td>
                          <td className="p-2">{row.finalObtained ?? ''}</td>
                          <td className="p-2">{row.totalObtained ?? ''}</td>
                          <td className="p-2">{row.letterGrade ?? ''}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="w-full max-w-xs overflow-auto rounded border">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="p-2 text-left">Grade</th>
                        <th className="p-2 text-left">Count</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewQuery.data.data.theorySummary.map((item) => (
                        <tr key={`theory-summary-${item.grade}`} className="border-t">
                          <td className="p-2">{item.grade}</td>
                          <td className="p-2">{item.count}</td>
                        </tr>
                      ))}
                      <tr className="border-t font-semibold">
                        <td className="p-2">Total</td>
                        <td className="p-2">
                          {previewQuery.data.data.theorySummary.reduce((sum, item) => sum + item.count, 0)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}

            {previewQuery.data.data.practicalRows.length ? (
              <div className="space-y-2 rounded border p-2">
                <div className="text-sm font-semibold">Practical</div>
                <div className="overflow-auto rounded border">
                  <table className="min-w-full text-xs">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="p-2 text-left">S.No</th>
                        <th className="p-2 text-left">OC No</th>
                        <th className="p-2 text-left">Name</th>
                        <th className="p-2 text-left">Branch</th>
                        <th className="p-2 text-left">Practical</th>
                        <th className="p-2 text-left">Grade</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewQuery.data.data.practicalRows.map((row) => (
                        <tr key={row.ocId} className="border-t">
                          <td className="p-2">{row.sNo}</td>
                          <td className="p-2">{row.ocNo}</td>
                          <td className="p-2">{row.ocName}</td>
                          <td className="p-2">{row.branch ?? '-'}</td>
                          <td className="p-2">{row.practicalObtained ?? ''}</td>
                          <td className="p-2">{row.letterGrade ?? ''}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="w-full max-w-xs overflow-auto rounded border">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="p-2 text-left">Grade</th>
                        <th className="p-2 text-left">Count</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewQuery.data.data.practicalSummary.map((item) => (
                        <tr key={`practical-summary-${item.grade}`} className="border-t">
                          <td className="p-2">{item.grade}</td>
                          <td className="p-2">{item.count}</td>
                        </tr>
                      ))}
                      <tr className="border-t font-semibold">
                        <td className="p-2">Total</td>
                        <td className="p-2">
                          {previewQuery.data.data.practicalSummary.reduce((sum, item) => sum + item.count, 0)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}

            {!previewQuery.data.data.theoryRows.length && !previewQuery.data.data.practicalRows.length ? (
              <div className="rounded border p-3 text-sm text-muted-foreground">
                No records found for selected course, semester and subject.
              </div>
            ) : null}
          </div>
        ) : null}

        <DownloadDialog
          open={downloadOpen}
          onOpenChange={setDownloadOpen}
          title="Download Consolidated Sessional Report"
          description="Enter metadata and password to generate encrypted PDF."
          isPending={downloads.consolidatedDownload.isPending}
          onSubmit={onDownload}
        />
      </CardContent>
    </Card>
  );
}

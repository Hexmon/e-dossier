'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { academicsApi } from '@/app/lib/api/academicsMarksApi';
import { DownloadDialog } from '@/components/reports/common/DownloadDialog';
import { downloadCsvFiles, downloadExcelFile } from '@/components/reports/common/report-export';
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
  const [downloadOpen, setDownloadOpen] = useState(false);

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

  const onDownloadCsv = () => {
    const data = previewQuery.data?.data;
    if (!data) return;

    downloadCsvFiles(`semester-grade-${data.course.code}-sem-${data.semester}-${data.oc.ocNo}`, [
      {
        name: 'subjects',
        rows: data.subjects.map((subject) => ({
          sNo: subject.sNo,
          subject: subject.subject,
          credits: subject.credits,
          letterGrade: subject.letterGrade ?? '',
        })),
      },
      {
        name: 'summary',
        rows: [
          { metric: 'Current Semester Total Credits', value: data.currentSemester.totalCredits },
          { metric: 'Current Semester Total Grades', value: data.currentSemester.totalGrades },
          { metric: 'Current Semester SGPA', value: data.currentSemester.sgpa ?? '' },
          { metric: 'Cumulative Total Credits', value: data.cumulative.totalCredits },
          { metric: 'Cumulative Total Grades', value: data.cumulative.totalGrades },
          { metric: 'Cumulative CGPA', value: data.cumulative.cgpa ?? '' },
          { metric: 'Total Valid Credits Earned', value: data.totalValidCreditsEarned },
        ],
      },
    ]);
  };

  const onDownloadExcel = () => {
    const data = previewQuery.data?.data;
    if (!data) return;

    downloadExcelFile(`semester-grade-${data.course.code}-sem-${data.semester}-${data.oc.ocNo}.xlsx`, [
      {
        name: 'Subjects',
        rows: data.subjects.map((subject) => ({
          sNo: subject.sNo,
          subject: subject.subject,
          credits: subject.credits,
          letterGrade: subject.letterGrade ?? '',
        })),
      },
      {
        name: 'Summary',
        rows: [
          { metric: 'Current Semester Total Credits', value: data.currentSemester.totalCredits },
          { metric: 'Current Semester Total Grades', value: data.currentSemester.totalGrades },
          { metric: 'Current Semester SGPA', value: data.currentSemester.sgpa ?? '' },
          { metric: 'Cumulative Total Credits', value: data.cumulative.totalCredits },
          { metric: 'Cumulative Total Grades', value: data.cumulative.totalGrades },
          { metric: 'Cumulative CGPA', value: data.cumulative.cgpa ?? '' },
          { metric: 'Total Valid Credits Earned', value: data.totalValidCreditsEarned },
        ],
      },
    ]);
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
            onClick={() => candidatesQuery.refetch()}
            disabled={!courseId || !semester}
          >
            View
          </Button>
          <Button type="button" onClick={() => setDownloadOpen(true)} disabled={!courseId || !semester}>
            Download PDF
          </Button>
          <Button type="button" variant="outline" onClick={onDownloadCsv} disabled={!previewQuery.data?.data}>
            CSV
          </Button>
          <Button type="button" variant="outline" onClick={onDownloadExcel} disabled={!previewQuery.data?.data}>
            Excel
          </Button>
        </div>

        {candidatesQuery.data?.items?.length ? (
          <div className="overflow-auto rounded border">
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
                {candidatesQuery.data.items.map((item) => (
                  <tr key={item.ocId} className="border-t">
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
                      <Button type="button" variant="outline" size="sm" onClick={() => setPreviewOcId(item.ocId)}>
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {previewQuery.data?.data ? (
          <div className="space-y-2 rounded border p-3 text-sm">
            <div className="font-semibold">
              {previewQuery.data.data.oc.name} ({previewQuery.data.data.oc.ocNo})
            </div>
            <div>Branch: {previewQuery.data.data.oc.branch ?? '-'}</div>
            <div>
              Current Semester SGPA: {previewQuery.data.data.currentSemester.sgpa?.toFixed(2) ?? '-'} | Cumulative CGPA:{' '}
              {previewQuery.data.data.cumulative.cgpa?.toFixed(2) ?? '-'}
            </div>
            <div className="overflow-auto">
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
                    <tr key={`${subject.sNo}-${subject.subject}`} className="border-t">
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
        ) : null}

        <DownloadDialog
          open={downloadOpen}
          onOpenChange={setDownloadOpen}
          title="Download Semester Grade Report"
          description="Select one or many cadets and generate encrypted PDF/ZIP."
          includeDateReadonly
          isPending={downloads.semesterGradeDownload.isPending}
          onSubmit={onDownload}
        />
      </CardContent>
    </Card>
  );
}

'use client';

import { useEffect, useMemo, useState } from 'react';
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
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { academicsApi } from '@/app/lib/api/academicsMarksApi';
import { DownloadDialog } from '@/components/reports/common/DownloadDialog';
import { useConsolidatedSessionalPreview, useCourseSemesters, useReportsDownloads } from '@/hooks/useReports';
import type { ReportBranch } from '@/types/reports';

const BRANCH_OPTIONS: ReportBranch[] = ['E', 'M', 'O'];

export function ConsolidatedSessionalCard() {
  const [courseId, setCourseId] = useState('');
  const [semester, setSemester] = useState<number | null>(null);
  const [subjectId, setSubjectId] = useState('');
  const [branches, setBranches] = useState<ReportBranch[]>([]);
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewRequested, setViewRequested] = useState(false);

  const courseSemesters = useCourseSemesters(courseId || null);
  const coursesQuery = useQuery({
    queryKey: ['reports', 'courses'],
    queryFn: () => academicsApi.getCourses().then((res) => res.items ?? []),
  });

  const offeringsQuery = useQuery({
    queryKey: ['reports', 'course-offerings', courseId, semester],
    queryFn: () => academicsApi.getCourseOfferings(courseId, semester as number).then((res) => res.items ?? []),
    enabled: Boolean(courseId && semester),
  });
  const branchKey = branches.join(',');

  const previewQuery = useConsolidatedSessionalPreview({
    courseId,
    semester,
    subjectId,
    branches,
    enabled: viewRequested,
  });
  const downloads = useReportsDownloads();

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
    setViewModalOpen(false);
  }, [courseId, semester, subjectId, branchKey]);

  const onDownload = async (meta: {
    password: string;
    preparedBy: string;
    checkedBy: string;
    instructorName?: string;
  }) => {
    if (!courseId || !semester || !subjectId) {
      toast.error('Select course, semester and subject first.');
      return;
    }

    try {
      await downloads.consolidatedDownload.mutateAsync({
        courseId,
        semester,
        subjectId,
        branches,
        password: meta.password,
        preparedBy: meta.preparedBy.trim() || undefined,
        checkedBy: meta.checkedBy.trim() || undefined,
        instructorName: meta.instructorName?.trim() || undefined,
      });
      toast.success('Encrypted PDF download started.');
      setDownloadOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to download report.');
    }
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

        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={() => {
              setDownloadOpen(true);
            }}
            disabled={!courseId || !semester || !subjectId}
          >
            Download PDF
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              if (!viewRequested) setViewRequested(true);
              setViewModalOpen(true);
              void previewQuery.refetch();
            }}
            disabled={!courseId || !semester || !subjectId || previewQuery.isFetching}
          >
            {previewQuery.isFetching ? 'Loading...' : 'View'}
          </Button>
        </div>

        <Dialog open={viewModalOpen} onOpenChange={setViewModalOpen}>
          <DialogContent className="w-[96vw] max-w-[96vw] md:w-[85vw] md:max-w-[85vw] lg:w-[88vw] lg:max-w-[88vw] xl:w-[90vw] xl:max-w-[90vw]">
            <DialogHeader>
              <DialogTitle>Consolidated Sessional Preview</DialogTitle>
              <DialogDescription>
                Theory and practical rows for selected course, semester, and subject.
              </DialogDescription>
            </DialogHeader>

            {viewRequested && previewQuery.isLoading ? (
              <div className="rounded border p-3 text-sm text-muted-foreground">Loading preview...</div>
            ) : null}

            {viewRequested && previewQuery.error ? (
              <div className="rounded border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                {(previewQuery.error as Error).message}
              </div>
            ) : null}

            {viewRequested && previewQuery.data?.data ? (
              <div className="max-h-[70vh] space-y-4 overflow-auto">
                <div className="rounded border bg-muted/20 p-3 text-sm">
                  Preview loaded: Theory rows {previewQuery.data.data.theoryRows.length}, Practical rows{' '}
                  {previewQuery.data.data.practicalRows.length}
                  {branches.length ? `, Branches ${branches.join(', ')}.` : '.'}
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
                            <th className="p-2 text-left">Content of Exp</th>
                            <th className="p-2 text-left">Maint of Exp</th>
                            <th className="p-2 text-left">Practical</th>
                            <th className="p-2 text-left">Viva</th>
                            <th className="p-2 text-left">Total</th>
                            <th className="p-2 text-left">Grade</th>
                          </tr>
                        </thead>
                        <tbody>
                          {previewQuery.data.data.practicalRows.map((row) => (
                            <tr key={row.ocId} className="border-t">
                              <td className="p-2">{row.sNo}</td>
                              <td className="p-2">{row.ocNo}</td>
                              <td className="p-2">{row.ocName}</td>
                              <td className="p-2">{row.contentOfExpObtained ?? ''}</td>
                              <td className="p-2">{row.maintOfExpObtained ?? ''}</td>
                              <td className="p-2">{row.practicalObtained ?? ''}</td>
                              <td className="p-2">{row.vivaObtained ?? ''}</td>
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
          </DialogContent>
        </Dialog>

        <DownloadDialog
          open={downloadOpen}
          onOpenChange={setDownloadOpen}
          title="Download Consolidated Sessional (PDF)"
          description="File will be downloaded as password-protected PDF. Instructor / Prepared By / Checked By are optional."
          isPending={downloads.consolidatedDownload.isPending}
          includeInstructorField
          preparedByRequired={false}
          checkedByRequired={false}
          initialValues={{
            instructorName: previewQuery.data?.data?.subject.instructorName ?? '',
          }}
          onSubmit={onDownload}
        />
      </CardContent>
    </Card>
  );
}

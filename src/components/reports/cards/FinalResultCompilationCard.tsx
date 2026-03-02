'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { academicsApi } from '@/app/lib/api/academicsMarksApi';
import { useCourseSemesters, useFinalResultCompilationPreview, useReportsDownloads } from '@/hooks/useReports';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PasswordField } from '@/components/reports/common/PasswordField';

type IdentityRowState = {
  enrolmentNumber: string;
  certSerialNo: string;
};

export function FinalResultCompilationCard() {
  const [courseId, setCourseId] = useState('');
  const [semester, setSemester] = useState<number | null>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewRequested, setViewRequested] = useState(false);
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [preparedBy, setPreparedBy] = useState('');
  const [checkedBy, setCheckedBy] = useState('');
  const [identityRows, setIdentityRows] = useState<Record<string, IdentityRowState>>({});
  const [isPreparingDownload, setIsPreparingDownload] = useState(false);

  const courseSemesters = useCourseSemesters(courseId || null);
  const downloads = useReportsDownloads();
  const previewQuery = useFinalResultCompilationPreview({
    courseId,
    semester,
    enabled: Boolean(courseId && semester),
  });

  const coursesQuery = useQuery({
    queryKey: ['reports', 'courses'],
    queryFn: () => academicsApi.getCourses().then((res) => res.items ?? []),
  });

  useEffect(() => {
    setViewRequested(false);
    setViewModalOpen(false);
    setIdentityRows({});
  }, [courseId, semester]);

  useEffect(() => {
    const rows = previewQuery.data?.data.rows;
    if (!rows) return;
    setIdentityRows((prev) => {
      const next: Record<string, IdentityRowState> = {};
      for (const row of rows) {
        next[row.ocId] = {
          enrolmentNumber: prev[row.ocId]?.enrolmentNumber ?? '',
          certSerialNo: prev[row.ocId]?.certSerialNo ?? '',
        };
      }
      return next;
    });
  }, [previewQuery.data?.data.rows]);

  useEffect(() => {
    if (downloadOpen) return;
    setPassword('');
    setPreparedBy('');
    setCheckedBy('');
  }, [downloadOpen]);

  const optionalMissingCount = useMemo(() => {
    const rows = previewQuery.data?.data.rows ?? [];
    let missing = 0;
    for (const row of rows) {
      const identity = identityRows[row.ocId];
      if (!identity?.enrolmentNumber?.trim() || !identity?.certSerialNo?.trim()) {
        missing += 1;
      }
    }
    return missing;
  }, [identityRows, previewQuery.data?.data.rows]);

  const topDownloadDisabled =
    !courseId || !semester || isPreparingDownload || downloads.finalResultCompilationDownload.isPending;

  const handleTopDownloadClick = async () => {
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
    const rows = previewQuery.data?.data.rows ?? [];
    if (!rows.length) {
      toast.error('No rows available for download.');
      return;
    }

    try {
      await downloads.finalResultCompilationDownload.mutateAsync({
        courseId,
        semester,
        password: password.trim(),
        preparedBy: preparedBy.trim() || undefined,
        checkedBy: checkedBy.trim() || undefined,
        identityRows: rows.map((row) => ({
          ocId: row.ocId,
          enrolmentNumber: identityRows[row.ocId]?.enrolmentNumber?.trim() ?? '',
          certSerialNo: identityRows[row.ocId]?.certSerialNo?.trim() ?? '',
        })),
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
          Preview final result table and download encrypted PDF with enrolment and certificate serial details.
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
              onValueChange={(value) => setSemester(Number(value))}
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

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={!courseId || !semester || previewQuery.isFetching}
            onClick={() => {
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
          <DialogContent className="w-[96vw] max-w-[96vw] md:w-[90vw] md:max-w-[90vw] lg:w-[92vw] lg:max-w-[92vw] xl:w-[94vw] xl:max-w-[94vw]">
            <DialogHeader>
              <DialogTitle>Final Result Compilation Preview</DialogTitle>
              <DialogDescription>
                Enter Enrolment Number and Cert Ser No for each OC before downloading.
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

            {previewQuery.data?.data ? (
              <div className="space-y-3">
                <div className="rounded border bg-muted/20 p-2 text-sm">
                  Rows: {previewQuery.data.data.rows.length} | Subject columns: {previewQuery.data.data.subjectColumns.length}
                  {optionalMissingCount > 0 ? ` | Optional fields empty for ${optionalMissingCount} row(s)` : ' | Ready for download'}
                </div>

                <div className="max-h-[68vh] overflow-auto rounded border">
                  <table className="min-w-max text-xs">
                    <thead className="sticky top-0 z-10 bg-muted/70 backdrop-blur">
                      <tr>
                        <th className="border-b px-2 py-2 text-left">Ser No</th>
                        <th className="border-b px-2 py-2 text-left">TES No</th>
                        <th className="border-b px-2 py-2 text-left">Name</th>
                        <th className="border-b px-2 py-2 text-left">Enrolment Number</th>
                        <th className="border-b px-2 py-2 text-left">Cert Ser No</th>
                        <th className="border-b px-2 py-2 text-left">Prev Points</th>
                        <th className="border-b px-2 py-2 text-left">Prev CGPA</th>
                        {previewQuery.data.data.subjectColumns.map((col) => (
                          <th key={col.key} className="border-b px-2 py-2 text-center">
                            <div>{col.subjectCode}</div>
                            <div className="text-[11px] text-muted-foreground">{col.kind} ({col.credits})</div>
                          </th>
                        ))}
                        <th className="border-b px-2 py-2 text-left">Sem Points</th>
                        <th className="border-b px-2 py-2 text-left">SGPA</th>
                        <th className="border-b px-2 py-2 text-left">Upto Points</th>
                        <th className="border-b px-2 py-2 text-left">Upto CGPA</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewQuery.data.data.rows.map((row) => {
                        const identity = identityRows[row.ocId] ?? { enrolmentNumber: '', certSerialNo: '' };
                        return (
                          <tr key={row.ocId} className="border-b">
                            <td className="px-2 py-2">{row.sNo}</td>
                            <td className="px-2 py-2">{row.tesNo}</td>
                            <td className="px-2 py-2">{row.name}</td>
                            <td className="min-w-[160px] px-2 py-2">
                              <Input
                                value={identity.enrolmentNumber}
                                onChange={(event) =>
                                  setIdentityRows((prev) => ({
                                    ...prev,
                                    [row.ocId]: {
                                      enrolmentNumber: event.target.value,
                                      certSerialNo: prev[row.ocId]?.certSerialNo ?? '',
                                    },
                                  }))
                                }
                                placeholder="Enter enrolment no"
                              />
                            </td>
                            <td className="min-w-[130px] px-2 py-2">
                              <Input
                                value={identity.certSerialNo}
                                onChange={(event) =>
                                  setIdentityRows((prev) => ({
                                    ...prev,
                                    [row.ocId]: {
                                      enrolmentNumber: prev[row.ocId]?.enrolmentNumber ?? '',
                                      certSerialNo: event.target.value,
                                    },
                                  }))
                                }
                                placeholder="Enter cert ser no"
                              />
                            </td>
                            <td className="px-2 py-2">{row.previousCumulativePoints}</td>
                            <td className="px-2 py-2">
                              {row.previousCumulativeCgpa !== null ? row.previousCumulativeCgpa.toFixed(2) : ''}
                            </td>
                            {previewQuery.data.data.subjectColumns.map((col) => (
                              <td key={`${row.ocId}-${col.key}`} className="px-2 py-2 text-center">
                                {row.subjectGrades[col.key] ?? ''}
                              </td>
                            ))}
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

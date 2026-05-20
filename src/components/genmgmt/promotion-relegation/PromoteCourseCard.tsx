"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useDebouncedValue } from "@/app/lib/debounce";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRelegationActions, useRelegationModule } from "@/hooks/useRelegation";
import type { PromotionRelegationCourseOption } from "@/hooks/usePromotionRelegationMgmt";
import type { RelegationOcOption } from "@/app/lib/api/relegationApi";
import { relegationApi } from "@/app/lib/api/relegationApi";
import { Check, Undo2, UserMinus } from "lucide-react";

type PromoteCourseCardProps = {
  courses: PromotionRelegationCourseOption[];
};

function parseCourseCode(code: string) {
  const match = /^([A-Za-z][A-Za-z0-9]*)[-=](\d+)$/.exec(code.trim());
  if (!match) return null;
  return { prefix: match[1].toUpperCase(), number: Number(match[2]) };
}

export default function PromoteCourseCard({ courses }: PromoteCourseCardProps) {
  const [fromCourseId, setFromCourseId] = useState("");
  const [fromSemester, setFromSemester] = useState("1");
  const [ocSearch, setOcSearch] = useState("");
  const [batchNote, setBatchNote] = useState("");
  const [excludedOcIds, setExcludedOcIds] = useState<string[]>([]);
  const [excludedOcSnapshots, setExcludedOcSnapshots] = useState<Record<string, RelegationOcOption>>({});
  const [excludedQueue, setExcludedQueue] = useState<RelegationOcOption[]>([]);
  const [isExcludedQueueOpen, setIsExcludedQueueOpen] = useState(false);
  const [queueReason, setQueueReason] = useState("");
  const [queueRemark, setQueueRemark] = useState("");
  const [queuePdfFile, setQueuePdfFile] = useState<File | null>(null);
  const [queueCleanupConfirmed, setQueueCleanupConfirmed] = useState(false);
  const [isQueueSubmitting, setIsQueueSubmitting] = useState(false);
  const queueFileInputRef = useRef<HTMLInputElement>(null);

  const debouncedSearch = useDebouncedValue(ocSearch, 350);

  const { ocOptionsQuery } = useRelegationModule(null, {
    courseId: fromCourseId || undefined,
    activeOnly: true,
    q: debouncedSearch || undefined,
  });
  const { promoteCourse, promoteCourseMutation } = useRelegationActions();
  const selectedSemester = Number(fromSemester);
  const selectedCourse = useMemo(
    () => courses.find((course) => course.id === fromCourseId) ?? null,
    [courses, fromCourseId]
  );
  const repeatTargetCourse = useMemo(() => {
    if (!selectedCourse) return null;
    const parsed = parseCourseCode(selectedCourse.code);
    if (!parsed) return null;
    const expectedCode = `${parsed.prefix}-${parsed.number + 1}`;
    return courses.find((course) => course.code.trim().toUpperCase().replace("=", "-") === expectedCode) ?? null;
  }, [courses, selectedCourse]);

  const ocOptions = useMemo(() => {
    const items = ocOptionsQuery.data ?? [];
    return items.filter((oc) => Number(oc.currentSemester) === selectedSemester);
  }, [ocOptionsQuery.data, selectedSemester]);
  const visibleExcludedCount = ocOptions.filter((oc) => excludedOcIds.includes(oc.ocId)).length;
  const visiblePromotionCount = Math.max(ocOptions.length - visibleExcludedCount, 0);
  const hasRelegationDecisions = excludedOcIds.length > 0;
  const currentQueuedOc = excludedQueue[0] ?? null;
  const canSubmitQueuedRelegation =
    Boolean(currentQueuedOc) &&
    Boolean(repeatTargetCourse) &&
    queueReason.trim().length >= 2 &&
    queueCleanupConfirmed &&
    !isQueueSubmitting;

  const resetQueueInputs = useCallback(() => {
    setQueueReason("");
    setQueueRemark("");
    setQueuePdfFile(null);
    setQueueCleanupConfirmed(false);
    if (queueFileInputRef.current) {
      queueFileInputRef.current.value = "";
    }
  }, []);

  useEffect(() => {
    setExcludedOcIds([]);
    setExcludedOcSnapshots({});
    setExcludedQueue([]);
    setIsExcludedQueueOpen(false);
    resetQueueInputs();
  }, [fromCourseId, fromSemester, resetQueueInputs]);

  const setOcRelegationDecision = (oc: RelegationOcOption, shouldRelegate: boolean) => {
    const ocId = oc.ocId;
    setExcludedOcIds((current) => {
      const exists = current.includes(ocId);
      if (shouldRelegate) return exists ? current : [...current, ocId];
      return exists ? current.filter((value) => value !== ocId) : current;
    });
    setExcludedOcSnapshots((current) => {
      if (!shouldRelegate) {
        const { [ocId]: _removed, ...rest } = current;
        return rest;
      }
      return { ...current, [ocId]: oc };
    });
  };

  const handlePromoteCourse = async () => {
    if (!fromCourseId) {
      toast.error("Select a source course.");
      return;
    }

    try {
      const excludedSnapshot = excludedOcIds
        .map((ocId) => excludedOcSnapshots[ocId])
        .filter((oc): oc is RelegationOcOption => Boolean(oc));
      const response = await promoteCourse({
        fromCourseId,
        fromSemester: selectedSemester,
        excludeOcIds: excludedOcIds,
        note: batchNote.trim() ? batchNote.trim() : null,
      });

      const summary = response.result.summary;
      toast.success(
        `Promotion completed. Promoted: ${summary.promoted}, Marked for relegation: ${summary.excludedByRequest + summary.excludedByException}.`
      );
      setExcludedQueue(excludedSnapshot);
      setIsExcludedQueueOpen(false);
      setExcludedOcIds([]);
      setExcludedOcSnapshots({});
      resetQueueInputs();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to promote course.";
      toast.error(message);
    }
  };

  const handleQueuedRelegationSubmit = async () => {
    if (!currentQueuedOc || !repeatTargetCourse) {
      toast.error("Next course is not configured for excluded OC relegation.");
      return;
    }

    if (queueReason.trim().length < 2) {
      toast.error("Enter a reason before relegating the excluded OC.");
      return;
    }

    if (!queueCleanupConfirmed) {
      toast.error("Confirm the repeat-semester cleanup before submitting.");
      return;
    }

    let pdfObjectKey: string | null = null;
    let pdfUrl: string | null = null;
    setIsQueueSubmitting(true);

    try {
      if (queuePdfFile) {
        const presign = await relegationApi.presignPdf({
          fileName: queuePdfFile.name,
          contentType: "application/pdf",
          sizeBytes: queuePdfFile.size,
        });
        pdfObjectKey = presign.objectKey;

        const uploadResponse = await fetch(presign.uploadUrl, {
          method: "PUT",
          headers: {
            "Content-Type": "application/pdf",
          },
          body: queuePdfFile,
        });

        if (!uploadResponse.ok) {
          const errorText = await uploadResponse.text().catch(() => "");
          const suffix = errorText ? ` ${errorText.slice(0, 200)}` : "";
          throw new Error(
            `PDF upload failed (${uploadResponse.status} ${uploadResponse.statusText}).${suffix}`
          );
        }

        pdfUrl = presign.publicUrl;
      }

      await relegationApi.applyTransfer({
        ocId: currentQueuedOc.ocId,
        toCourseId: repeatTargetCourse.id,
        relegationMode: "REPEAT_SEMESTER",
        targetSemester: currentQueuedOc.currentSemester,
        reason: queueReason.trim(),
        remark: queueRemark.trim() ? queueRemark.trim() : null,
        pdfObjectKey,
        pdfUrl,
      });

      toast.success(
        `OC ${currentQueuedOc.ocNo} moved to ${repeatTargetCourse.code} semester ${currentQueuedOc.currentSemester}.`
      );
      setExcludedQueue((current) => {
        const next = current.slice(1);
        if (next.length === 0) {
          setIsExcludedQueueOpen(false);
        }
        return next;
      });
      resetQueueInputs();
    } catch (error) {
      if (pdfObjectKey) {
        await relegationApi.cleanupPendingPdf({ objectKey: pdfObjectKey }).catch(() => undefined);
      }
      const message = error instanceof Error ? error.message : "Failed to relegate excluded OC.";
      toast.error(message);
    } finally {
      setIsQueueSubmitting(false);
    }
  };

  return (
    <Card className="rounded-xl border shadow-sm">
      <CardHeader>
        <CardTitle>Promote Course</CardTitle>
        <CardDescription>
          Promote cadets semester-wise within the selected course while keeping individual relegation transfer unchanged.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
          <div className="space-y-2">
            <Label>Course From</Label>
            <Select value={fromCourseId} onValueChange={setFromCourseId}>
              <SelectTrigger>
                <SelectValue placeholder="Select course" />
              </SelectTrigger>
              <SelectContent>
                {courses.map((course) => (
                  <SelectItem key={course.id} value={course.id}>
                    {course.code} | {course.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Current Semester</Label>
            <Select value={fromSemester} onValueChange={setFromSemester}>
              <SelectTrigger>
                <SelectValue placeholder="Select semester" />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5].map((semester) => (
                  <SelectItem key={semester} value={String(semester)}>
                    Semester {semester}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Promote To</Label>
            <Input value={`Semester ${selectedSemester + 1}`} disabled />
          </div>

          <div className="space-y-2">
            <Label>Search OCs</Label>
            <Input
              placeholder="Search by OC no or name"
              value={ocSearch}
              onChange={(event) => setOcSearch(event.target.value)}
              disabled={!fromCourseId}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Batch Note (Optional)</Label>
          <Input
            placeholder="Add audit note"
            value={batchNote}
            onChange={(event) => setBatchNote(event.target.value)}
            disabled={!fromCourseId}
          />
        </div>

        <div className="flex flex-col gap-3 rounded-lg border bg-muted/30 p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300"
            >
              Will promote: {visiblePromotionCount}
            </Badge>
            <Badge variant={visibleExcludedCount > 0 ? "destructive" : "outline"}>
              For relegation: {visibleExcludedCount}
            </Badge>
          </div>
          {hasRelegationDecisions ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-fit"
              onClick={() => {
                setExcludedOcIds([]);
                setExcludedOcSnapshots({});
              }}
              aria-label="Promote all OCs in this batch"
            >
              <Undo2 className="h-4 w-4" />
              Promote all
            </Button>
          ) : null}
        </div>

        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[760px] border-collapse text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="p-2">OC No</th>
                <th className="p-2">Name</th>
                <th className="p-2">Current Semester</th>
                <th className="p-2">Platoon</th>
                <th className="p-2">Promotion Status</th>
                <th className="p-2">Decision</th>
              </tr>
            </thead>
            <tbody>
              {!fromCourseId ? (
                <tr>
                  <td colSpan={6} className="p-4 text-center text-muted-foreground">
                    Select source course to view OCs.
                  </td>
                </tr>
              ) : ocOptionsQuery.isLoading ? (
                <tr>
                  <td colSpan={6} className="p-4 text-center text-muted-foreground">
                    Loading OCs...
                  </td>
                </tr>
              ) : ocOptions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-4 text-center text-muted-foreground">
                    No active OCs found in the selected course for semester {selectedSemester}.
                  </td>
                </tr>
              ) : (
                ocOptions.map((oc) => {
                  const isExcluded = excludedOcIds.includes(oc.ocId);
                  return (
                    <tr
                      key={oc.ocId}
                      className={isExcluded ? "border-b bg-destructive/5 dark:bg-destructive/10" : "border-b"}
                    >
                      <td className="p-2 font-medium">{oc.ocNo}</td>
                      <td className="p-2">{oc.ocName}</td>
                      <td className="p-2">Semester {oc.currentSemester}</td>
                      <td className="p-2">{oc.platoonKey ?? "-"}</td>
                      <td className="p-2">
                        {isExcluded ? (
                          <Badge variant="destructive">Will repeat semester</Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300"
                          >
                            Will be promoted
                          </Badge>
                        )}
                      </td>
                      <td className="p-2">
                        <div className="inline-flex items-center rounded-md border bg-background p-0.5">
                          <Button
                            type="button"
                            size="sm"
                            variant={isExcluded ? "ghost" : "secondary"}
                            className="h-7 gap-1 px-2 text-xs"
                            onClick={() => setOcRelegationDecision(oc, false)}
                            aria-label={`Promote ${oc.ocNo}`}
                            aria-pressed={!isExcluded}
                          >
                            <Check className="h-3.5 w-3.5" />
                            Promote
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant={isExcluded ? "destructive" : "ghost"}
                            className={`h-7 gap-1 px-2 text-xs ${
                              isExcluded ? "" : "text-destructive hover:text-destructive"
                            }`}
                            onClick={() => setOcRelegationDecision(oc, true)}
                            aria-label={`Relegate ${oc.ocNo}`}
                            aria-pressed={isExcluded}
                          >
                            <UserMinus className="h-3.5 w-3.5" />
                            Relegate
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {excludedQueue.length > 0 ? (
          <div className="space-y-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium">OCs pending relegation: {excludedQueue.length}</p>
                <p className="text-xs text-muted-foreground">
                  They will repeat semester {selectedSemester} in {repeatTargetCourse?.code ?? "the next course"}.
                </p>
              </div>
              <Button
                type="button"
                variant="destructive"
                onClick={() => setIsExcludedQueueOpen((value) => !value)}
                disabled={!repeatTargetCourse}
              >
                Relegate selected OCs ({excludedQueue.length})
              </Button>
            </div>
            {!repeatTargetCourse ? (
              <p className="text-sm text-destructive">
                Next course is not configured. Create the next course in Course Management before relegating excluded OCs.
              </p>
            ) : null}
            {isExcludedQueueOpen && currentQueuedOc && repeatTargetCourse ? (
              <div className="space-y-4 rounded-lg border bg-background p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">
                      {currentQueuedOc.ocNo} | {currentQueuedOc.ocName}
                    </p>
                    <p className="text-xs text-muted-foreground">Repeat semester relegation</p>
                  </div>
                  <Badge variant="outline">{excludedQueue.length} left</Badge>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-md border bg-muted/30 p-3">
                    <p className="text-xs text-muted-foreground">Current attempt</p>
                    <p className="mt-1 text-sm font-medium">{currentQueuedOc.currentCourseCode}</p>
                    <p className="text-xs text-muted-foreground">Semester {currentQueuedOc.currentSemester}</p>
                  </div>
                  <div className="rounded-md border bg-muted/30 p-3">
                    <p className="text-xs text-muted-foreground">Target attempt</p>
                    <p className="mt-1 text-sm font-medium">{repeatTargetCourse.code}</p>
                    <p className="text-xs text-muted-foreground">Semester {currentQueuedOc.currentSemester}</p>
                  </div>
                  <div className="rounded-md border bg-muted/30 p-3">
                    <p className="text-xs text-muted-foreground">Data cleanup</p>
                    <p className="mt-1 text-sm font-medium">Future-semester data only</p>
                    <p className="text-xs text-muted-foreground">
                      Semester {currentQueuedOc.currentSemester} data stays in history.
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="excludedReason">Reason</Label>
                  <Textarea
                    id="excludedReason"
                    rows={3}
                    placeholder="Enter reason for repeat-semester relegation"
                    value={queueReason}
                    onChange={(event) => setQueueReason(event.target.value)}
                    disabled={isQueueSubmitting}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="excludedRemark">Remarks (Optional)</Label>
                  <Textarea
                    id="excludedRemark"
                    rows={3}
                    placeholder="Enter remarks"
                    value={queueRemark}
                    onChange={(event) => setQueueRemark(event.target.value)}
                    disabled={isQueueSubmitting}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="excludedPdfFile">Choose PDF (Optional)</Label>
                  <Input
                    ref={queueFileInputRef}
                    id="excludedPdfFile"
                    type="file"
                    accept="application/pdf"
                    disabled={isQueueSubmitting}
                    onChange={(event) => setQueuePdfFile(event.target.files?.[0] ?? null)}
                  />
                </div>

                <label className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm">
                  <Checkbox
                    checked={queueCleanupConfirmed}
                    onCheckedChange={(checked) => setQueueCleanupConfirmed(checked === true)}
                    disabled={isQueueSubmitting}
                  />
                  <span>
                    I understand that only data after semester {currentQueuedOc.currentSemester} will be deleted for
                    this current attempt. Semester {currentQueuedOc.currentSemester} data remains available in history.
                  </span>
                </label>

                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="destructive"
                    disabled={!canSubmitQueuedRelegation}
                    onClick={handleQueuedRelegationSubmit}
                  >
                    {isQueueSubmitting ? "Relegating..." : "Confirm repeat-semester relegation"}
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="flex justify-end">
          <Button
            onClick={handlePromoteCourse}
            disabled={!fromCourseId || promoteCourseMutation.isPending}
          >
            {promoteCourseMutation.isPending ? "Promoting..." : "Promote Course"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

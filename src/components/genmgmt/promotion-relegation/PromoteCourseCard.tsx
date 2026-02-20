"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useDebouncedValue } from "@/app/lib/debounce";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRelegationActions, useRelegationHistory, useRelegationModule } from "@/hooks/useRelegation";
import type { PromotionRelegationCourseOption } from "@/hooks/usePromotionRelegationMgmt";
import RelegationActionDialog from "./RelegationActionDialog";
import RelegationForm from "@/components/relegation/RelegationForm";

type PromoteCourseCardProps = {
  courses: PromotionRelegationCourseOption[];
};

export default function PromoteCourseCard({ courses }: PromoteCourseCardProps) {
  const [fromCourseId, setFromCourseId] = useState("");
  const [ocSearch, setOcSearch] = useState("");
  const [batchNote, setBatchNote] = useState("");
  const [exceptionDialogOpen, setExceptionDialogOpen] = useState(false);
  const [selectedExceptionOc, setSelectedExceptionOc] = useState<{
    ocId: string;
    ocName: string;
    currentCourseId: string;
    currentCourseCode: string;
  } | null>(null);
  const [localExceptionOcIds, setLocalExceptionOcIds] = useState<string[]>([]);

  const debouncedSearch = useDebouncedValue(ocSearch, 350);

  const { ocOptionsQuery, nextCoursesQuery } = useRelegationModule(fromCourseId || null, {
    courseId: fromCourseId || undefined,
    activeOnly: true,
    q: debouncedSearch || undefined,
  });
  const { promoteCourse, promoteCourseMutation } = useRelegationActions();

  const targetCourse = useMemo(() => (nextCoursesQuery.data ?? [])[0] ?? null, [nextCoursesQuery.data]);

  const exceptionHistoryQuery = useRelegationHistory({
    courseFromId: fromCourseId || undefined,
    courseToId: targetCourse?.courseId,
    movementKind: "PROMOTION_EXCEPTION",
    limit: 100,
    offset: 0,
  });

  const persistedExceptionOcIds = useMemo(
    () => (exceptionHistoryQuery.data?.items ?? []).map((item) => item.ocId),
    [exceptionHistoryQuery.data?.items]
  );

  const effectiveExceptionOcIds = useMemo(() => {
    return Array.from(new Set([...persistedExceptionOcIds, ...localExceptionOcIds]));
  }, [localExceptionOcIds, persistedExceptionOcIds]);

  const ocOptions = ocOptionsQuery.data ?? [];
  const handleOpenExceptionDialog = (oc: {
    ocId: string;
    ocName: string;
    currentCourseId: string;
    currentCourseCode: string;
  }) => {
    setSelectedExceptionOc(oc);
    setExceptionDialogOpen(true);
  };

  const handlePromoteCourse = async () => {
    if (!fromCourseId || !targetCourse) {
      toast.error("Select a source course with a valid immediate next course.");
      return;
    }

    try {
      const response = await promoteCourse({
        fromCourseId,
        toCourseId: targetCourse.courseId,
        excludeOcIds: effectiveExceptionOcIds,
        note: batchNote.trim() ? batchNote.trim() : null,
      });

      const summary = response.result.summary;
      toast.success(
        `Promotion completed. Promoted: ${summary.promoted}, Excluded: ${summary.excludedByRequest + summary.excludedByException}.`
      );
      setLocalExceptionOcIds([]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to promote course.";
      toast.error(message);
    }
  };

  return (
    <Card className="rounded-xl border shadow-sm">
      <CardHeader>
        <CardTitle>Promote Course</CardTitle>
        <CardDescription>
          Promote all eligible OCs to immediate next course and mark exceptions as relegated
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
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
            <Label>Course To</Label>
            <Input
              value={targetCourse ? `${targetCourse.courseCode} | ${targetCourse.courseName}` : "No immediate next course"}
              disabled
            />
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

        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[760px] border-collapse text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="p-2">OC No</th>
                <th className="p-2">Name</th>
                <th className="p-2">Platoon</th>
                <th className="p-2">Status</th>
                <th className="p-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {!fromCourseId ? (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-muted-foreground">
                    Select source course to view OCs.
                  </td>
                </tr>
              ) : ocOptionsQuery.isLoading ? (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-muted-foreground">
                    Loading OCs...
                  </td>
                </tr>
              ) : ocOptions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-muted-foreground">
                    No eligible OCs found in selected course.
                  </td>
                </tr>
              ) : (
                ocOptions.map((oc) => {
                  const isRelegated = effectiveExceptionOcIds.includes(oc.ocId);
                  return (
                    <tr key={oc.ocId} className="border-b">
                      <td className="p-2 font-medium">{oc.ocNo}</td>
                      <td className="p-2">{oc.ocName}</td>
                      <td className="p-2">{oc.platoonKey ?? "-"}</td>
                      <td className="p-2">{isRelegated ? "Relegated" : "Eligible"}</td>
                      <td className="p-2">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={isRelegated || !targetCourse}
                          onClick={() =>
                            handleOpenExceptionDialog({
                              ocId: oc.ocId,
                              ocName: oc.ocName,
                              currentCourseId: oc.currentCourseId,
                              currentCourseCode: oc.currentCourseCode,
                            })
                          }
                        >
                          {isRelegated ? "Relegated" : "Relegate"}
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end">
          <Button
            onClick={handlePromoteCourse}
            disabled={!fromCourseId || !targetCourse || promoteCourseMutation.isPending}
          >
            {promoteCourseMutation.isPending ? "Promoting..." : "Promote Course"}
          </Button>
        </div>
      </CardContent>

      <RelegationActionDialog
        open={exceptionDialogOpen}
        onOpenChange={(open) => {
          setExceptionDialogOpen(open);
          if (!open) {
            setSelectedExceptionOc(null);
          }
        }}
        title="Mark Promotion Exception"
        description="This OC will be excluded from Promote Course batch."
      >
        {selectedExceptionOc && targetCourse ? (
          <RelegationForm
            mode="promotion-exception"
            prefill={{
              ocId: selectedExceptionOc.ocId,
              ocName: selectedExceptionOc.ocName,
              currentCourseId: selectedExceptionOc.currentCourseId,
              currentCourseCode: selectedExceptionOc.currentCourseCode,
              transferToCourseId: targetCourse.courseId,
            }}
            lockOcSelection
            lockTransferTo
            submitLabel="Save Exception"
            className="w-full border-0 p-0 shadow-none"
            onSuccess={(transfer) => {
              setLocalExceptionOcIds((prev) => Array.from(new Set([...prev, transfer.oc.ocId])));
              setExceptionDialogOpen(false);
            }}
          />
        ) : null}
      </RelegationActionDialog>
    </Card>
  );
}

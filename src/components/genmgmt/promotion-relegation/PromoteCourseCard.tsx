"use client";

import React, { useMemo, useState } from "react";
import { toast } from "sonner";
import { useDebouncedValue } from "@/app/lib/debounce";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { useRelegationActions, useRelegationModule } from "@/hooks/useRelegation";
import type { PromotionRelegationCourseOption } from "@/hooks/usePromotionRelegationMgmt";
import { Undo2, UserMinus } from "lucide-react";

type PromoteCourseCardProps = {
  courses: PromotionRelegationCourseOption[];
};

export default function PromoteCourseCard({ courses }: PromoteCourseCardProps) {
  const [fromCourseId, setFromCourseId] = useState("");
  const [fromSemester, setFromSemester] = useState("1");
  const [ocSearch, setOcSearch] = useState("");
  const [batchNote, setBatchNote] = useState("");
  const [excludedOcIds, setExcludedOcIds] = useState<string[]>([]);

  const debouncedSearch = useDebouncedValue(ocSearch, 350);

  const { ocOptionsQuery } = useRelegationModule(null, {
    courseId: fromCourseId || undefined,
    activeOnly: true,
    q: debouncedSearch || undefined,
  });
  const { promoteCourse, promoteCourseMutation } = useRelegationActions();
  const selectedSemester = Number(fromSemester);

  const ocOptions = useMemo(() => {
    const items = ocOptionsQuery.data ?? [];
    return items.filter((oc) => Number(oc.currentSemester) === selectedSemester);
  }, [ocOptionsQuery.data, selectedSemester]);
  const visibleExcludedCount = ocOptions.filter((oc) => excludedOcIds.includes(oc.ocId)).length;
  const visiblePromotionCount = Math.max(ocOptions.length - visibleExcludedCount, 0);
  const hasExcludedOcs = excludedOcIds.length > 0;

  const toggleExcludedOc = (ocId: string) => {
    setExcludedOcIds((current) =>
      current.includes(ocId) ? current.filter((value) => value !== ocId) : [...current, ocId]
    );
  };

  const handlePromoteCourse = async () => {
    if (!fromCourseId) {
      toast.error("Select a source course.");
      return;
    }

    try {
      const response = await promoteCourse({
        fromCourseId,
        fromSemester: selectedSemester,
        excludeOcIds: excludedOcIds,
        note: batchNote.trim() ? batchNote.trim() : null,
      });

      const summary = response.result.summary;
      toast.success(
        `Promotion completed. Promoted: ${summary.promoted}, Excluded: ${summary.excludedByRequest + summary.excludedByException}.`
      );
      setExcludedOcIds([]);
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
              Excluded: {visibleExcludedCount}
            </Badge>
          </div>
          {hasExcludedOcs ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-fit"
              onClick={() => setExcludedOcIds([])}
              aria-label="Restore all excluded OCs to promotion list"
            >
              <Undo2 className="h-4 w-4" />
              Restore all
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
                          <Badge variant="destructive">Excluded from this batch</Badge>
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
                        <Button
                          size="sm"
                          variant={isExcluded ? "outline" : "destructive"}
                          onClick={() => toggleExcludedOc(oc.ocId)}
                          aria-label={
                            isExcluded
                              ? `Restore ${oc.ocNo} to promotion list`
                              : `Exclude ${oc.ocNo} from promotion`
                          }
                        >
                          {isExcluded ? (
                            <>
                              <Undo2 className="h-4 w-4" />
                              Restore to promotion list
                            </>
                          ) : (
                            <>
                              <UserMinus className="h-4 w-4" />
                              Exclude from promotion
                            </>
                          )}
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
            disabled={!fromCourseId || promoteCourseMutation.isPending}
          >
            {promoteCourseMutation.isPending ? "Promoting..." : "Promote Course"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

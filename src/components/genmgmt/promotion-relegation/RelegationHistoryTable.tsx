"use client";

import { useEffect, useMemo, useState } from "react";
import { useDebouncedValue } from "@/app/lib/debounce";
import { useRelegationHistory } from "@/hooks/useRelegation";
import type { PromotionRelegationCourseOption } from "@/hooks/usePromotionRelegationMgmt";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type RelegationHistoryTableProps = {
  courses: PromotionRelegationCourseOption[];
  onViewPdf: (historyId: string) => void;
  onViewEnrollments: (ocId: string, ocName: string) => void;
  onVoidPromotion: (ocId: string, ocNo: string) => Promise<void>;
  voidingOcId?: string | null;
};

export default function RelegationHistoryTable({
  courses,
  onViewPdf,
  onViewEnrollments,
  onVoidPromotion,
  voidingOcId,
}: RelegationHistoryTableProps) {
  const [search, setSearch] = useState("");
  const [courseFromId, setCourseFromId] = useState("all");
  const [courseToId, setCourseToId] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<10 | 25 | 50 | 100>(25);
  const [pendingVoidRow, setPendingVoidRow] = useState<{ ocId: string; ocNo: string } | null>(null);
  const debouncedSearch = useDebouncedValue(search, 350);

  const query = useRelegationHistory({
    q: debouncedSearch.trim() ? debouncedSearch.trim() : undefined,
    courseFromId: courseFromId === "all" ? undefined : courseFromId,
    courseToId: courseToId === "all" ? undefined : courseToId,
    limit: pageSize,
    offset: (currentPage - 1) * pageSize,
  });

  const items = useMemo(() => query.data?.items ?? [], [query.data?.items]);
  const total = query.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const hasPrev = currentPage > 1;
  const hasNext = currentPage < totalPages;

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, courseFromId, courseToId, pageSize]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const handleReset = () => {
    setSearch("");
    setCourseFromId("all");
    setCourseToId("all");
    setCurrentPage(1);
    setPageSize(25);
  };

  return (
    <div className="space-y-4 rounded-xl border border-border p-4">
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
        <div className="space-y-1">
          <Label>Search</Label>
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search OC no, name, reason"
          />
        </div>

        <div className="space-y-1">
          <Label>Course From</Label>
          <Select value={courseFromId} onValueChange={setCourseFromId}>
            <SelectTrigger>
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {courses.map((course) => (
                <SelectItem key={course.id} value={course.id}>
                  {course.code}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label>Course To</Label>
          <Select value={courseToId} onValueChange={setCourseToId}>
            <SelectTrigger>
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {courses.map((course) => (
                <SelectItem key={course.id} value={course.id}>
                  {course.code}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-end">
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={!search && courseFromId === "all" && courseToId === "all"}
            className="w-full"
          >
            Reset Filters
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] border-collapse text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="p-2">OC No</th>
              <th className="p-2">OC Name</th>
              <th className="p-2">Course From</th>
              <th className="p-2">Course To</th>
              <th className="p-2">Reason</th>
              <th className="p-2">Date</th>
              <th className="p-2">Media</th>
              <th className="p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {query.isLoading ? (
              <tr>
                <td colSpan={8} className="p-4 text-center text-muted-foreground">
                  Loading history...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-4 text-center text-muted-foreground">
                  No relegation history found.
                </td>
              </tr>
            ) : (
              items.map((row) => (
                <tr key={row.id} className="border-b align-top">
                  <td className="p-2 font-medium">{row.ocNo}</td>
                  <td className="p-2">{row.ocName}</td>
                  <td className="p-2">{row.fromCourseCode}</td>
                  <td className="p-2">{row.toCourseCode}</td>
                  <td className="p-2">
                    <div>{row.reason}</div>
                    {row.movementKind !== "TRANSFER" ? (
                      <div className="mt-1 text-xs text-muted-foreground">{row.movementKind}</div>
                    ) : null}
                  </td>
                  <td className="p-2">{new Date(row.performedAt).toLocaleDateString()}</td>
                  <td className="p-2">
                    {row.hasMedia ? (
                      <Button size="sm" variant="outline" onClick={() => onViewPdf(row.id)}>
                        View PDF
                      </Button>
                    ) : (
                      <span className="text-muted-foreground">N/A</span>
                    )}
                  </td>
                  <td className="p-2">
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onViewEnrollments(row.ocId, row.ocName)}
                      >
                        Enrollments
                      </Button>
                      {row.movementKind === "PROMOTION_BATCH" ? (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => setPendingVoidRow({ ocId: row.ocId, ocNo: row.ocNo })}
                          disabled={voidingOcId === row.ocId}
                        >
                          {voidingOcId === row.ocId ? "Voiding..." : "Void Promotion"}
                        </Button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">
          {total === 0
            ? "No records"
            : `Showing ${(currentPage - 1) * pageSize + 1}-${Math.min(
                currentPage * pageSize,
                total
              )} of ${total}`}
        </p>

        <div className="flex items-center gap-2">
          <Select
            value={String(pageSize)}
            onValueChange={(value) => setPageSize(Number(value) as 10 | 25 | 50 | 100)}
          >
            <SelectTrigger className="w-24">
              <SelectValue placeholder="Rows" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            disabled={!hasPrev || query.isFetching}
          >
            Previous
          </Button>
          <span className="min-w-20 text-center text-sm">
            Page {currentPage} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
            disabled={!hasNext || query.isFetching}
          >
            Next
          </Button>
        </div>
      </div>

      <AlertDialog open={Boolean(pendingVoidRow)} onOpenChange={(open) => !open && setPendingVoidRow(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Void Promotion</AlertDialogTitle>
            <AlertDialogDescription>
              This will void the active promoted enrollment and reactivate the previous archived enrollment for OC{" "}
              {pendingVoidRow?.ocNo}. This action is auditable.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={Boolean(voidingOcId)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={Boolean(voidingOcId)}
              onClick={async () => {
                if (!pendingVoidRow) return;
                await onVoidPromotion(pendingVoidRow.ocId, pendingVoidRow.ocNo);
                setPendingVoidRow(null);
              }}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { UploadCloud, ShieldCheck, CircleCheck, Eye, Pencil, Trash2, CheckSquare } from "lucide-react";
import type { RawRow, UploadedPreviewRow } from "./UploadButton";

type BulkResult = {
  success: number;
  failed: number;
  errors: Array<{ row: number; error: string }>;
} | null;

type Props = {
  rows: UploadedPreviewRow[];
  rawRows: RawRow[];
  previewSession: number;
  bulkUploading: boolean;
  bulkResult: BulkResult;
  onBulkUploadSelected: (selectedIndexes: number[]) => void;
  onClear: () => void;
  onUpdateRow: (index: number, patch: Partial<UploadedPreviewRow>) => void;
  onDeleteRow: (index: number) => void;
  onValidateAll?: () => void;
  validateResult?: BulkResult | null;
  onValidateRow?: (rowIndex: number) => void;
  rowValidations?: Record<number, string | "ok">;
};

export default function UploadPreviewTable({
  rows,
  rawRows,
  previewSession,
  bulkUploading,
  bulkResult,
  onBulkUploadSelected,
  onClear,
  onUpdateRow,
  onDeleteRow,
  onValidateAll,
  validateResult,
  onValidateRow,
  rowValidations = {},
}: Props) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Record<number, boolean>>({});
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [draft, setDraft] = useState<UploadedPreviewRow | null>(null);
  const [viewMode, setViewMode] = useState<"quick" | "raw">("quick");
  const tableViewportRef = useRef<HTMLDivElement | null>(null);
  const topScrollbarRef = useRef<HTMLDivElement | null>(null);
  const [topScrollbarWidth, setTopScrollbarWidth] = useState<number>(0);

  useEffect(() => {
    if (rows.length === 0) {
      setOpen(false);
      setSelected({});
      setEditingIndex(null);
      setDraft(null);
    }
  }, [rows.length]);

  useEffect(() => {
    if (rows.length === 0) return;
    setOpen(true);
    const next: Record<number, boolean> = {};
    for (let idx = 0; idx < rows.length; idx += 1) {
      next[idx] = true;
    }
    setSelected(next);
    setEditingIndex(null);
    setDraft(null);
    setViewMode("quick");
  }, [previewSession, rows.length]);

  const selectedIndexes = useMemo(
    () => rows.map((_, idx) => idx).filter((idx) => selected[idx]),
    [rows, selected]
  );
  const allSelected = rows.length > 0 && selectedIndexes.length === rows.length;
  const rawHeaders = useMemo(() => {
    const headers: string[] = [];
    const seen = new Set<string>();
    rawRows.forEach((row) => {
      Object.keys(row).forEach((key) => {
        if (!seen.has(key)) {
          seen.add(key);
          headers.push(key);
        }
      });
    });
    return headers;
  }, [rawRows]);

  useEffect(() => {
    const viewport = tableViewportRef.current;
    if (!viewport) return;

    const updateWidth = () => {
      setTopScrollbarWidth(viewport.scrollWidth);
    };

    const onViewportScroll = () => {
      if (!topScrollbarRef.current) return;
      topScrollbarRef.current.scrollLeft = viewport.scrollLeft;
    };

    updateWidth();
    viewport.addEventListener("scroll", onViewportScroll, { passive: true });

    const observer = new ResizeObserver(() => updateWidth());
    observer.observe(viewport);

    return () => {
      viewport.removeEventListener("scroll", onViewportScroll);
      observer.disconnect();
    };
  }, [rows.length, rawHeaders.length, viewMode, open]);

  const onTopScrollbarScroll = () => {
    if (!tableViewportRef.current || !topScrollbarRef.current) return;
    tableViewportRef.current.scrollLeft = topScrollbarRef.current.scrollLeft;
  };

  if (rows.length === 0) return null;

  const startEdit = (index: number) => {
    setEditingIndex(index);
    setDraft({ ...rows[index] });
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setDraft(null);
  };

  const saveEdit = () => {
    if (editingIndex === null || !draft) return;
    const current = rows[editingIndex];
    if (!current) return;

    const patch: Partial<UploadedPreviewRow> = {};
    if (draft.name !== current.name) patch.name = draft.name;
    if (draft.tesNo !== current.tesNo) patch.tesNo = draft.tesNo;
    if (draft.course !== current.course) patch.course = draft.course;
    if (draft.branch !== current.branch) patch.branch = draft.branch;
    if (draft.platoon !== current.platoon) patch.platoon = draft.platoon;
    if (draft.arrival !== current.arrival) patch.arrival = draft.arrival;

    if (Object.keys(patch).length > 0) {
      onUpdateRow(editingIndex, patch);
    }
    setEditingIndex(null);
    setDraft(null);
  };

  const toggleAll = (checked: boolean) => {
    const next: Record<number, boolean> = {};
    rows.forEach((_, idx) => {
      next[idx] = checked;
    });
    setSelected(next);
  };

  const toggleOne = (index: number, checked: boolean) => {
    setSelected((prev) => ({ ...prev, [index]: checked }));
  };

  const toCellValue = (value: unknown) => {
    if (value === null || value === undefined) return "";
    if (typeof value === "string") return value;
    if (typeof value === "number" || typeof value === "boolean") return String(value);
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  };

  return (
    <>
      <div className="rounded-md border border-border/50 bg-muted/30 px-3 py-3 flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm">
          <span className="font-semibold">Uploaded rows ready:</span> {rows.length}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setOpen(true)}>
            <Eye className="mr-2 h-4 w-4" />
            Review Uploaded OCs
          </Button>
          <Button variant="outline" onClick={onClear}>
            Clear preview
          </Button>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[96vw] sm:max-w-[96vw] lg:max-w-[92vw] max-h-[92vh] overflow-hidden p-0 flex flex-col">
          <DialogHeader className="px-6 pt-6 pb-2 shrink-0">
            <DialogTitle>Bulk Upload Review</DialogTitle>
            <DialogDescription>
              Review rows, edit/delete if needed, select approved rows, then upload selected.
            </DialogDescription>
          </DialogHeader>

          <div className="px-6 pb-4 space-y-3 overflow-y-auto min-h-0 flex-1">
            {(validateResult || bulkResult) && (
              <div className="rounded-md border border-border/60 bg-muted/20 p-3 text-sm space-y-2">
                {validateResult && (
                  <div className="flex gap-4">
                    <span className="text-emerald-600">Dry-run valid: {validateResult.success}</span>
                    <span className="text-destructive">Dry-run issues: {validateResult.failed}</span>
                  </div>
                )}
                {bulkResult && (
                  <div className="flex gap-4">
                    <span className="text-emerald-600">Uploaded: {bulkResult.success}</span>
                    <span className="text-destructive">Failed: {bulkResult.failed}</span>
                  </div>
                )}
              </div>
            )}

            <div className="border rounded-md overflow-hidden">
              <div className="flex items-center gap-2 border-b px-3 py-2 bg-muted/40">
                <Button
                  type="button"
                  size="sm"
                  variant={viewMode === "quick" ? "default" : "outline"}
                  onClick={() => setViewMode("quick")}
                >
                  Quick Review
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={viewMode === "raw" ? "default" : "outline"}
                  onClick={() => setViewMode("raw")}
                >
                  Full Raw Columns
                </Button>
              </div>

              <div
                ref={topScrollbarRef}
                onScroll={onTopScrollbarScroll}
                className="sticky top-0 z-20 overflow-x-auto overflow-y-hidden border-b bg-background/95 backdrop-blur"
              >
                <div style={{ width: topScrollbarWidth, height: 12 }} />
              </div>

              <div ref={tableViewportRef} className="overflow-auto max-h-[62vh]">
                {viewMode === "quick" ? (
                  <table className="min-w-max text-sm">
                    <thead className="bg-muted sticky top-0 z-10">
                      <tr className="text-left">
                        <th className="px-3 py-2 border-b">
                          <div className="flex items-center gap-2 whitespace-nowrap">
                            <input
                              type="checkbox"
                              checked={allSelected}
                              onChange={(e) => toggleAll(e.target.checked)}
                            />
                            <span>Select All</span>
                          </div>
                        </th>
                        <th className="px-3 py-2 border-b whitespace-nowrap">Name</th>
                        <th className="px-3 py-2 border-b whitespace-nowrap">TES No</th>
                        <th className="px-3 py-2 border-b whitespace-nowrap">Course</th>
                        <th className="px-3 py-2 border-b whitespace-nowrap">Branch</th>
                        <th className="px-3 py-2 border-b whitespace-nowrap">Platoon</th>
                        <th className="px-3 py-2 border-b whitespace-nowrap">Arrival</th>
                        <th className="px-3 py-2 border-b whitespace-nowrap">Verify</th>
                        <th className="px-3 py-2 border-b whitespace-nowrap">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row, idx) => {
                        const isEditing = editingIndex === idx;
                        const value = rowValidations[idx];
                        return (
                          <tr key={idx} className="border-t border-border/50 align-top">
                            <td className="px-3 py-2">
                              <input
                                type="checkbox"
                                checked={!!selected[idx]}
                                onChange={(e) => toggleOne(idx, e.target.checked)}
                              />
                            </td>
                            <td className="px-3 py-2 min-w-[220px]">
                              {isEditing ? (
                                <Input
                                  value={draft?.name ?? ""}
                                  onChange={(e) => setDraft((prev) => (prev ? { ...prev, name: e.target.value } : prev))}
                                />
                              ) : (
                                row.name
                              )}
                            </td>
                            <td className="px-3 py-2 min-w-[120px]">
                              {isEditing ? (
                                <Input
                                  value={draft?.tesNo ?? ""}
                                  onChange={(e) => setDraft((prev) => (prev ? { ...prev, tesNo: e.target.value } : prev))}
                                />
                              ) : (
                                row.tesNo
                              )}
                            </td>
                            <td className="px-3 py-2 min-w-[140px]">
                              {isEditing ? (
                                <Input
                                  value={draft?.course ?? ""}
                                  onChange={(e) => setDraft((prev) => (prev ? { ...prev, course: e.target.value } : prev))}
                                />
                              ) : (
                                row.course ?? ""
                              )}
                            </td>
                            <td className="px-3 py-2 min-w-[90px]">
                              {isEditing ? (
                                <Input
                                  value={draft?.branch ?? ""}
                                  onChange={(e) => setDraft((prev) => (prev ? { ...prev, branch: e.target.value } : prev))}
                                />
                              ) : (
                                row.branch ?? ""
                              )}
                            </td>
                            <td className="px-3 py-2 min-w-[110px]">
                              {isEditing ? (
                                <Input
                                  value={draft?.platoon ?? ""}
                                  onChange={(e) => setDraft((prev) => (prev ? { ...prev, platoon: e.target.value } : prev))}
                                />
                              ) : (
                                row.platoon ?? ""
                              )}
                            </td>
                            <td className="px-3 py-2 min-w-[130px]">
                              {isEditing ? (
                                <Input
                                  value={draft?.arrival ?? ""}
                                  onChange={(e) => setDraft((prev) => (prev ? { ...prev, arrival: e.target.value } : prev))}
                                />
                              ) : (
                                row.arrival
                              )}
                            </td>
                            <td className="px-3 py-2 min-w-[220px]">
                              <div className="flex items-center gap-2">
                                {onValidateRow && (
                                  <Button variant="outline" size="sm" onClick={() => onValidateRow(idx)}>
                                    <ShieldCheck className="mr-1 h-3 w-3" />
                                    Check
                                  </Button>
                                )}
                                {value && (
                                  <span className={`text-xs ${value === "ok" ? "text-emerald-600" : "text-destructive"}`}>
                                    {value === "ok" ? (
                                      <>
                                        <CircleCheck className="inline h-3 w-3 mr-1" />
                                        OK
                                      </>
                                    ) : (
                                      value
                                    )}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-3 py-2 min-w-[220px]">
                              <div className="flex items-center gap-2">
                                {isEditing ? (
                                  <>
                                    <Button size="sm" onClick={saveEdit}>Save</Button>
                                    <Button size="sm" variant="outline" onClick={cancelEdit}>Cancel</Button>
                                  </>
                                ) : (
                                  <>
                                    <Button size="sm" variant="outline" onClick={() => startEdit(idx)}>
                                      <Pencil className="mr-1 h-3 w-3" />
                                      Edit
                                    </Button>
                                    <Button size="sm" variant="destructive" onClick={() => onDeleteRow(idx)}>
                                      <Trash2 className="mr-1 h-3 w-3" />
                                      Delete
                                    </Button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <table className="min-w-max text-sm">
                    <thead className="bg-muted sticky top-0 z-10">
                      <tr className="text-left">
                        <th className="px-3 py-2 border-b">Select</th>
                        <th className="px-3 py-2 border-b">Row</th>
                        {rawHeaders.map((header) => (
                          <th key={header} className="px-3 py-2 border-b whitespace-nowrap">{header}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rawRows.map((rawRow, idx) => (
                        <tr key={idx} className="border-t border-border/50 align-top">
                          <td className="px-3 py-2">
                            <input
                              type="checkbox"
                              checked={!!selected[idx]}
                              onChange={(e) => toggleOne(idx, e.target.checked)}
                            />
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">{idx + 1}</td>
                          {rawHeaders.map((header) => (
                            <td key={`${idx}-${header}`} className="px-3 py-2 whitespace-nowrap">
                              {toCellValue((rawRow as Record<string, unknown>)[header])}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="px-6 py-4 border-t shrink-0 bg-background flex items-center justify-between">
            <div className="text-sm text-muted-foreground mr-auto">
              Selected: {selectedIndexes.length} / {rows.length}
            </div>
            <div className="flex items-center gap-2">
              {onValidateAll && (
                <Button variant="outline" onClick={onValidateAll}>
                  <ShieldCheck className="mr-2 h-4 w-4" />
                  Validate (dry-run)
                </Button>
              )}
              <Button onClick={() => onBulkUploadSelected(selectedIndexes)} disabled={bulkUploading || selectedIndexes.length === 0}>
                <UploadCloud className="mr-2 h-4 w-4" />
                {bulkUploading ? "Uploading…" : "Upload Selected OCs"}
              </Button>
              <Button variant="outline" onClick={onClear}>
                <CheckSquare className="mr-2 h-4 w-4" />
                Clear All
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

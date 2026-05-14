"use client";
import React, { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { PageHeader } from "@/components/layout/PageHeader";
import BreadcrumbNav from "@/components/layout/BreadcrumbNav";
import GlobalTabs from "@/components/Tabs/GlobalTabs";
import { TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import UploadButton, { type RawRow, type UploadedPreviewRow } from "@/components/oc/UploadButton";
import UploadPreviewTable from "@/components/oc/UploadPreviewTable";
import OCsTable from "@/components/oc/OCsTable";
import OCDetailsModal from "@/components/oc/OCDetailsModal";

import { ocTabs } from "@/config/app.config";
import { getAllCourses } from "@/app/lib/api/courseApi";
import { getPlatoons } from "@/app/lib/api/platoonApi";

import { useDebouncedValue } from "@/app/lib/debounce";

import { useOCUpload } from "@/hooks/useOCUpload";

import { deleteOC, fetchOCByIdFull, updateOC } from "@/app/lib/api/ocApi";
import type { FullOCRecord, OCListRow, OCRecord } from "@/app/lib/api/ocApi";
import {
  archiveOCsSequentially,
  buildBulkArchiveSummary,
  type BulkArchiveFailure,
} from "@/app/lib/oc/bulk-archive";
import { buildOCBulkUploadToast } from "@/app/lib/oc/bulk-upload-result";
import { useOCs } from "@/hooks/useOCs";
import OCFilters from "@/components/genmgmt/OCFilters";
import { OCForm } from "@/components/genmgmt/OCForm";
import { useQuery } from "@tanstack/react-query";
import { SetupReturnBanner } from "@/components/setup/SetupReturnBanner";
import SearchableSelect from "@/components/ui/searchable-select";

type CourseLike = { id: string; code?: string; title?: string };
type PlatoonLike = { id: string; key?: string; name?: string };
const ALLOWED_BRANCHES = ["O", "E", "M"] as const;
const ALLOWED_STATUS = ["ACTIVE", "DELEGATED", "WITHDRAWN", "PASSED_OUT"] as const;

export default function OCManagementPage() {
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  const [search, setSearch] = useState<string>("");
  const [courseFilter, setCourseFilter] = useState<string>("");
  const [platoonFilter, setPlatoonFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [branchFilter, setBranchFilter] = useState<string>("");

  const debouncedSearch = useDebouncedValue(search, 350);

  type BranchType = (typeof ALLOWED_BRANCHES)[number];

  const safeBranch = useMemo((): BranchType | undefined => {
    if (!branchFilter) return undefined;
    return ALLOWED_BRANCHES.includes(branchFilter as BranchType)
      ? (branchFilter as BranchType)
      : undefined;
  }, [branchFilter]);

  type StatusType = (typeof ALLOWED_STATUS)[number];

  const safeStatus = useMemo((): StatusType | undefined => {
    if (!statusFilter) return undefined;
    return ALLOWED_STATUS.includes(statusFilter as StatusType)
      ? (statusFilter as StatusType)
      : undefined;
  }, [statusFilter]);

  // Build params - backend will ignore most filters, we'll filter client-side
  const params = useMemo(() => {
    return {
      q: debouncedSearch || undefined,
      courseId: courseFilter || undefined,
      platoonId: platoonFilter || undefined,
      branch: safeBranch,
      status: safeStatus,
      sort: "updated_desc" as const,
      // Backend handles list controls; the remaining filters are applied client-side.
      limit: 1000, // Fetch more records so we have enough to filter client-side
      offset: 0,   // Always fetch from start for client-side filtering
    };
  }, [debouncedSearch, courseFilter, platoonFilter, safeBranch, safeStatus]);

  // Use React Query hook - it will filter client-side
  const { ocList, totalCount, loading, addOC, editOC, removeOC, refreshOCs } = useOCs(params);

  // Client-side pagination (after filters are applied)
  const paginatedList = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return ocList.slice(startIndex, endIndex);
  }, [ocList, currentPage, pageSize]);


  const {
    parsing,
    setParsing,
    uploadedRawRows,
    uploadedPreview,
    previewSession,
    onParsed,
    bulkUploading,
    bulkResult,
    validateResult,
    rowValidations,
    doBulkUploadSelected,
    doValidateAll,
    doValidateRow,
    updateUploadedRow,
    updateUploadedRawRow,
    deleteUploadedRow,
    clear: clearUpload,
  } = useOCUpload();

  // Courses
  const { data: courses = [] } = useQuery<CourseLike[]>({
    queryKey: ["courses"],
    queryFn: async () => {
      const c = await getAllCourses();
      return c?.items ?? [];
    },
  });

  // Platoons
  const { data: platoons = [] } = useQuery<PlatoonLike[]>({
    queryKey: ["platoons"],
    queryFn: async () => {
      const p = await getPlatoons();
      return p ?? [];
    },
  });

  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingOC, setEditingOC] = useState<Partial<FullOCRecord> | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<boolean>(false);
  const [deleteTarget, setDeleteTarget] = useState<OCListRow | null>(null);
  const [deleteNameInput, setDeleteNameInput] = useState<string>("");
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [selectedOcIds, setSelectedOcIds] = useState<Set<string>>(new Set());
  const [bulkPlatoonId, setBulkPlatoonId] = useState<string>("");
  const [bulkAssigning, setBulkAssigning] = useState<boolean>(false);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState<boolean>(false);
  const [bulkDeleteConfirmInput, setBulkDeleteConfirmInput] = useState<string>("");
  const [bulkDeleting, setBulkDeleting] = useState<boolean>(false);
  const [bulkDeleteFailures, setBulkDeleteFailures] = useState<BulkArchiveFailure[]>([]);

  const { reset } = useForm<Partial<OCRecord>>();

  const [viewOpen, setViewOpen] = useState<boolean>(false);
  const [viewId, setViewId] = useState<string | null>(null);

  const onSubmit = async (data: Partial<OCRecord>): Promise<void> => {
    try {
      if (editingIndex !== null) {
        const id = editingOC?.id ?? paginatedList[editingIndex]?.id;
        if (!id) throw new Error("Selected OC was not found.");
        await editOC(id, data);
      } else {
        await addOC(data as Omit<OCRecord, "id" | "uid" | "createdAt">);
        setCurrentPage(1);
      }

      setIsDialogOpen(false);
      reset();
      setEditingIndex(null);
      setEditingOC(null);
    } catch (error: any) {

      if (error.status === 400 && error.issues?.fieldErrors) {
        const fieldErrors = error.issues.fieldErrors;
        const errorMessages = Object.entries(fieldErrors)
          .map(([field, messages]: [string, any]) => `${field}: ${messages[0]}`)
          .join(", ");

        toast.error(`Validation failed: ${errorMessages}`);
      } else if (error.message) {
        toast.error(error.message);
      } else {
        toast.error("Failed to save OC. Please try again.");
      }

      throw error;
    }
  };

  const handleEdit = async (index: number) => {
    const target = paginatedList[index];
    if (!target?.id) {
      toast.error("OC not found.");
      return;
    }
    try {
      const fullRecord = await fetchOCByIdFull(target.id);
      setEditingOC(fullRecord ?? target);
    } catch (error: any) {
      toast.error(error?.message || "Failed to load complete OC details.");
      setEditingOC(target);
    } finally {
      setEditingIndex(index);
      setIsDialogOpen(true);
    }
  };

  const closeDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setDeleteTarget(null);
    setDeleteNameInput("");
    setIsDeleting(false);
  };

  const handleDelete = (id: string) => {
    const target = ocList.find((oc) => oc.id === id);
    if (!target) {
      toast.error("OC not found.");
      return;
    }
    setDeleteTarget(target);
    setDeleteNameInput("");
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget?.id) return;
    const expectedName = (deleteTarget.name ?? "").trim();
    const enteredName = deleteNameInput.trim();
    if (!expectedName || enteredName !== expectedName) return;

    try {
      setIsDeleting(true);
      await removeOC(deleteTarget.id);
      closeDeleteDialog();
    } catch {
      setIsDeleting(false);
    }
  };

  const handleAdd = () => {
    setEditingIndex(null);
    setEditingOC(null);
    reset();
    setIsDialogOpen(true);
  };

  const handleBulkUpload = async (selectedIndexes: number[]) => {
    const result = await doBulkUploadSelected(selectedIndexes, async (uploadResult) => {
      if (uploadResult.success > 0) {
        setCurrentPage(1);
        await refreshOCs();
      }
    });

    const toastConfig = buildOCBulkUploadToast(result);
    if (!toastConfig) return;

    if (toastConfig.variant === "success") {
      toast.success(toastConfig.message);
    } else {
      toast.error(toastConfig.message);
    }
  };

  const openView = (id: string) => {
    setViewId(id);
    setViewOpen(true);
  };

  const handleViewOpenChange = (nextOpen: boolean) => {
    setViewOpen(nextOpen);
    if (!nextOpen) {
      setViewId(null);
    }
  };

  const handleFilterChange = (filterSetter: (val: string) => void, value: string) => {
    filterSetter(value);
    setSelectedOcIds(new Set());
    setCurrentPage(1); // Reset to page 1 when filter changes
  };

  const selectedCount = selectedOcIds.size;
  const selectedRows = useMemo(
    () => ocList.filter((oc) => oc.id && selectedOcIds.has(oc.id)),
    [ocList, selectedOcIds],
  );

  const toggleSelectedOc = (id: string, checked: boolean) => {
    setSelectedOcIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const togglePageSelected = (checked: boolean) => {
    setSelectedOcIds((prev) => {
      const next = new Set(prev);
      for (const oc of paginatedList) {
        if (!oc.id) continue;
        if (checked) next.add(oc.id);
        else next.delete(oc.id);
      }
      return next;
    });
  };

  const selectAllFiltered = () => {
    setSelectedOcIds(new Set(ocList.map((oc) => oc.id).filter(Boolean)));
  };

  const clearSelection = () => {
    setSelectedOcIds(new Set());
    setBulkPlatoonId("");
    setBulkDeleteConfirmInput("");
    setBulkDeleteFailures([]);
  };

  const handleBulkPlatoonAssign = async () => {
    if (selectedCount === 0) {
      toast.error("Select at least one OC.");
      return;
    }

    try {
      setBulkAssigning(true);
      const ids = Array.from(selectedOcIds);
      for (const id of ids) {
        await updateOC(id, { platoonId: bulkPlatoonId || null });
      }
      await refreshOCs();
      toast.success(`Updated platoon for ${ids.length} OC${ids.length === 1 ? "" : "s"}.`);
      clearSelection();
    } catch (error: any) {
      toast.error(error?.message || "Failed to update selected OCs.");
    } finally {
      setBulkAssigning(false);
    }
  };

  const openBulkDeleteDialog = () => {
    if (selectedCount === 0) {
      toast.error("Select at least one OC to delete.");
      return;
    }

    setBulkDeleteConfirmInput("");
    setBulkDeleteFailures([]);
    setBulkDeleteDialogOpen(true);
  };

  const closeBulkDeleteDialog = () => {
    if (bulkDeleting) return;
    setBulkDeleteDialogOpen(false);
    setBulkDeleteConfirmInput("");
    setBulkDeleteFailures([]);
  };

  const handleConfirmBulkDelete = async () => {
    if (bulkDeleteConfirmInput.trim().toUpperCase() !== "DELETE") return;

    if (selectedRows.length === 0) {
      toast.error("Selected OCs are no longer visible. Refresh the list and try again.");
      return;
    }

    try {
      setBulkDeleting(true);
      const result = await archiveOCsSequentially(selectedRows, deleteOC);
      await refreshOCs();

      setSelectedOcIds((prev) => {
        const next = new Set(prev);
        for (const id of result.archivedIds) {
          next.delete(id);
        }
        return next;
      });
      setBulkDeleteFailures(result.failed);

      const message = buildBulkArchiveSummary(result);
      if (result.failed.length === 0) {
        toast.success(message);
        setBulkDeleteDialogOpen(false);
        setBulkDeleteConfirmInput("");
      } else {
        toast.error(`${message} Review the failed rows below.`);
      }
    } finally {
      setBulkDeleting(false);
    }
  };

  return (
    <SidebarProvider>
      <section className="min-h-screen flex w-full bg-background">
        <aside>
          <AppSidebar />
        </aside>

        <main className="flex-1 flex flex-col">
          <header className="h-16 border-b border-border bg-card/50 backdrop-blur sticky top-0 z-50">
            <PageHeader
              title="OC Management"
              description="Manage all OC details across platoons and terms"
            />
          </header>

          <section className="flex-1 p-6">
            <nav>
              <BreadcrumbNav
                paths={[
                  { label: "Dashboard", href: "/dashboard" },
                  { label: "Admin Mgmt", href: "/dashboard/genmgmt" },
                  { label: "OC Management" },
                ]}
              />
            </nav>

            <SetupReturnBanner
              title="Setup step: Officer Cadets"
              description="Create the initial OC records here, then return to the setup checklist."
            />

            <GlobalTabs tabs={ocTabs} defaultValue="oc-mgmt">
              <TabsContent value="oc-mgmt" className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-foreground">OCs</h2>

                  <div className="flex gap-2">
                    <Button className="bg-success cursor-pointer" onClick={handleAdd}>
                      Add OC
                    </Button>

                    <UploadButton
                      disabled={parsing}
                      onParsed={(raw: RawRow[], preview: UploadedPreviewRow[]) => {
                        setParsing(false);
                        onParsed(raw, preview);
                      }}
                      onParsingStateChange={setParsing}
                      label={parsing ? "Parsing…" : "Upload CSV / Excel"}
                      courseOptions={courses}
                      platoonOptions={platoons}
                    />
                  </div>
                </div>

                <OCFilters
                  search={search}
                  onSearch={(val) => handleFilterChange(setSearch, val)}
                  courseFilter={courseFilter}
                  onCourseChange={(val) => handleFilterChange(setCourseFilter, val)}
                  courses={courses}
                  platoonFilter={platoonFilter}
                  onPlatoonChange={(val) => handleFilterChange(setPlatoonFilter, val)}
                  platoons={platoons}
                  branchFilter={branchFilter}
                  onBranchChange={(val) => handleFilterChange(setBranchFilter, val)}
                  statusFilter={statusFilter}
                  onStatusChange={(val) => handleFilterChange(setStatusFilter, val)}
                />

                <UploadPreviewTable
                  rows={uploadedPreview}
                  rawRows={uploadedRawRows}
                  previewSession={previewSession}
                  bulkUploading={bulkUploading}
                  bulkResult={bulkResult}
                  onBulkUploadSelected={handleBulkUpload}
                  onClear={() => {
                    clearUpload();
                  }}
                  onUpdateRow={updateUploadedRow}
                  onUpdateRawRow={updateUploadedRawRow}
                  onDeleteRow={deleteUploadedRow}
                  onValidateAll={doValidateAll}
                  validateResult={validateResult}
                  onValidateRow={doValidateRow}
                  rowValidations={rowValidations}
                />

                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="font-semibold text-lg">
                      All OCs
                      {totalCount > 0 && (
                        <span className="text-muted-foreground text-sm ml-2">
                          ({paginatedList.length} showing, {totalCount} total after filters)
                        </span>
                      )}
                    </h3>

                    {/* Active filters display */}
                    {(platoonFilter || branchFilter || courseFilter || statusFilter || search) && (
                      <div className="text-xs text-muted-foreground flex gap-2 items-center">
                        <span>Active filters:</span>
                        {search && <span className="bg-primary/10 px-2 py-1 rounded">Search: {search}</span>}
                        {courseFilter && <span className="bg-primary/10 px-2 py-1 rounded">Course</span>}
                        {platoonFilter && <span className="bg-primary/10 px-2 py-1 rounded">Platoon</span>}
                        {branchFilter && <span className="bg-primary/10 px-2 py-1 rounded">Branch: {branchFilter}</span>}
                        {statusFilter && <span className="bg-primary/10 px-2 py-1 rounded">Status: {statusFilter}</span>}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSearch("");
                            setCourseFilter("");
                            setPlatoonFilter("");
                            setBranchFilter("");
                            setStatusFilter("");
                            setCurrentPage(1);
                          }}
                        >
                          Clear all
                        </Button>
                      </div>
                    )}
                  </div>

                  <OCsTable
                    ocList={paginatedList}
                    onView={openView}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    selectedIds={selectedOcIds}
                    onToggleSelected={toggleSelectedOc}
                    onTogglePageSelected={togglePageSelected}
                    pagination={{
                      mode: "server", // Actually client-side now, but keeps the same interface
                      currentPage,
                      pageSize,
                      totalCount, // This is the filtered count
                      onPageChange: (page, newPageSize) => {
                        setCurrentPage(page);
                        if (newPageSize !== pageSize) {
                          setPageSize(newPageSize);
                          setCurrentPage(1);
                        }
                      },
                    }}
                    loading={loading}
                  />

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-md border bg-card p-3">
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="font-medium">{selectedCount} selected</span>
                      <Button type="button" variant="outline" size="sm" onClick={() => togglePageSelected(true)}>
                        Select Page
                      </Button>
                      <Button type="button" variant="outline" size="sm" onClick={selectAllFiltered} disabled={ocList.length === 0}>
                        Select All Filtered ({ocList.length})
                      </Button>
                      <Button type="button" variant="ghost" size="sm" onClick={clearSelection} disabled={selectedCount === 0}>
                        Clear
                      </Button>
                    </div>
                    <div className="flex min-w-[320px] flex-1 items-center justify-end gap-2">
                      <div className="w-full max-w-xs">
                        <SearchableSelect
                          value={bulkPlatoonId}
                          onValueChange={setBulkPlatoonId}
                          options={platoons.map(({ id, key, name }) => ({
                            value: id,
                            label: key && name ? `${key} - ${name}` : name ?? key ?? id,
                          }))}
                          placeholder="Select platoon"
                          searchPlaceholder="Search platoon..."
                          allOptionLabel="No Platoon"
                          emptyLabel="No platoon found"
                          disabled={bulkAssigning}
                        />
                      </div>
                      <Button
                        type="button"
                        onClick={handleBulkPlatoonAssign}
                        disabled={bulkAssigning || selectedCount === 0}
                      >
                        {bulkAssigning ? "Assigning..." : "Assign Platoon"}
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        onClick={openBulkDeleteDialog}
                        disabled={bulkDeleting || selectedCount === 0}
                      >
                        Delete Selected
                      </Button>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </GlobalTabs>
          </section>
        </main>
      </section>

      <Dialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            reset();
            setEditingIndex(null);
            setEditingOC(null);
          }
        }}
      >
        <OCForm
          key={
            editingIndex !== null && editingOC?.id
              ? `${editingOC.id}-${editingOC.personal ? "full" : "basic"}`
              : "new"
          }
          defaultValues={editingIndex !== null ? editingOC ?? {} : {}}
          courses={courses}
          platoons={platoons}
          isEditing={editingIndex !== null}
          onCancel={() => {
            setIsDialogOpen(false);
            reset();
            setEditingIndex(null);
            setEditingOC(null);
          }}
          onSubmit={onSubmit}
        />
      </Dialog>

      <Dialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          if (!open) closeDeleteDialog();
          else setDeleteDialogOpen(true);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm OC Deletion</DialogTitle>
            <DialogDescription>
              This uses the existing OC delete policy. The OC is archived from active lists,
              while dossier and related records are kept. Type the OC name exactly to enable delete.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-sm">
            <div className="rounded-md border p-3 bg-muted/20 space-y-1">
              <p><span className="font-medium">Name:</span> {deleteTarget?.name ?? "-"}</p>
              <p><span className="font-medium">TES No:</span> {deleteTarget?.ocNo ?? "-"}</p>
              <p>
                <span className="font-medium">Course:</span>{" "}
                {deleteTarget?.courseCode ?? deleteTarget?.courseTitle ?? deleteTarget?.course?.title ?? "-"}
              </p>
            </div>

            <div className="space-y-1">
              <label htmlFor="confirm-oc-name" className="font-medium">
                Enter OC Name to Confirm
              </label>
              <input
                id="confirm-oc-name"
                type="text"
                value={deleteNameInput}
                onChange={(e) => setDeleteNameInput(e.target.value)}
                placeholder={deleteTarget?.name ?? "Type name"}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                autoComplete="off"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeDeleteDialog} disabled={isDeleting}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={
                isDeleting ||
                !deleteTarget?.name ||
                deleteNameInput.trim() !== deleteTarget.name.trim()
              }
            >
              {isDeleting ? "Deleting..." : "Delete OC"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={bulkDeleteDialogOpen}
        onOpenChange={(open) => {
          if (!open) closeBulkDeleteDialog();
          else setBulkDeleteDialogOpen(true);
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Confirm Bulk OC Deletion</DialogTitle>
            <DialogDescription>
              This uses the existing OC delete policy. Selected OCs are archived from active
              lists; dossier and related records are not hard-deleted.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 text-sm">
            <div className="rounded-md border bg-muted/20 p-3">
              <p className="font-medium">
                {selectedRows.length} selected OC{selectedRows.length === 1 ? "" : "s"}
              </p>
              <div className="mt-2 max-h-40 overflow-y-auto rounded border bg-background">
                {selectedRows.slice(0, 25).map((oc) => (
                  <div key={oc.id} className="flex items-center justify-between gap-3 border-b px-3 py-2 last:border-b-0">
                    <span className="font-medium">{oc.name ?? "Unnamed OC"}</span>
                    <span className="text-muted-foreground">{oc.ocNo ?? "-"}</span>
                  </div>
                ))}
                {selectedRows.length > 25 && (
                  <div className="px-3 py-2 text-muted-foreground">
                    +{selectedRows.length - 25} more selected OCs
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-1">
              <label htmlFor="confirm-bulk-delete" className="font-medium">
                Type DELETE to confirm
              </label>
              <input
                id="confirm-bulk-delete"
                type="text"
                value={bulkDeleteConfirmInput}
                onChange={(event) => setBulkDeleteConfirmInput(event.target.value)}
                placeholder="DELETE"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                autoComplete="off"
              />
            </div>

            {bulkDeleteFailures.length > 0 && (
              <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3">
                <p className="font-medium text-destructive">
                  {bulkDeleteFailures.length} OC{bulkDeleteFailures.length === 1 ? "" : "s"} could not be deleted
                </p>
                <ul className="mt-2 max-h-40 space-y-2 overflow-y-auto">
                  {bulkDeleteFailures.map((failure) => (
                    <li key={failure.id}>
                      <span className="font-medium">{failure.label}:</span>{" "}
                      <span>{failure.message}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeBulkDeleteDialog} disabled={bulkDeleting}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmBulkDelete}
              disabled={
                bulkDeleting ||
                selectedRows.length === 0 ||
                bulkDeleteConfirmInput.trim().toUpperCase() !== "DELETE"
              }
            >
              {bulkDeleting ? "Deleting..." : `Delete ${selectedRows.length} OC${selectedRows.length === 1 ? "" : "s"}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <OCDetailsModal open={viewOpen} ocId={viewId} onOpenChange={handleViewOpenChange} />
    </SidebarProvider>
  );
}

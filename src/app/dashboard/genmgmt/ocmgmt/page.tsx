"use client";
import React, { useMemo, useState, useEffect } from "react";
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

import type { OCListRow, OCRecord } from "@/app/lib/api/ocApi";
import { useOCs } from "@/hooks/useOCs";
import OCFilters from "@/components/genmgmt/OCFilters";
import { OCForm } from "@/components/genmgmt/OCForm";
import { useQuery } from "@tanstack/react-query";

type CourseLike = { id: string; code?: string; title?: string };
type PlatoonLike = { id: string; name?: string };

export default function OCManagementPage() {
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  const [search, setSearch] = useState<string>("");
  const [courseFilter, setCourseFilter] = useState<string>("");
  const [platoonFilter, setPlatoonFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [branchFilter, setBranchFilter] = useState<string>("");

  const debouncedSearch = useDebouncedValue(search, 350);

  type BranchType = "O" | "E" | "M";
  const allowedBranches = useMemo(() => ["O", "E", "M"] as const, []);

  const safeBranch = useMemo((): BranchType | undefined => {
    if (!branchFilter) return undefined;
    return allowedBranches.includes(branchFilter as BranchType)
      ? (branchFilter as BranchType)
      : undefined;
  }, [branchFilter, allowedBranches]);

  type StatusType = "ACTIVE" | "DELEGATED" | "WITHDRAWN" | "PASSED_OUT";
  const allowedStatus: StatusType[] = ["ACTIVE", "DELEGATED", "WITHDRAWN", "PASSED_OUT"];

  const safeStatus = useMemo((): StatusType | undefined => {
    if (!statusFilter) return undefined;
    return allowedStatus.includes(statusFilter as StatusType)
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
      // Backend only respects limit/offset, but we pass everything for client-side filtering
      limit: 1000, // Fetch more records so we have enough to filter client-side
      offset: 0,   // Always fetch from start for client-side filtering
    };
  }, [debouncedSearch, courseFilter, platoonFilter, safeBranch, safeStatus]);

  // Use React Query hook - it will filter client-side
  const { ocList, totalCount, loading, addOC, editOC, removeOC } = useOCs(params);

  // Client-side pagination (after filters are applied)
  const paginatedList = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return ocList.slice(startIndex, endIndex);
  }, [ocList, currentPage, pageSize]);


  const {
    parsing,
    setParsing,
    uploadedPreview,
    onParsed,
    bulkUploading,
    bulkResult,
    validateResult,
    rowValidations,
    doBulkUpload,
    doValidateAll,
    doValidateRow,
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
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<boolean>(false);
  const [deleteTarget, setDeleteTarget] = useState<OCListRow | null>(null);
  const [deleteNameInput, setDeleteNameInput] = useState<string>("");
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const { reset } = useForm<Partial<OCRecord>>();

  const [viewOpen, setViewOpen] = useState<boolean>(false);
  const [viewId, setViewId] = useState<string | null>(null);

  const onSubmit = async (data: Partial<OCRecord>): Promise<void> => {
    try {
      if (editingIndex !== null) {
        const { id } = paginatedList[editingIndex];
        await editOC(id, data);
      } else {
        await addOC(data as Omit<OCRecord, "id" | "uid" | "createdAt">);
      }

      setIsDialogOpen(false);
      reset();
      setEditingIndex(null);
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

  const handleEdit = (index: number) => {
    setEditingIndex(index);
    setIsDialogOpen(true);
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
    } catch (error: any) {
      setIsDeleting(false);
    }
  };

  const handleAdd = () => {
    setEditingIndex(null);
    reset();
    setIsDialogOpen(true);
  };

  const handleBulkUpload = async () => {
    await doBulkUpload(async () => {
      toast.success("Bulk upload completed successfully");
    });
  };

  const openView = (id: string) => {
    setViewId(id);
    setViewOpen(true);
  };

  const handleFilterChange = (filterSetter: (val: string) => void, value: string) => {
    filterSetter(value);
    setCurrentPage(1); // Reset to page 1 when filter changes
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
                  { label: "Gen Mgmt", href: "/dashboard/genmgmt" },
                  { label: "OC Management" },
                ]}
              />
            </nav>

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
                  bulkUploading={bulkUploading}
                  bulkResult={bulkResult}
                  onBulkUpload={handleBulkUpload}
                  onClear={() => {
                    clearUpload();
                  }}
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
                </div>
              </TabsContent>
            </GlobalTabs>
          </section>
        </main>
      </section>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <OCForm
          key={editingIndex !== null && paginatedList[editingIndex] ? paginatedList[editingIndex].id : "new"}
          defaultValues={editingIndex !== null && paginatedList[editingIndex] ? paginatedList[editingIndex] : {}}
          courses={courses}
          platoons={platoons}
          isEditing={editingIndex !== null}
          onCancel={() => {
            setIsDialogOpen(false);
            reset();
            setEditingIndex(null);
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
              This action cannot be undone. Type the OC name exactly to enable delete.
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

      <OCDetailsModal open={viewOpen} ocId={viewId} onOpenChange={setViewOpen} />
    </SidebarProvider>
  );
}

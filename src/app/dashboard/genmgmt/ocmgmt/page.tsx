"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";

import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { PageHeader } from "@/components/layout/PageHeader";
import BreadcrumbNav from "@/components/layout/BreadcrumbNav";
import GlobalTabs from "@/components/Tabs/GlobalTabs";
import { TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import UploadButton, { type RawRow, type UploadedPreviewRow } from "@/components/oc/UploadButton";
import UploadPreviewTable from "@/components/oc/UploadPreviewTable";
import OCsTable from "@/components/oc/OCsTable";
import OCDetailsModal from "@/components/oc/OCDetailsModal";

import { ocTabs } from "@/config/app.config";
import { getAllCourses } from "@/app/lib/api/courseApi";
import { getPlatoons } from "@/app/lib/api/platoonApi";

import { useDebouncedValue } from "@/app/lib/debounce";

import { useOCUpload } from "@/hooks/useOCUpload";

import type { OCRecord } from "@/app/lib/api/ocApi";
import { useOCs } from "@/hooks/useOCs";
import OCFilters from "@/components/genmgmt/OCFilters";
import { OCForm } from "@/components/genmgmt/OCForm";

type CourseLike = { id: string; code?: string; title?: string };
type PlatoonLike = { id: string; name?: string };

export default function OCManagementPage() {
  // hooks
  const { ocList, totalCount, loading, fetchOCs, addOC, editOC, removeOC, setOcList } = useOCs();
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

  // lookups
  const [courses, setCourses] = useState<CourseLike[]>([]);
  const [platoons, setPlatoons] = useState<PlatoonLike[]>([]);

  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  const [search, setSearch] = useState<string>("");
  const [courseFilter, setCourseFilter] = useState<string>("");
  const [platoonFilter, setPlatoonFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [branchFilter, setBranchFilter] = useState<string>("");

  const debouncedSearch = useDebouncedValue(search, 350);

  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const { register, handleSubmit, reset, setValue } = useForm<Partial<OCRecord>>();

  const [viewOpen, setViewOpen] = useState<boolean>(false);
  const [viewId, setViewId] = useState<string | null>(null);

  type BranchType = "O" | "E" | "M";

  const allowedBranches = useMemo(() => ["O", "E", "M"] as const, []);
  const safeBranch = ((): BranchType | undefined => {
    return (allowedBranches.includes(branchFilter as BranchType) ? (branchFilter as BranchType) : undefined);
  })();

  type StatusType = "ACTIVE" | "DELEGATED" | "WITHDRAWN" | "PASSED_OUT";

  const allowedStatus: StatusType[] = ["ACTIVE", "DELEGATED", "WITHDRAWN", "PASSED_OUT"];
  const safeStatus = allowedStatus.includes(statusFilter as StatusType)
    ? (statusFilter as StatusType)
    : undefined;

  useEffect(() => {
    (async () => {
      const [c, p] = await Promise.all([getAllCourses(), getPlatoons()]);
      setCourses(c?.items ?? []);
      setPlatoons(p ?? []);
    })().catch(console.error);
  }, []);

  // fetch table when filters change
  useEffect(() => {
    (async () => {
      await fetchOCs({
        q: debouncedSearch || undefined,
        courseId: courseFilter || undefined,
        platoonId: platoonFilter || undefined,
        status: safeStatus,
        branch: safeBranch,
        active: statusFilter === "ACTIVE" ? true : undefined,
        limit: pageSize,
        offset: (currentPage - 1) * pageSize,
      });
    })().catch((e) => console.error("fetch failed", e));
  }, [debouncedSearch, courseFilter, platoonFilter, statusFilter, branchFilter, currentPage, pageSize, fetchOCs, safeBranch]);

  // form submit (add / edit)
  const onSubmit: SubmitHandler<Partial<OCRecord>> = async (data) => {
    try {
      if (editingIndex !== null) {
        const { id } = ocList[editingIndex];
        await editOC(id, data);
      } else {
        await addOC(data as Omit<OCRecord, "id" | "uid" | "createdAt">);
      }
      reset();
      setIsDialogOpen(false);
      setEditingIndex(null);
    } catch (e) {
      console.error("save failed", e);
    }
  };

  // open edit dialog
  const handleEdit = (index: number) => {
    const oc = ocList[index];
    setEditingIndex(index);

    setValue("name", oc.name ?? "");
    setValue("ocNo", oc.ocNo ?? "");
    setValue("courseId", oc.courseId ?? "");
    setValue("branch", oc.branch ?? undefined);
    setValue("platoonId", oc.platoonId ?? "");
    setValue("arrivalAtUniversity", oc.arrivalAtUniversity?.slice(0, 10) ?? "");

    setIsDialogOpen(true);
  };

  // delete
  const handleDelete = async (id: string) => {
    await removeOC(id);
    fetchOCs({
      q: debouncedSearch || undefined,
      courseId: courseFilter || undefined,
      platoonId: platoonFilter || undefined,
      status: safeStatus,
      branch: safeBranch,
      limit: pageSize,
      offset: (currentPage - 1) * pageSize,
    }).catch(console.error);
  };

  const handleAdd = () => {
    setEditingIndex(null);
    reset();
    setIsDialogOpen(true);
  };

  // upload bulk - pass a callback to re-fetch page on success
  const handleBulkUpload = async () => {
    await doBulkUpload(async () => {
      await fetchOCs({
        q: debouncedSearch || undefined,
        limit: pageSize,
        offset: (currentPage - 1) * pageSize,
      });
    });
  };

  const openView = (id: string) => {
    setViewId(id);
    setViewOpen(true);
  };

  return (
    <SidebarProvider>
      <section className="min-h-screen flex w-full bg-background">
        <aside>
          <AppSidebar />
        </aside>

        <main className="flex-1 flex flex-col">
          <header className="h-16 border-b border-border bg-card/50 backdrop-blur sticky top-0 z-50">
            <PageHeader title="OC Management" description="Manage all OC details across platoons and terms" />
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
                    <Button className="bg-[#40ba4d] cursor-pointer" onClick={handleAdd}>
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
                  onSearch={(val) => {
                    setSearch(val);
                    setCurrentPage(1);
                  }}
                  courseFilter={courseFilter}
                  onCourseChange={(val) => {
                    setCourseFilter(val);
                    setCurrentPage(1);
                  }}
                  courses={courses}
                  platoonFilter={platoonFilter}
                  onPlatoonChange={(val) => {
                    setPlatoonFilter(val);
                    setCurrentPage(1);
                  }}
                  platoons={platoons}
                  branchFilter={branchFilter}
                  onBranchChange={(val) => {
                    setBranchFilter(val);
                    setCurrentPage(1);
                  }}
                  statusFilter={statusFilter}
                  onStatusChange={(val) => {
                    setStatusFilter(val);
                    setCurrentPage(1);
                  }}
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
                    <h3 className="font-semibold text-lg">All OCs</h3>
                  </div>

                  <OCsTable
                    ocList={ocList}
                    onView={openView}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    pagination={{
                      mode: "server",
                      currentPage,
                      pageSize,
                      totalCount,
                      onPageChange: (page, newPageSize) => {
                        setCurrentPage(page);
                        if (newPageSize !== pageSize) setPageSize(newPageSize);
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

      {/* Add / Edit dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <OCForm
          defaultValues={{}}
          courses={courses}
          platoons={platoons}
          isEditing={editingIndex !== null}
          onCancel={() => {
            setIsDialogOpen(false);
            reset();
          }}
          onSubmit={onSubmit}
        />
      </Dialog>

      <OCDetailsModal open={viewOpen} ocId={viewId} onOpenChange={setViewOpen} />
    </SidebarProvider>
  );
}
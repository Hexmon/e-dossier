"use client";

import { useCallback, useEffect, useState } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";

import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { PageHeader } from "@/components/layout/PageHeader";
import BreadcrumbNav from "@/components/layout/BreadcrumbNav";
import GlobalTabs from "@/components/Tabs/GlobalTabs";
import { TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import UploadButton, { type RawRow, type UploadedPreviewRow } from "@/components/oc/UploadButton";
import UploadPreviewTable from "@/components/oc/UploadPreviewTable";
import OCsTable from "@/components/oc/OCsTable";
import OCDetailsModal from "@/components/oc/OCDetailsModal";

import { ocTabs } from "@/config/app.config";
import {
  bulkUploadOCs,
  bulkValidateOCs,
  createOC,
  deleteOC,
  fetchOCsWithCount,
  type OCRecord,
  type OCListRow,
  updateOC,
} from "@/app/lib/api/ocApi";
import { getAllCourses } from "@/app/lib/api/courseApi";
import { getPlatoons } from "@/app/lib/api/platoonApi";
import { useDebouncedValue } from "@/app/lib/debounce";

type CreateOCPayload = Omit<OCRecord, "id" | "uid" | "createdAt">;
type BulkResult =
  | {
      success: number;
      failed: number;
      errors: Array<{ row: number; error: string }>;
    }
  | null;

type CourseLike = { id: string; code?: string; title?: string };
type PlatoonLike = { id: string; name?: string };

export default function OCManagementPage() {
  const [ocList, setOcList] = useState<OCListRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1); // 1-based
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(false);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);

  const [courses, setCourses] = useState<CourseLike[]>([]);
  const [platoons, setPlatoons] = useState<PlatoonLike[]>([]);

  // filters/search (with debounce)
  const [search, setSearch] = useState("");
  const [courseFilter, setCourseFilter] = useState<string>("");
  const [platoonFilter, setPlatoonFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>(""); // ACTIVE / WITHDRAWN / ...
  const [branchFilter, setBranchFilter] = useState<string>(""); // O / E / M
  const debouncedSearch = useDebouncedValue(search, 350);

  // upload states
  const [parsing, setParsing] = useState(false);
  const [uploadedRawRows, setUploadedRawRows] = useState<RawRow[]>([]);
  const [uploadedPreview, setUploadedPreview] = useState<UploadedPreviewRow[]>([]);
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkResult, setBulkResult] = useState<BulkResult>(null);
  const [validateResult, setValidateResult] = useState<BulkResult>(null);
  const [rowValidations, setRowValidations] = useState<Record<number, string | "ok">>({});

  const { register, handleSubmit, reset, setValue } = useForm<Partial<OCRecord>>();

  // details modal
  const [viewOpen, setViewOpen] = useState(false);
  const [viewId, setViewId] = useState<string | null>(null);

  // initial lookups
  useEffect(() => {
    (async () => {
      const [c, p] = await Promise.all([getAllCourses(), getPlatoons()]);
      setCourses((c as any)?.items || []);
      setPlatoons(p || []);
    })().catch(console.error);
  }, []);

  // fetch OCs when filters/search or pagination change
  useEffect(() => {
    setLoading(true);
    (async () => {
      try {
        const res = await fetchOCsWithCount<OCListRow>({
          q: debouncedSearch || undefined,
          courseId: courseFilter || undefined,
          platoonId: platoonFilter || undefined,
          status: (statusFilter || undefined) as any,
          branch: (branchFilter || undefined) as any,
          active: statusFilter === "ACTIVE" ? true : undefined,
          limit: pageSize,
          offset: (currentPage - 1) * pageSize,
        });
        setOcList(res.items || []);
        setTotalCount(res.count || 0);
      } catch (e) {
        console.error("fetch OCs failed:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [debouncedSearch, courseFilter, platoonFilter, statusFilter, branchFilter, currentPage, pageSize]);

  const onSubmit: SubmitHandler<Partial<OCRecord>> = useCallback(
    async (data) => {
      try {
        if (editIndex !== null) {
          const id = ocList[editIndex].id!;
          const updated = await updateOC(id, data as OCRecord);
          setOcList((prev) => prev.map((p, i) => (i === editIndex ? updated : p)));
        } else {
          const created = await createOC(data as CreateOCPayload);
          setOcList((prev) => [...prev, created]);
        }
        reset();
        setIsDialogOpen(false);
        setEditIndex(null);
      } catch (err) {
        console.error("Save failed:", err);
      }
    },
    [editIndex, ocList, reset]
  );

  const handleEdit = useCallback(
    async (index: number) => {
      const oc = ocList[index];
      setEditIndex(index);

      setValue("name", oc.name || "");
      setValue("ocNo" as any, oc.ocNo || "");
      setValue("courseId" as any, oc.courseId || "");
      setValue("branch" as any, (oc.branch ?? "") as any);
      setValue("platoonId" as any, (oc.platoonId ?? "") as any);
      setValue("arrivalAtUniversity" as any, oc.arrivalAtUniversity?.slice(0, 10) ?? "");
      setIsDialogOpen(true);
    },
    [ocList, setValue]
  );

  const handleDelete = useCallback(async (id: string) => {
    await deleteOC(id);
    setOcList((prev) => prev.filter((oc) => oc.id !== id));
  }, []);

  const handleAddOC = useCallback(async () => {
    setEditIndex(null);
    reset();
    setIsDialogOpen(true);
  }, [reset]);

  const onParsed = useCallback((raw: RawRow[], preview: UploadedPreviewRow[]) => {
    setUploadedRawRows(raw);
    setUploadedPreview(preview);
    setBulkResult(null);
    setValidateResult(null);
    setRowValidations({});
  }, []);

  const doBulkUpload = useCallback(
    async () => {
      if (uploadedRawRows.length === 0) return;
      setBulkUploading(true);
      try {
        const data = await bulkUploadOCs(uploadedRawRows);
        setBulkResult(data);

        setLoading(true);
        const res = await fetchOCsWithCount<OCListRow>({
          q: debouncedSearch || undefined,
          limit: pageSize,
          offset: (currentPage - 1) * pageSize,
        });
        setOcList(res.items || []);
        setTotalCount(res.count || 0);
      } catch (err) {
        console.error(err);
        setBulkResult({
          success: 0,
          failed: uploadedRawRows.length,
          errors: [{ row: 0, error: (err as Error).message }],
        });
      } finally {
        setBulkUploading(false);
        setLoading(false);
      }
    },
    [uploadedRawRows, debouncedSearch, pageSize, currentPage]
  );

  const doValidateAll = useCallback(
    async () => {
      if (uploadedRawRows.length === 0) return;
      try {
        const res = await bulkValidateOCs(uploadedRawRows);
        setValidateResult(res);
        // map first 500 errors to rows
        const map: Record<number, string | "ok"> = {};
        for (const e of res.errors.slice(0, 500)) {
          map[e.row - 1] = e.error;
        }
        // mark successes
        uploadedRawRows.forEach((_, i) => {
          if (!(i in map)) map[i] = "ok";
        });
        setRowValidations(map);
      } catch (e: any) {
        console.error("validate failed", e);
      }
    },
    [uploadedRawRows]
  );

  const doValidateRow = useCallback(
    async (rowIndex: number) => {
      const row = uploadedRawRows[rowIndex];
      if (!row) return;
      try {
        const res = await bulkValidateOCs([row]);
        setRowValidations((prev) => ({
          ...prev,
          [rowIndex]: res.failed > 0 ? res.errors[0]?.error ?? "error" : "ok",
        }));
      } catch (e: any) {
        setRowValidations((prev) => ({
          ...prev,
          [rowIndex]: e?.message ?? "error",
        }));
      }
    },
    [uploadedRawRows]
  );

  const openView = useCallback((id: string) => {
    setViewId(id);
    setViewOpen(true);
  }, []);

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
                    <Button variant="outline" onClick={handleAddOC}>
                      Add OC
                    </Button>
                    <UploadButton
                      disabled={parsing}
                      onParsed={onParsed}
                      onParsingStateChange={setParsing}
                      label={parsing ? "Parsing…" : "Upload CSV / Excel"}
                    />
                  </div>
                </div>

                {/* Filters */}
                <div className="grid grid-cols-5 gap-3">
                  <Input
                    placeholder="Search name / TES no…"
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setCurrentPage(1);
                    }}
                  />
                  <select
                    className="border rounded px-2 py-2"
                    value={courseFilter}
                    onChange={(e) => {
                      setCourseFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                  >
                    <option value="">All Courses</option>
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.code ?? c.title ?? c.id}
                      </option>
                    ))}
                  </select>
                  <select
                    className="border rounded px-2 py-2"
                    value={platoonFilter}
                    onChange={(e) => {
                      setPlatoonFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                  >
                    <option value="">All Platoons</option>
                    {platoons.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name ?? p.id}
                      </option>
                    ))}
                  </select>
                  <select
                    className="border rounded px-2 py-2"
                    value={branchFilter}
                    onChange={(e) => {
                      setBranchFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                  >
                    <option value="">Branch</option>
                    <option value="O">O</option>
                    <option value="E">E</option>
                    <option value="M">M</option>
                  </select>
                  <select
                    className="border rounded px-2 py-2"
                    value={statusFilter}
                    onChange={(e) => {
                      setStatusFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                  >
                    <option value="">Status</option>
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="DELEGATED">DELEGATED</option>
                    <option value="WITHDRAWN">WITHDRAWN</option>
                    <option value="PASSED_OUT">PASSED_OUT</option>
                  </select>
                </div>

                {/* Latest Upload (only after file is parsed) */}
                <UploadPreviewTable
                  rows={uploadedPreview}
                  bulkUploading={bulkUploading}
                  bulkResult={bulkResult}
                  onBulkUpload={doBulkUpload}
                  onClear={() => {
                    setUploadedPreview([]);
                    setUploadedRawRows([]);
                    setBulkResult(null);
                    setValidateResult(null);
                    setRowValidations({});
                  }}
                  onValidateAll={doValidateAll}
                  validateResult={validateResult}
                  onValidateRow={doValidateRow}
                  rowValidations={rowValidations}
                />

                {/* All OCs */}
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="font-semibold text-lg">All OCs</h3>
                  </div>
                  <OCsTable
                    ocList={ocList}
                    onView={openView}
                    onEdit={handleEdit}
                    onDelete={(id) => handleDelete(id)}
                    pagination={{
                      mode: "server",
                      currentPage,
                      pageSize,
                      totalCount,
                      onPageChange: (page, newPageSize) => {
                        setCurrentPage(page);
                        if (newPageSize !== pageSize) {
                          setPageSize(newPageSize);
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

      {/* Add/Edit dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editIndex !== null ? "Update OC" : "Add New OC"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <Label>Name</Label>
              <Input {...register("name", { required: true })} />
            </div>
            <div>
              <Label>Tes No</Label>
              <Input {...register("ocNo" as any, { required: true })} />
            </div>
            <div>
              <Label>Course</Label>
              <select
                {...register("courseId" as any, { required: true })}
                className="w-full border border-input bg-background rounded-md p-2"
                defaultValue=""
              >
                <option value="" disabled>
                  Select Course
                </option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code ?? c.title ?? c.id}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Branch</Label>
              <Input {...register("branch" as any)} placeholder="E / M / O" />
            </div>
            <div>
              <Label>Platoon</Label>
              <select
                {...register("platoonId" as any)}
                className="w-full border border-input bg-background rounded-md p-2"
                defaultValue=""
              >
                <option value="" disabled>
                  Select Platoon
                </option>
                {platoons.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name ?? p.id}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Arrival Date</Label>
              <Input type="date" {...register("arrivalAtUniversity" as any)} />
            </div>
            <div className="col-span-2 flex justify-end gap-2 mt-4">
              <Button
                variant="outline"
                type="button"
                onClick={() => {
                  setIsDialogOpen(false);
                  reset();
                }}
              >
                Cancel
              </Button>
              <Button type="submit">{editIndex !== null ? "Update" : "Save"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* View details modal */}
      <OCDetailsModal open={viewOpen} ocId={viewId} onOpenChange={setViewOpen} />
    </SidebarProvider>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import * as XLSX from "xlsx";
import Papa from "papaparse";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { PageHeader } from "@/components/layout/PageHeader";
import BreadcrumbNav from "@/components/layout/BreadcrumbNav";
import GlobalTabs from "@/components/Tabs/GlobalTabs";
import { TabsContent } from "@/components/ui/tabs";
import { OCListItem } from "@/components/oc/OCCard";
import { Edit3, Trash2 } from "lucide-react";

import { ocTabs } from "@/config/app.config";
import { createOC, deleteOC, fetchOCs, OCRecord, updateOC } from "@/app/lib/api/ocApi";
import { fetchCourseById, getAllCourses } from "@/app/lib/api/courseApi";
import { fetchPlatoonByKey, getPlatoons } from "@/app/lib/api/platoonApi";

export default function OCManagementPage() {
  const [ocList, setOcList] = useState<OCRecord[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [courseInfo, setCourseInfo] = useState<string | null>(null);
  const [platoonName, setPlatoonName] = useState<string | null>(null);
  const [courses, setCourses] = useState<any[]>([]);
  const [platoons, setPlatoons] = useState<any[]>([]);


  const { register, handleSubmit, reset, setValue, watch } = useForm<OCRecord>({
    defaultValues: {
      name: "",
      ocNo: "",
      course: "",
      branch: null,
      platoonId: null,
      arrivalAtUniversity: new Date().toISOString().slice(0, 10),
    } as any,
  });

  // Watch form changes
  const courseId = watch("courseId");
  const platoonKey = watch("platoonId");

  useEffect(() => {
    (async () => {
      try {
        const courseResponse = await getAllCourses();
        console.log(courseResponse)
        setCourses(courseResponse.items || []);

        const platoonResponse = await getPlatoons();
        setPlatoons(platoonResponse || []);
      } catch (err) {
        console.error("Failed to load courses or platoons:", err);
      }
    })();
  }, []);


  // Fetch course info when courseId changes
  useEffect(() => {
    if (!courseId) return;
    (async () => {
      try {
        const course = await fetchCourseById(courseId);
        console.log("course:", course)
        setCourseInfo(`${course.code} - ${course.title}`);
      } catch (err: any) {
        console.warn("Course fetch failed:", err);
        setCourseInfo(null);
      }
    })();
  }, [courseId]);

  // Fetch platoon info when platoonId/key changes
  useEffect(() => {
    if (!platoonKey) return;
    (async () => {
      try {
        const platoon = await fetchPlatoonByKey(platoonKey);
        setPlatoonName(platoon.name);
      } catch (err: any) {
        console.warn("Platoon fetch failed:", err);
        setPlatoonName(null);
      }
    })();
  }, [platoonKey]);


  useEffect(() => {
    (async () => {
      try {
        const items = await fetchOCs({ active: true });
        setOcList(items);
      } catch (err) {
        console.error("Failed to load OCs", err);
      }
    })();
  }, []);

  const onSubmit = async (data: OCRecord) => {
    try {
      if (editIndex !== null) {
        const id = ocList[editIndex].id!;
        const updated = await updateOC(id, data);
        setOcList((prev) => prev.map((p, i) => (i === editIndex ? updated : p)));
      } else {
        const created = await createOC(data as Omit<OCRecord, "id" | "uid" | "createdAt">);
        setOcList((prev) => [...prev, created]);
      }
      reset();
      setIsDialogOpen(false);
      setEditIndex(null);
    } catch (err) {
      console.error("Save failed:", err);
    }
  };

  const handleEdit = async (index: number) => {
    const oc = ocList[index];
    setEditIndex(index);

    if (courses.length === 0) {
      const courseResponse = await getAllCourses();
      setCourses(courseResponse.items || []);
    }

    if (platoons.length === 0) {
      const platoonResponse = await getPlatoons();
      setPlatoons(platoonResponse || []);
    }

    setValue("name", oc.name);
    setValue("ocNo", oc.ocNo);
    setValue("courseId", oc.courseId);
    setValue("branch", oc.branch ?? null);
    setValue("platoonId", oc.platoonId ?? null);
    setValue("arrivalAtUniversity", oc.arrivalAtUniversity?.slice(0, 10) ?? "");

    setIsDialogOpen(true);
  };


  const handleDelete = async (index: number) => {
    try {
      const id = ocList[index].id!;
      await deleteOC(id);
      setOcList((prev) => prev.filter((_, i) => i !== index));
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  // ---------- File upload + parse + upload ----------
  const formatRecordFromSheet = (obj: any) => {
    return {
      name: obj["Name"] || obj["name"] || "",
      ocNo: obj["OC No"] || obj["ocNo"] || obj["ocNo"] || obj["ocNo"] || obj["ocNo"] || "",
      courseId: obj["CourseId"] || obj["courseId"] || obj["Course"] || "",
      branch: (obj["Branch"] || obj["branch"] || null) as "E" | "M" | "O" | null,
      platoonId: obj["PlatoonId"] || obj["platoonId"] || null,
      arrivalAtUniversity: obj["Arrival Date"] || obj["arrivalAtUniversity"] || new Date().toISOString(),
    };
  };

  const uploadBatch = async (records: any[]) => {
    setUploading(true);
    const failed: any[] = [];
    for (const rec of records) {
      const payload = formatRecordFromSheet(rec);
      if (!payload.name || !payload.courseId || !payload.ocNo) {
        failed.push({ rec: payload, reason: "missing required fields (name/courseId/ocNo)" });
        continue;
      }
      try {
        await createOC(payload);
      } catch (err) {
        failed.push({ rec: payload, reason: String(err) });
      }
    }
    setUploading(false);
    // Refresh list after import
    try {
      const items = await fetchOCs({ active: true });
      setOcList(items);
    } catch (err) {
      console.error("failed refresh after upload", err);
    }
    if (failed.length) {
      console.warn("Some rows failed to upload:", failed);
      alert(`Upload finished. ${failed.length} rows failed. Check console for details.`);
    } else {
      alert("Upload finished successfully!");
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fname = file.name.toLowerCase();

    if (fname.endsWith(".csv")) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          const rows = results.data as any[];
          await uploadBatch(rows);
        },
      });
    } else if (fname.endsWith(".xlsx") || fname.endsWith(".xls")) {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const data = new Uint8Array(ev.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]) as any[];
        await uploadBatch(rows);
      };
      reader.readAsArrayBuffer(file);
    } else {
      alert("Unsupported file. Use CSV or Excel (.xlsx/.xls).");
    }

    e.currentTarget.value = "";
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <header className="h-16 border-b border-border bg-card/50 backdrop-blur sticky top-0 z-50">
            <PageHeader
              title="OC Management"
              description="Manage all OC details across platoons and terms"
              onLogout={() => console.log("Logout clicked")}
            />
          </header>

          <main className="flex-1 p-6">
            <BreadcrumbNav
              paths={[
                { label: "Dashboard", href: "/dashboard" },
                { label: "Gen Mgmt", href: "/dashboard/genmgmt" },
                { label: "OC Management" },
              ]}
            />

            <GlobalTabs tabs={ocTabs} defaultValue="oc-mgmt">
              <TabsContent value="oc-mgmt" className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-foreground">All OCs</h2>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => { reset(); setIsDialogOpen(true); }}>
                      Add OC
                    </Button>
                    <Button variant="outline" onClick={() => document.getElementById("fileUpload")?.click()}>
                      {uploading ? "Uploading..." : "Upload CSV / Excel"}
                    </Button>
                    <input id="fileUpload" type="file" accept=".csv, .xlsx, .xls" className="hidden" onChange={handleFileUpload} />
                  </div>
                </div>

                <div className="divide-y rounded-md border border-border/50 overflow-hidden">
                  {ocList.map((oc, index) => (
                    <OCListItem
                      key={oc.id ?? index}
                      name={oc.name}
                      course={oc.courseId}
                      platoon={oc.platoonId ?? ""}
                      status={oc.withdrawnOn ? "inactive" : "active"}
                      onClick={() => handleEdit(index)}
                    >
                      <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); handleEdit(index); }}>
                        <Edit3 className="h-3 w-3 mr-1" /> Edit
                      </Button>
                      <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); handleDelete(index); }} className="text-destructive hover:bg-destructive hover:text-destructive-foreground">
                        <Trash2 className="h-3 w-3 mr-1" /> Delete
                      </Button>
                    </OCListItem>
                  ))}
                </div>
              </TabsContent>
            </GlobalTabs>
          </main>
        </div>
      </div>

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
              <Input {...register("ocNo", { required: true })} />
            </div>

            <div>
              <Label>Course</Label>
              <select
                {...register("courseId", { required: true })}
                className="w-full border border-input bg-background rounded-md p-2"
                defaultValue=""
              >
                <option value="" disabled>Select Course</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label>Branch</Label>
              <Input {...register("branch")} placeholder="E / M / O" />
            </div>

            <div>
              <Label>Platoon</Label>
              <select
                {...register("platoonId", { required: true })}
                className="w-full border border-input bg-background rounded-md p-2"
                defaultValue=""
              >
                <option value="" disabled>Select Platoon</option>
                {platoons.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
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
                  setCourseInfo(null);
                  setPlatoonName(null);
                }}
              >
                Cancel
              </Button>
              <Button type="submit">{editIndex !== null ? "Update" : "Save"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

    </SidebarProvider>
  );
}

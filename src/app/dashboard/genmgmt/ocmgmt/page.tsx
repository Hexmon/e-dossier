// "use client";

// import { useCallback, useEffect, useState } from "react";
// import { useForm } from "react-hook-form";
// import * as XLSX from "xlsx";
// import Papa from "papaparse";

// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
// import { AppSidebar } from "@/components/AppSidebar";
// import { SidebarProvider } from "@/components/ui/sidebar";
// import { PageHeader } from "@/components/layout/PageHeader";
// import BreadcrumbNav from "@/components/layout/BreadcrumbNav";
// import GlobalTabs from "@/components/Tabs/GlobalTabs";
// import { TabsContent } from "@/components/ui/tabs";
// import { OCListItem } from "@/components/oc/OCCard";
// import { Edit3, Trash2 } from "lucide-react";

// import { ocTabs } from "@/config/app.config";
// import { createOC, deleteOC, fetchOCs, OCRecord, updateOC } from "@/app/lib/api/ocApi";
// import { fetchCourseById, getAllCourses } from "@/app/lib/api/courseApi";
// import { fetchPlatoonByKey, getPlatoons } from "@/app/lib/api/platoonApi";

// export default function OCManagementPage() {
//   const [ocList, setOcList] = useState<OCRecord[]>([]);
//   const [isDialogOpen, setIsDialogOpen] = useState(false);
//   const [editIndex, setEditIndex] = useState<number | null>(null);

//   const [newOC, setNewOC] = useState({
//     tesNo: "",
//     name: "",
//     course: "",
//     dtOfArrival: "",
//     visibleIdenMks: "",
//     pl: "",
//     dob: "",
//     placeOfBirth: "",
//     domicile: "",
//     religion: "",
//     nationality: "",
//     bloodGp: "",
//     idenMarks: "",
//     fatherName: "",
//     fatherMobile: "",
//     fatherAddress: "",
//     fatherProfession: "",
//     guardianName: "",
//     guardianAddress: "",
//     monthlyIncome: "",
//     nokDetails: "",
//     nokAddress: "",
//     nearestRlyStn: "",
//     secunderabadAddr: "",
//     relativeArmedForces: "",
//     govtFinAsst: "",
//     mobNo: "",
//     email: "",
//     passportNo: "",
//     panCardNo: "",
//     aadharNo: "",
//     bankDetails: "",
//     idCardNo: "",
//     upscRollNo: "",
//     ssbCentre: "",
//     games: "",
//     hobbies: "",
//     swimmerStatus: "",
//     language: "",
//   });

//   const onSubmit = useCallback(async (data: OCRecord) => {
//     try {
//       if (editIndex !== null) {
//         const id = ocList[editIndex].id!;
//         const updated = await updateOC(id, data);
//         setOcList((prev) => prev.map((p, i) => (i === editIndex ? updated : p)));
//       } else {
//         const created = await createOC(data as Omit<OCRecord, "id" | "uid" | "createdAt">);
//         setOcList((prev) => [...prev, created]);
//       }
//       reset();
//       setIsDialogOpen(false);
//       setEditIndex(null);
//     } catch (err) {
//       console.error("Save failed:", err);
//     }
//   }, [editIndex, ocList, reset]);

//   const handleEdit = useCallback(async (index: number) => {
//     const oc = ocList[index];
//     setEditIndex(index);

//     if (courses.length === 0) {
//       const courseResponse = await getAllCourses();
//       setCourses(courseResponse.items || []);
//     }

//     if (platoons.length === 0) {
//       const platoonResponse = await getPlatoons();
//       setPlatoons(platoonResponse || []);
//     }

//     setValue("name", oc.name);
//     setValue("ocNo", oc.ocNo);
//     setValue("courseId", oc.courseId);
//     setValue("branch", oc.branch ?? null);
//     setValue("platoonId", oc.platoonId ?? null);
//     setValue("arrivalAtUniversity", oc.arrivalAtUniversity?.slice(0, 10) ?? "");

//     setIsDialogOpen(true);
//   }, [ocList, courses.length, platoons.length, setValue]);

//   const handleDelete = useCallback(async (id: string) => {
//     try {
//       const res = await deleteOC(id);
//       console.log("Delete response:", res);
//       setOcList(prev => prev.filter((oc) => oc.id !== id));
//     } catch (err) {
//       console.error("Delete failed:", err);
//     }
//   }, []);

//   // ---------- File upload + parse + upload ----------
//   const formatRecordFromSheet = useCallback((obj: any) => ({
//     name: obj["Name"] || obj["name"] || "",
//     ocNo: obj["OC No"] || obj["ocNo"] || "",
//     courseId: obj["CourseId"] || obj["courseId"] || obj["Course"] || "",
//     branch: (obj["Branch"] || obj["branch"] || null) as "E" | "M" | "O" | null,
//     platoonId: obj["PlatoonId"] || obj["platoonId"] || null,
//     arrivalAtUniversity: obj["Arrival Date"] || obj["arrivalAtUniversity"] || new Date().toISOString(),
//   }), []);

//   const uploadBatch = useCallback(async (records: any[]) => {
//     setUploading(true);

//     const payloads = records.map(formatRecordFromSheet).filter(p => p.name && p.courseId && p.ocNo);
//     const results = await Promise.allSettled(payloads.map(p => createOC(p)));
//     const failed = results.filter(r => r.status === "rejected");

//     setUploading(false);

//     const items = await fetchOCs({ active: true });
//     setOcList(items);

//     if (failed.length) {
//       console.warn("Some uploads failed:", failed);
//       alert(`Upload complete. ${failed.length} failed rows. Check console.`);
//     } else {
//       alert("All uploads succeeded!");
//     }
//   }, []);

//   const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
//     const file = e.target.files?.[0];
//     if (!file) return;

//     const fileName = file.name.toLowerCase();
//     const formatRecord = (obj: any): OCRecord => ({
//       tesNo: obj["TesNo"] || "",
//       name: obj["Name"] || "",
//       course: obj["Course"] || "",
//       dtOfArrival: obj["Dt of Arrival"] || "",
//       pl: obj["Pl"] || "",
//       dob: obj["DOB"] || "",
//       placeOfBirth: obj["Place of Birth"] || "",
//       domicile: obj["Domicile"] || "",
//       religion: obj["Religion"] || "",
//       nationality: obj["Nationality"] || "",
//       bloodGp: obj["Blood Gp"] || "",
//       idenMarks: obj["Iden Marks"] || "",
//       fatherName: obj["Father's Name"] || "",
//       fatherMobile: obj["Father's Mobile No"] || "",
//       fatherAddress: obj["Father's Address"] || "",
//       fatherProfession: obj["Father's Profession"] || "",
//       guardianName: obj["Guardian’s Name"] || "",
//       guardianAddress: obj["Guardian’s Address"] || "",
//       monthlyIncome: obj["Monthly Income"] || "",
//       nokDetails: obj["Detls of NOK"] || "",
//       nokAddress: obj["NOK Address"] || "",
//       nearestRlyStn: obj["Nearest Rly Stn"] || "",
//       secunderabadAddr: obj["Secunderabad Addr"] || "",
//       relativeArmedForces: obj["Relative Armed Forces"] || "",
//       govtFinAsst: obj["Govt Fin Asst"] || "",
//       mobNo: obj["Mob No"] || "",
//       email: obj["Email"] || "",
//       aadharNo: obj["Aadhar No"] || "",
//       bankDetails: obj["Bank Details"] || "",
//       idCardNo: obj["Id Card No"] || "",
//       games: obj["Games"] || "",
//       hobbies: obj["Hobbies"] || "",
//       swimmerStatus: obj["Swimmer Status"] || "",
//       language: obj["Language"] || "",
//       upscRollNo: obj["UPSC Roll No"] || "",
//       ssbCentre: obj["SSB Centre"] || "",
//       passportNo: obj["Passport No"] || "",
//       panCardNo: obj["PAN Card No"] || "",
//       visibleIdenMks: obj["Visible Iden Mks"] || "",
//     });

//     if (fileName.endsWith(".csv")) {
//       Papa.parse(file, {
//         header: true,
//         complete: (results) => {
//           const formatted = results.data.map(formatRecord);
//           setOcList((prev) => [...prev, ...formatted]);
//         },
//       });
//     } else if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
//       const reader = new FileReader();
//       reader.onload = (evt) => {
//         const data = new Uint8Array(evt.target?.result as ArrayBuffer);
//         const workbook = XLSX.read(data, { type: "array" });
//         const sheetName = workbook.SheetNames[0];
//         const worksheet = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
//         const formatted = (worksheet as any[]).map(formatRecord);
//         setOcList((prev) => [...prev, ...formatted]);
//       };
//       reader.readAsArrayBuffer(file);
//     } else {
//       alert("Unsupported file type! Please upload CSV or Excel.");
//     }
//   };

//   const courseOptions = Array.from(new Set(ocList.map((oc) => oc.course)));

//   return (
//     <SidebarProvider>
//       <section className="min-h-screen flex w-full bg-background">
//         <aside><AppSidebar /></aside>
//         <main className="flex-1 flex flex-col">
//           <header className="h-16 border-b border-border bg-card/50 backdrop-blur sticky top-0 z-50">
//             <PageHeader
//               title="OC Management"
//               description="Manage all OC details across platoons and terms"
//               onLogout={() => console.log("Logout clicked")}
//             />
//           </header>

//           <section className="flex-1 p-6">
//             <nav>
//               <BreadcrumbNav
//                 paths={[
//                   { label: "Dashboard", href: "/dashboard" },
//                   { label: "Gen Mgmt", href: "/dashboard/genmgmt" },
//                   { label: "OC Management" },
//                 ]}
//               />
//             </nav>

//             <GlobalTabs tabs={ocTabs} defaultValue="oc-mgmt">
//               <TabsContent value="oc-mgmt" className="space-y-6">
//                 <div className="flex items-center justify-between">
//                   <h2 className="text-2xl font-bold text-foreground">All OCs</h2>
//                   <div className="flex gap-2">
//                     <Button variant="outline" onClick={handleAddOC}>
//                       Add OC
//                     </Button>
//                     <Button variant="outline" onClick={() => document.getElementById("fileUpload")?.click()}>
//                       {uploading ? "Uploading..." : "Upload CSV / Excel"}
//                     </Button>
//                     <input
//                       type="file"
//                       id="fileUpload"
//                       accept=".csv, .xlsx, .xls"
//                       className="hidden"
//                       onChange={handleFileUpload}
//                     />
//                   </div>
//                 </div>

//                 <div className="divide-y rounded-md border border-border/50 overflow-hidden">
//                   {ocList.map((oc, index) => (
//                     <OCListItem
//                       key={oc.id ?? index}
//                       name={oc.name}
//                       course={oc.courseId}
//                       platoon={oc.platoonId ?? ""}
//                       status={oc.withdrawnOn ? "inactive" : "active"}
//                       onClick={() => handleEdit(index)}
//                     >
//                       <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); handleEdit(index); }}>
//                         <Edit3 className="h-3 w-3 mr-1" /> Edit
//                       </Button>
//                       <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); handleDelete(oc.id!); }} className="text-destructive hover:bg-destructive hover:text-destructive-foreground">
//                         <Trash2 className="h-3 w-3 mr-1" /> Delete
//                       </Button>
//                     </OCListItem>
//                   ))}
//                 </div>
//               </TabsContent>
//             </GlobalTabs>
//           </section>
//         </main>
//       </section>

//       <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
//         <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
//           <DialogHeader>
//             <DialogTitle>{editIndex !== null ? "Update OC" : "Add New OC"}</DialogTitle>
//           </DialogHeader>

//           <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-2 gap-4 mb-6">
//             <div>
//               <Label>Name</Label>
//               <Input {...register("name", { required: true })} />
//             </div>

//             <div>
//               <Label>Tes No</Label>
//               <Input {...register("ocNo", { required: true })} />
//             </div>

//             <div>
//               <Label>Course</Label>
//               <select
//                 {...register("courseId", { required: true })}
//                 className="w-full border border-input bg-background rounded-md p-2"
//                 defaultValue=""
//               >
//                 <option value="" disabled>Select Course</option>
//                 {courses.map((c) => (
//                   <option key={c.id} value={c.id}>
//                     {c.code}
//                   </option>
//                 ))}
//               </select>
//             </div>

//             <div>
//               <Label>Branch</Label>
//               <Input {...register("branch")} placeholder="E / M / O" />
//             </div>

//             <div>
//               <Label>Platoon</Label>
//               <select
//                 {...register("platoonId", { required: true })}
//                 className="w-full border border-input bg-background rounded-md p-2"
//                 defaultValue=""
//               >
//                 <option value="" disabled>Select Platoon</option>
//                 {platoons.map((p) => (
//                   <option key={p.id} value={p.id}>
//                     {p.name}
//                   </option>
//                 ))}
//               </select>
//             </div>


//             <div>
//               <Label>Arrival Date</Label>
//               <Input type="date" {...register("arrivalAtUniversity" as any)} />
//             </div>

//             <div className="col-span-2 flex justify-end gap-2 mt-4">
//               <Button
//                 variant="outline"
//                 type="button"
//                 onClick={() => {
//                   setIsDialogOpen(false);
//                   reset();
//                   setCourseInfo(null);
//                   setPlatoonName(null);
//                 }}
//               >
//                 Cancel
//               </Button>
//               <Button type="submit">{editIndex !== null ? "Update" : "Save"}</Button>
//             </div>
//           </form>
//         </DialogContent>
//       </Dialog>

//     </SidebarProvider>
//   );
// }
"use client";

import {
  useCallback,
  useEffect,
  useState,
  type ChangeEvent,
} from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
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
import { getAllCourses } from "@/app/lib/api/courseApi";
import { getPlatoons } from "@/app/lib/api/platoonApi";

type CreateOCPayload = Omit<OCRecord, "id" | "uid" | "createdAt">;

export default function OCManagementPage() {
  const [ocList, setOcList] = useState<OCRecord[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);

  // states used in UI
  const [courses, setCourses] = useState<any[]>([]);
  const [platoons, setPlatoons] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [courseInfo, setCourseInfo] = useState<any | null>(null);
  const [platoonName, setPlatoonName] = useState<string | null>(null);

  // The form: use Partial so we don't require `id` etc.
  const { register, handleSubmit, reset, setValue } = useForm<Partial<OCRecord>>();

  // initial load of active OCs
  useEffect(() => {
    (async () => {
      try {
        const items = await fetchOCs({ active: true });
        setOcList(items || []);
      } catch (err) {
        console.error("Failed to fetch OCs:", err);
      }
    })();
  }, []);

  const onSubmit: SubmitHandler<Partial<OCRecord>> = useCallback(
    async (data) => {
      try {
        if (editIndex !== null) {
          const id = ocList[editIndex].id!;
          // If updateOC expects full OCRecord, cast here (or change the API type to accept Partial)
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

      if (courses.length === 0) {
        const courseResponse = await getAllCourses();
        setCourses(courseResponse.items || []);
      }

      if (platoons.length === 0) {
        const platoonResponse = await getPlatoons();
        setPlatoons(platoonResponse || []);
      }

      setValue("name", oc.name || "");
      setValue("ocNo" as any, (oc as any).ocNo || ""); // cast key if not on OCRecord
      setValue("courseId" as any, (oc as any).courseId || "");
      setValue("branch" as any, ((oc as any).branch ?? "") as any);
      setValue("platoonId" as any, ((oc as any).platoonId ?? "") as any);
      setValue("arrivalAtUniversity" as any, oc.arrivalAtUniversity?.slice(0, 10) ?? "");

      setIsDialogOpen(true);
    },
    [ocList, courses.length, platoons.length, setValue]
  );

  const handleDelete = useCallback(async (id: string) => {
    try {
      const res = await deleteOC(id);
      console.log("Delete response:", res);
      setOcList((prev) => prev.filter((oc) => oc.id !== id));
    } catch (err) {
      console.error("Delete failed:", err);
    }
  }, []);

  const handleAddOC = useCallback(async () => {
    try {
      if (courses.length === 0) {
        const courseResponse = await getAllCourses();
        setCourses(courseResponse.items || []);
      }
      if (platoons.length === 0) {
        const platoonResponse = await getPlatoons();
        setPlatoons(platoonResponse || []);
      }
    } catch (err) {
      console.error("Prefetch failed:", err);
    }
    setEditIndex(null);
    reset();
    setIsDialogOpen(true);
  }, [courses.length, platoons.length, reset]);

  // ---------- File upload + parse ----------
  const handleFileUpload = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const fileName = file.name.toLowerCase();
      const mapToRecord = (obj: any) => ({
        name: obj["Name"] || obj["name"] || "",
        ocNo: obj["OC No"] || obj["ocNo"] || "",
        courseId: obj["CourseId"] || obj["courseId"] || obj["Course"] || "",
        branch: obj["Branch"] || obj["branch"] || null,
        platoonId: obj["PlatoonId"] || obj["platoonId"] || null,
        arrivalAtUniversity: obj["Arrival Date"] || obj["arrivalAtUniversity"] || new Date().toISOString(),
      });

      if (fileName.endsWith(".csv")) {
        setUploading(true);
        Papa.parse(file, {
          header: true,
          complete: (results) => {
            const formatted = (results.data as any[]).map(mapToRecord);
            setOcList((prev) => [...prev, ...(formatted as unknown as OCRecord[])]);
            setUploading(false);
          },
          error: () => setUploading(false),
        });
      } else if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
        setUploading(true);
        const reader = new FileReader();
        reader.onload = (evt) => {
          try {
            const data = new Uint8Array(evt.target?.result as ArrayBuffer);
            const workbook = XLSX.read(data, { type: "array" });
            const sheetName = workbook.SheetNames[0];
            const worksheet = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
            const formatted = (worksheet as any[]).map(mapToRecord);
            setOcList((prev) => [...prev, ...(formatted as unknown as OCRecord[])]);
          } finally {
            setUploading(false);
          }
        };
        reader.readAsArrayBuffer(file);
      } else {
        alert("Unsupported file type! Please upload CSV or Excel.");
      }
    },
    []
  );

  return (
    <SidebarProvider>
      <section className="min-h-screen flex w-full bg-background">
        <aside><AppSidebar /></aside>
        <main className="flex-1 flex flex-col">
          <header className="h-16 border-b border-border bg-card/50 backdrop-blur sticky top-0 z-50">
            <PageHeader
              title="OC Management"
              description="Manage all OC details across platoons and terms"
              onLogout={() => console.log("Logout clicked")}
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
                  <h2 className="text-2xl font-bold text-foreground">All OCs</h2>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={handleAddOC}>
                      Add OC
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => document.getElementById("fileUpload")?.click()}
                      disabled={uploading}
                    >
                      {uploading ? "Uploading..." : "Upload CSV / Excel"}
                    </Button>
                    <input
                      type="file"
                      id="fileUpload"
                      accept=".csv, .xlsx, .xls"
                      className="hidden"
                      onChange={handleFileUpload}
                    />
                  </div>
                </div>

                <div className="divide-y rounded-md border border-border/50 overflow-hidden">
                  {ocList.map((oc, index) => (
                    <OCListItem
                      key={oc.id ?? index}
                      name={oc.name}
                      course={(oc as any).courseId}
                      platoon={(oc as any).platoonId ?? ""}
                      status={(oc as any).withdrawnOn ? "inactive" : "active"}
                      onClick={() => handleEdit(index)}
                    >
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); handleEdit(index); }}
                      >
                        <Edit3 className="h-3 w-3 mr-1" /> Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); handleDelete(oc.id!); }}
                        className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                      >
                        <Trash2 className="h-3 w-3 mr-1" /> Delete
                      </Button>
                    </OCListItem>
                  ))}
                </div>
              </TabsContent>
            </GlobalTabs>
          </section>
        </main>
      </section>

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
              <Input {...register("branch" as any)} placeholder="E / M / O" />
            </div>

            <div>
              <Label>Platoon</Label>
              <select
                {...register("platoonId" as any, { required: true })}
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

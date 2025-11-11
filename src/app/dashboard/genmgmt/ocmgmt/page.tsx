"use client";

import { useState } from "react";
import Link from "next/link";
import * as XLSX from "xlsx";
import Papa from "papaparse";
import { Edit3, Trash2 } from "lucide-react";

import { AppSidebar } from "@/components/AppSidebar";
import { Input } from "@/components/ui/input";
import { SidebarProvider } from "@/components/ui/sidebar";
import { TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { OCListItem } from "@/components/oc/OCCard";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/layout/PageHeader";
import BreadcrumbNav from "@/components/layout/BreadcrumbNav";
import GlobalTabs from "@/components/Tabs/GlobalTabs";
import { OCRecord, ocTabs } from "@/config/app.config";

export default function OCManagementPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCourse, setSelectedCourse] = useState("");
  const [ocList, setOcList] = useState<OCRecord[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);

  // Bulk upload helpers/state
  const [rawRows, setRawRows] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ processed: number; total: number; success: number } | null>(null);
  const [uploadResult, setUploadResult] = useState<{ success: number; failed: number; errors: { row: number; error: string }[] } | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [newOC, setNewOC] = useState<OCRecord>({
    tesNo: "",
    name: "",
    course: "",
    dtOfArrival: "",
    visibleIdenMks: "",
    pl: "",
    dob: "",
    placeOfBirth: "",
    domicile: "",
    religion: "",
    nationality: "",
    bloodGp: "",
    idenMarks: "",
    fatherName: "",
    fatherMobile: "",
    fatherAddress: "",
    fatherProfession: "",
    guardianName: "",
    guardianAddress: "",
    monthlyIncome: "",
    nokDetails: "",
    nokAddress: "",
    nearestRlyStn: "",
    secunderabadAddr: "",
    relativeArmedForces: "",
    govtFinAsst: "",
    mobNo: "",
    email: "",
    passportNo: "",
    panCardNo: "",
    aadharNo: "",
    bankDetails: "",
    idCardNo: "",
    upscRollNo: "",
    ssbCentre: "",
    games: "",
    hobbies: "",
    swimmerStatus: "",
    language: "",
  });

  const handleSaveOC = () => {
    if (editIndex !== null) {
      const updatedList = [...ocList];
      updatedList[editIndex] = newOC;
      setOcList(updatedList);
      setEditIndex(null);
    } else {
      setOcList([...ocList, newOC]);
    }
    resetForm();
  };

  const handleEditOC = (index: number) => {
    setNewOC({ ...ocList[index] });
    setEditIndex(index);
    setIsDialogOpen(true);
  };

  const handleDeleteOC = (index: number) => {
    const updatedList = ocList.filter((_, i) => i !== index);
    setOcList(updatedList);
  };

  const handleAddOC = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setNewOC({
      tesNo: "",
      name: "",
      course: "",
      dtOfArrival: "",
      visibleIdenMks: "",
      pl: "",
      dob: "",
      placeOfBirth: "",
      domicile: "",
      religion: "",
      nationality: "",
      bloodGp: "",
      idenMarks: "",
      fatherName: "",
      fatherMobile: "",
      fatherAddress: "",
      fatherProfession: "",
      guardianName: "",
      guardianAddress: "",
      monthlyIncome: "",
      nokDetails: "",
      nokAddress: "",
      nearestRlyStn: "",
      secunderabadAddr: "",
      relativeArmedForces: "",
      govtFinAsst: "",
      mobNo: "",
      email: "",
      passportNo: "",
      panCardNo: "",
      aadharNo: "",
      bankDetails: "",
      idCardNo: "",
      upscRollNo: "",
      ssbCentre: "",
      games: "",
      hobbies: "",
      swimmerStatus: "",
      language: "",
    });
    setIsDialogOpen(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const normalize = (s: string) =>
      (s || "")
        .toLowerCase()
        .replace(/[\u2019'`]/g, "'")
        .replace(/[^a-z0-9]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    const toMap = (obj: any) => {
      const m: Record<string, any> = {};
      Object.keys(obj || {}).forEach((k) => (m[normalize(k)] = obj[k]));
      return m;
    };

    const get = (m: Record<string, any>, aliases: string[]): any => {
      for (const a of aliases) {
        const v = m[normalize(a)];
        if (v != null && v !== "") return v;
      }
      return "";
    };

    const formatRecordFromRaw = (raw: any): OCRecord => {
      const m = toMap(raw);
      const govFin = get(m, ["Govt Fin Asst Mob No"]);
      let mobFromGov: string = "";
      if (govFin) {
        mobFromGov = String(govFin).replace(/[^0-9+]/g, "").slice(0, 20);
      }
      return {
        tesNo: get(m, ["Tes No", "TesNo", "OC No", "OC Number"]).toString(),
        name: get(m, ["Name"]).toString(),
        course: get(m, ["Course", "Course Code", "Course Name"]).toString(),
        dtOfArrival: get(m, ["Dt of Arrival", "Date of Arrival", "DOA"]).toString(),
        pl: get(m, ["Pl"]).toString(),
        dob: get(m, ["DOB", "Date of Birth"]).toString(),
        placeOfBirth: get(m, ["Place of Birth"]).toString(),
        domicile: get(m, ["Domicile"]).toString(),
        religion: get(m, ["Religion"]).toString(),
        nationality: get(m, ["Nationality"]).toString(),
        bloodGp: get(m, ["Blood GP", "Blood Gp", "Blood Group"]).toString(),
        idenMarks: get(m, ["Iden Marks", "Identification Marks"]).toString(),
        fatherName: get(m, ["Father's Name", "Fathers Name"]).toString(),
        fatherMobile: get(m, ["Father's Mobile", "Father's Mobile No", "Fathers Mobile"]).toString(),
        fatherAddress: get(m, ["Father's Address", "Father Address"]).toString(),
        fatherProfession: get(m, ["Father's Profession", "Father Profession"]).toString(),
        guardianName: get(m, ["Guardian Name", "Guardian's Name"]).toString(),
        guardianAddress: get(m, ["Guardian's Address", "Guardian Address"]).toString(),
        monthlyIncome: get(m, ["Income(parents)", "Monthly Income"]).toString(),
        nokDetails: get(m, ["Detls of NOK", "Details of NOK"]).toString(),
        nokAddress: get(m, ["Permanent & Present Address", "NOK Address"]).toString(),
        nearestRlyStn: get(m, ["Nearest RLY Stn", "Nearest Railway Station"]).toString(),
        secunderabadAddr: get(m, ["Address of Family/Friends in Secunderbad", "Address of Family/Friends in Secunderabad", "Secunderabad Addr"]).toString(),
        relativeArmedForces: get(m, ["RK Name & Relan of near Relative in Armed force", "Relative Armed Forces"]).toString(),
        govtFinAsst: govFin ? "Yes" : "",
        mobNo: mobFromGov || get(m, ["Mob No"]).toString(),
        email: get(m, ["E mail", "Email"]).toString(),
        passportNo: get(m, ["Passport No"]).toString(),
        panCardNo: get(m, ["PAN Card No", "PAN No"]).toString(),
        aadharNo: get(m, ["Aadhar No", "Aadhaar No"]).toString(),
        bankDetails: get(m, ["Bank Detail", "Bank Details"]).toString(),
        idCardNo: get(m, ["Iden card No", "Id Card No"]).toString(),
        games: get(m, ["Games"]).toString(),
        hobbies: get(m, ["Hobbies"]).toString(),
        swimmerStatus: get(m, ["Swimmer/Non Swimmer", "Swimmer Status"]).toString(),
        language: get(m, ["Language", "Languages"]).toString(),
        upscRollNo: get(m, ["UPSC Roll No"]).toString(),
        ssbCentre: get(m, ["SSB Centre"]).toString(),
        visibleIdenMks: get(m, ["Visible Iden Mks", "Visible Ident Marks"]).toString(),
      };
    };

    const fileName = file.name.toLowerCase();

    if (fileName.endsWith(".csv")) {
      Papa.parse(file, {
        header: true,
        complete: (results) => {
          const raw = (results.data || []).filter(Boolean) as any[];
          const formatted = raw.map(formatRecordFromRaw);
          setOcList((prev) => [...prev, ...formatted]);
          setRawRows((prev) => [...prev, ...raw]);
        },
      });
    } else if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
        const raw = worksheet as any[];
        const formatted = raw.map(formatRecordFromRaw);
        setOcList((prev) => [...prev, ...formatted]);
        setRawRows((prev) => [...prev, ...raw]);
      };
      reader.readAsArrayBuffer(file);
    } else {
      alert("Unsupported file type! Please upload CSV or Excel.");
    }
  };

  // Upload in batches to show progress and avoid huge payloads
  const handleBulkUpload = async () => {
    if (!rawRows.length || isUploading) return;
    setUploadError(null);
    setUploadResult(null);
    setIsUploading(true);

    const batchSize = 25;
    const total = rawRows.length;
    let processed = 0;
    let success = 0;
    const errors: { row: number; error: string }[] = [];

    for (let i = 0; i < rawRows.length; i += batchSize) {
      const batch = rawRows.slice(i, i + batchSize);
      setUploadProgress({ processed, total, success });
      try {
        const csrf = document.cookie.match(/(?:^|; )csrf-token=([^;]+)/)?.[1] ?? '';
        const resp = await fetch('/api/v1/oc/bulk-upload', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': csrf,
          },
          body: JSON.stringify({ rows: batch }),
          credentials: 'include',
        });
        if (!resp.ok) {
          const msg = await resp.text();
          throw new Error(msg || `Server error (${resp.status})`);
        }
        const data = await resp.json();
        success += Number(data?.success || 0);
        if (Array.isArray(data?.errors)) {
          // Adjust row numbers to global indices
          for (const err of data.errors) {
            errors.push({ row: i + (err.row ?? 0), error: err.error });
          }
        }
      } catch (err: any) {
        setUploadError(err?.message || 'Failed while uploading');
        break;
      } finally {
        processed = Math.min(processed + batch.length, total);
        setUploadProgress({ processed, total, success });
      }
    }

    setUploadResult({ success, failed: errors.length, errors });
    setIsUploading(false);
  };

  const courseOptions = Array.from(new Set(ocList.map((oc) => oc.course)));

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
                  <div className="flex gap-2 items-center">
                    <Button variant="outline" onClick={handleAddOC}>
                      Add OC
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => document.getElementById("fileUpload")?.click()}
                    >
                      Upload CSV / Excel
                    </Button>
                    <input
                      type="file"
                      id="fileUpload"
                      accept=".csv, .xlsx, .xls"
                      className="hidden"
                      onChange={handleFileUpload}
                    />
                    <Button
                      onClick={handleBulkUpload}
                      disabled={!rawRows.length || isUploading}
                    >
                      {isUploading && uploadProgress
                        ? `Uploading ${uploadProgress.processed}/${uploadProgress.total}...`
                        : 'Upload to Database'}
                    </Button>
                    {uploadError && (
                      <span className="text-sm text-destructive">{uploadError}</span>
                    )}
                    {uploadResult && (
                      <span className="text-sm text-muted-foreground">
                        Done: {uploadResult.success} ok, {uploadResult.failed} failed
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <label htmlFor="courseFilter" className="text-sm font-medium text-primary">
                      Filter by Course:
                    </label>
                    <select
                      id="courseFilter"
                      value={selectedCourse}
                      onChange={(e) => setSelectedCourse(e.target.value)}
                      className="border border-primary text-primary bg-background rounded-md px-3 py-2 focus:ring-2 focus:ring-ring"
                    >
                      <option value="">All Courses</option>
                      {courseOptions.map((course) => (
                        <option key={course} value={course}>
                          {course}
                        </option>
                      ))}
                    </select>
                  </div>
                  <a
                    href="/sample/Sample_OC_Upload_WithNames.xlsx"
                    download
                    className="text-sm text-primary underline"
                  >
                    Download Sample CSV
                  </a>
                </div>

                <div className="divide-y rounded-md border border-border/50 overflow-hidden">
                  {ocList
                    .filter((oc) =>
                      (selectedCourse ? oc.course === selectedCourse : true) &&
                      (oc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        oc.tesNo.toLowerCase().includes(searchQuery.toLowerCase()))
                    )
                    .map((oc, index) => (
                      <OCListItem
                        key={index}
                        name={oc.name}
                        course={oc.course}
                        platoon={oc.pl}
                        status="active"
                        onClick={() => handleEditOC(index)}
                      >
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditOC(index);
                          }}
                        >
                          <Edit3 className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteOC(index);
                          }}
                          className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Delete
                        </Button>
                      </OCListItem>
                    ))}
                </div>
              </TabsContent>
            </GlobalTabs>
          </main>
        </div>
      </div>

      {/* Add/Edit OC Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editIndex !== null ? "Update OC" : "Add New OC"}</DialogTitle>
          </DialogHeader>

          <h3 className="text-lg font-semibold mb-2">Pre-Commissioning TRG PH-I</h3>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <Label>Tes No</Label>
              <Input
                value={newOC.tesNo}
                onChange={(e) => setNewOC({ ...newOC, tesNo: e.target.value })}
              />
            </div>
            <div>
              <Label>Name</Label>
              <Input
                value={newOC.name}
                onChange={(e) => setNewOC({ ...newOC, name: e.target.value })}
              />
            </div>
            <div>
              <Label>Course</Label>
              <Input
                value={newOC.course}
                onChange={(e) => setNewOC({ ...newOC, course: e.target.value })}
              />
            </div>
            <div>
              <Label>Pl</Label>
              <Input
                value={newOC.pl}
                onChange={(e) => setNewOC({ ...newOC, pl: e.target.value })}
              />
            </div>
            <div>
              <Label>Date of Arrival</Label>
              <Input
                type="date"
                value={newOC.dtOfArrival}
                onChange={(e) => setNewOC({ ...newOC, dtOfArrival: e.target.value })}
              />
            </div>
            <div>
              <Label>DOB</Label>
              <Input
                type="date"
                value={newOC.dob}
                onChange={(e) => setNewOC({ ...newOC, dob: e.target.value })}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveOC}>
              {editIndex !== null ? "Update" : "Save"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}

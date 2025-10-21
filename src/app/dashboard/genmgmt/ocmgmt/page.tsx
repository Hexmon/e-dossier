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

    const fileName = file.name.toLowerCase();
    const formatRecord = (obj: any): OCRecord => ({
      tesNo: obj["TesNo"] || "",
      name: obj["Name"] || "",
      course: obj["Course"] || "",
      dtOfArrival: obj["Dt of Arrival"] || "",
      pl: obj["Pl"] || "",
      dob: obj["DOB"] || "",
      placeOfBirth: obj["Place of Birth"] || "",
      domicile: obj["Domicile"] || "",
      religion: obj["Religion"] || "",
      nationality: obj["Nationality"] || "",
      bloodGp: obj["Blood Gp"] || "",
      idenMarks: obj["Iden Marks"] || "",
      fatherName: obj["Father's Name"] || "",
      fatherMobile: obj["Father's Mobile No"] || "",
      fatherAddress: obj["Father's Address"] || "",
      fatherProfession: obj["Father's Profession"] || "",
      guardianName: obj["Guardian’s Name"] || "",
      guardianAddress: obj["Guardian’s Address"] || "",
      monthlyIncome: obj["Monthly Income"] || "",
      nokDetails: obj["Detls of NOK"] || "",
      nokAddress: obj["NOK Address"] || "",
      nearestRlyStn: obj["Nearest Rly Stn"] || "",
      secunderabadAddr: obj["Secunderabad Addr"] || "",
      relativeArmedForces: obj["Relative Armed Forces"] || "",
      govtFinAsst: obj["Govt Fin Asst"] || "",
      mobNo: obj["Mob No"] || "",
      email: obj["Email"] || "",
      aadharNo: obj["Aadhar No"] || "",
      bankDetails: obj["Bank Details"] || "",
      idCardNo: obj["Id Card No"] || "",
      games: obj["Games"] || "",
      hobbies: obj["Hobbies"] || "",
      swimmerStatus: obj["Swimmer Status"] || "",
      language: obj["Language"] || "",
      upscRollNo: obj["UPSC Roll No"] || "",
      ssbCentre: obj["SSB Centre"] || "",
      passportNo: obj["Passport No"] || "",
      panCardNo: obj["PAN Card No"] || "",
      visibleIdenMks: obj["Visible Iden Mks"] || "",
    });

    if (fileName.endsWith(".csv")) {
      Papa.parse(file, {
        header: true,
        complete: (results) => {
          const formatted = results.data.map(formatRecord);
          setOcList((prev) => [...prev, ...formatted]);
        },
      });
    } else if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
        const formatted = (worksheet as any[]).map(formatRecord);
        setOcList((prev) => [...prev, ...formatted]);
      };
      reader.readAsArrayBuffer(file);
    } else {
      alert("Unsupported file type! Please upload CSV or Excel.");
    }
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
                  <div className="flex gap-2">
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

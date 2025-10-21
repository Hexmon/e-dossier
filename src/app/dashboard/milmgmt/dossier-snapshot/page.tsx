"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppSidebar } from "@/components/AppSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  User,
  LogOut,
  Settings,
  ArrowLeft,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import SelectedCadetTable from "@/components/cadet_table/SelectedCadetTable";
import { RootState } from "@/store";
import { useSelector } from "react-redux";
import BreadcrumbNav from "@/components/layout/BreadcrumbNav";
import { PageHeader } from "@/components/layout/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";

// ✅ Sample data
const cadets = ["Ravi Kumar", "Arjun Singh", "Vikram Roy"];

export default function DossierSnapshot() {
  const selectedCadet = useSelector((state: RootState) => state.cadet.selectedCadet);
  const router = useRouter();

  const handleLogout = () => {
    router.push("/login");
    console.log("Logout clicked");
  };

  const [newOC, setNewOC] = useState({
    arrivalPhoto: null as File | null,
    departurePhoto: null as File | null,
    tesNo: "",
    name: "",
    course: "",
    pi: "",
    dtOfArr: "",
    relegated: "",
    withdrawnOn: "",
    dtOfPassingOut: "",
    icNo: "",
    orderOfMerit: "",
    regtArm: "",
    postedAtt: "",
  });

  const [savedOC, setSavedOC] = useState({ ...newOC });

  const handleSaveOC = () => {
    setSavedOC(newOC);
    console.log("Saved OC:", newOC);
    handleReset();
  };

  const handleReset = () => {
    setNewOC({
      arrivalPhoto: null,
      departurePhoto: null,
      tesNo: "",
      name: "",
      course: "",
      pi: "",
      dtOfArr: "",
      relegated: "",
      withdrawnOn: "",
      dtOfPassingOut: "",
      icNo: "",
      orderOfMerit: "",
      regtArm: "",
      postedAtt: "",
    });
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />

        <div className="flex-1 flex flex-col">
          {/* Header */}
          <header className="h-16 border-b border-border bg-card/50 backdrop-blur sticky top-0 z-50">
            <PageHeader
              title="Dossier Snapshot"
              description="Quickly view and analyze OC details"
              onLogout={handleLogout}
            />
          </header>

          {/* Main Content */}
          <main className="flex-1 p-6">
            {/* Breadcrumb */}
            <BreadcrumbNav
              paths={[
                { label: "Dashboard", href: "/dashboard" },
                { label: "Dossier", href: "/dashboard/milmgmt" },
                { label: "Dossier Snapshot" },
              ]}
            />

            {/* Selected Cadet */}
            <div className="hidden md:flex sticky top-16 z-40">
              {selectedCadet && <SelectedCadetTable selectedCadet={selectedCadet} />}
            </div>

            {/* Dossier Form */}
            <div className="w-full mx-auto p-6">
              <Card className="shadow-lg rounded-2xl border">
                <CardHeader>
                  <CardTitle className="text-xl font-bold">Officer Cadet Form</CardTitle>
                </CardHeader>

                <CardContent>
                  <Tabs defaultValue="form">
                    <TabsList className="mb-6">
                      <TabsTrigger value="form" className="border border-gray-300 text-blue-700 data-[state=inactive]:bg-blue-100 data-[state=active]:bg-white data-[state=active]:border-primary rounded-md px-3 py-2 transition-colors">
                        Fill Form
                      </TabsTrigger>
                      <TabsTrigger value="preview" className="border border-gray-300 text-blue-700 data-[state=inactive]:bg-blue-100 data-[state=active]:bg-white data-[state=active]:border-primary rounded-md px-3 py-2 transition-colors">
                        Preview Data
                      </TabsTrigger>
                    </TabsList>

                    {/* === Form Tab === */}
                    <TabsContent value="form">
                      {/* Photos */}
                      <div className="grid grid-cols-2 gap-6 mb-6">
                        <div className="flex flex-col items-center border p-4 rounded-lg">
                          <Label className="mb-1">Arrival</Label>
                          <Input
                            type="file"
                            accept="image/*"
                            onChange={(e) =>
                              setNewOC({
                                ...newOC,
                                arrivalPhoto: e.target.files?.[0] || null,
                              })
                            }
                          />
                          <Label className="mt-1">Civil Dress</Label>
                        </div>

                        <div className="flex flex-col items-center border p-4 rounded-lg">
                          <Label className="mb-1">Departure</Label>
                          <Input
                            type="file"
                            accept="image/*"
                            onChange={(e) =>
                              setNewOC({
                                ...newOC,
                                departurePhoto: e.target.files?.[0] || null,
                              })
                            }
                          />
                          <Label className="mt-1">Uniform</Label>
                        </div>
                      </div>

                      {/* Pre-Commissioning Fields */}
                      <h3 className="text-lg font-semibold mb-4 bg-blue-100 px-4 py-1 rounded-2xl">Pre-Commissioning TRG PH-I</h3>
                      <div className="grid grid-cols-2 gap-4 mb-6">
                        {[
                          ["TES No", "tesNo"],
                          ["Name", "name"],
                          ["Course", "course"],
                          ["PI", "pi"],
                        ].map(([label, key]) => (
                          <div key={key}>
                            <Label>{label}</Label>
                            <Input
                              value={newOC[key as keyof typeof newOC] as string}
                              onChange={(e) =>
                                setNewOC({ ...newOC, [key]: e.target.value })
                              }
                            />
                          </div>
                        ))}

                        <div>
                          <Label>Date of Arrival</Label>
                          <Input
                            type="date"
                            value={newOC.dtOfArr}
                            onChange={(e) =>
                              setNewOC({ ...newOC, dtOfArr: e.target.value })
                            }
                          />
                        </div>

                        <div>
                          <Label>Relegated to Course & Date</Label>
                          <Input
                            value={newOC.relegated}
                            onChange={(e) =>
                              setNewOC({ ...newOC, relegated: e.target.value })
                            }
                          />
                        </div>

                        <div>
                          <Label>Withdrawn On</Label>
                          <Input
                            type="date"
                            value={newOC.withdrawnOn}
                            onChange={(e) =>
                              setNewOC({ ...newOC, withdrawnOn: e.target.value })
                            }
                          />
                        </div>
                      </div>

                      {/* Commissioning Details */}
                      <h3 className="text-lg font-semibold mb-4 bg-blue-100 px-4 py-1 rounded-2xl">Commissioning Details</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Date of Passing Out</Label>
                          <Input
                            type="date"
                            value={newOC.dtOfPassingOut}
                            onChange={(e) =>
                              setNewOC({ ...newOC, dtOfPassingOut: e.target.value })
                            }
                          />
                        </div>
                        <div>
                          <Label>IC No</Label>
                          <Input
                            value={newOC.icNo}
                            onChange={(e) =>
                              setNewOC({ ...newOC, icNo: e.target.value })
                            }
                          />
                        </div>
                        <div>
                          <Label>Order of Merit</Label>
                          <Input
                            value={newOC.orderOfMerit}
                            onChange={(e) =>
                              setNewOC({ ...newOC, orderOfMerit: e.target.value })
                            }
                          />
                        </div>
                        <div>
                          <Label>Regt/Arm Allotted</Label>
                          <Input
                            value={newOC.regtArm}
                            onChange={(e) =>
                              setNewOC({ ...newOC, regtArm: e.target.value })
                            }
                          />
                        </div>
                        <div className="col-span-2">
                          <Label>Posted/Attached To (Unit & Location)</Label>
                          <Input
                            value={newOC.postedAtt}
                            onChange={(e) =>
                              setNewOC({ ...newOC, postedAtt: e.target.value })
                            }
                          />
                        </div>
                      </div>

                      <div className="flex justify-center mt-6 items-center gap-4">
                        <Button className="w-40" onClick={handleSaveOC}>
                          Save
                        </Button>
                        <Button
                          variant="outline"
                          className="w-40"
                          onClick={handleReset}
                        >
                          Reset
                        </Button>
                      </div>
                    </TabsContent>

                    {/* === Preview Tab === */}
                    <TabsContent value="preview">
                      <Card className="p-6 border rounded-lg bg-gray-50">
                        <h3 className="text-lg font-semibold mb-4">Preview</h3>
                        <div className="grid grid-cols-2 gap-6 mb-6">
                          {savedOC.arrivalPhoto ? (
                            <div className="flex flex-col items-center">
                              <img
                                src={URL.createObjectURL(savedOC.arrivalPhoto)}
                                alt="Arrival"
                                className="h-32 w-32 object-cover rounded border"
                              />
                              <p className="mt-2 text-sm text-gray-600">Arrival (Civil Dress)</p>
                            </div>
                          ) : (
                            <p className="text-gray-500 italic">No arrival photo</p>
                          )}

                          {savedOC.departurePhoto ? (
                            <div className="flex flex-col items-center">
                              <img
                                src={URL.createObjectURL(savedOC.departurePhoto)}
                                alt="Departure"
                                className="h-32 w-32 object-cover rounded border"
                              />
                              <p className="mt-2 text-sm text-gray-600">Departure (Uniform)</p>
                            </div>
                          ) : (
                            <p className="text-gray-500 italic">No departure photo</p>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-sm">
                          {Object.entries({
                            Name: savedOC.name,
                            "TES No": savedOC.tesNo,
                            Course: savedOC.course,
                            PI: savedOC.pi,
                            "Date of Arrival": savedOC.dtOfArr,
                            Relegated: savedOC.relegated,
                            "Withdrawn On": savedOC.withdrawnOn,
                            "Date of Passing Out": savedOC.dtOfPassingOut,
                            "IC No": savedOC.icNo,
                            "Order of Merit": savedOC.orderOfMerit,
                            "Regt/Arm": savedOC.regtArm,
                            "Posted/Attached To": savedOC.postedAtt,
                          }).map(([label, value]) => (
                            <p key={label}>
                              <strong>{label}:</strong> {value || "-"}
                            </p>
                          ))}
                        </div>
                      </Card>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

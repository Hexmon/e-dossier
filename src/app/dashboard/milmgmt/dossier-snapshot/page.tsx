"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { useSelector } from "react-redux";
import { RootState } from "@/store";

import { AppSidebar } from "@/components/AppSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/layout/PageHeader";
import BreadcrumbNav from "@/components/layout/BreadcrumbNav";
import SelectedCadetTable from "@/components/cadet_table/SelectedCadetTable";
import { SidebarProvider } from "@/components/ui/sidebar";

interface OfficerCadetForm {
  arrivalPhoto: FileList | null;
  departurePhoto: FileList | null;
  tesNo: string;
  name: string;
  course: string;
  pi: string;
  dtOfArr: string;
  relegated: string;
  withdrawnOn: string;
  dtOfPassingOut: string;
  icNo: string;
  orderOfMerit: string;
  regtArm: string;
  postedAtt: string;
}

export default function DossierSnapshot() {
  const router = useRouter();
  const selectedCadet = useSelector((state: RootState) => state.cadet.selectedCadet);

  const { register, handleSubmit, reset, watch } = useForm<OfficerCadetForm>({
    defaultValues: {
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
    },
  });

  const [savedData, setSavedData] = useState<OfficerCadetForm | null>(null);

  const handleLogout = () => {
    router.push("/login");
    console.log("Logout clicked");
  };

  const onSubmit = (data: OfficerCadetForm) => {
    console.log("Form Submitted:", data);
    setSavedData(data);
    reset();
  };

  const arrivalPhoto = watch("arrivalPhoto");
  const departurePhoto = watch("departurePhoto");

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

          {/* Main */}
          <main className="flex-1 p-6">
            <BreadcrumbNav
              paths={[
                { label: "Dashboard", href: "/dashboard" },
                { label: "Dossier", href: "/dashboard/milmgmt" },
                { label: "Dossier Snapshot" },
              ]}
            />

            {selectedCadet && (
              <div className="hidden md:flex sticky top-16 z-40">
                <SelectedCadetTable selectedCadet={selectedCadet} />
              </div>
            )}

            {/* Form Card */}
            <div className="w-full mx-auto p-6">
              <Card className="shadow-lg rounded-2xl border">
                <CardHeader>
                  <CardTitle className="text-xl font-bold">Officer Cadet Form</CardTitle>
                </CardHeader>

                <CardContent>
                  <Tabs defaultValue="form">
                    <TabsList className="mb-6">
                      <TabsTrigger value="form">Fill Form</TabsTrigger>
                      <TabsTrigger value="preview">Preview Data</TabsTrigger>
                    </TabsList>

                    {/* === Form === */}
                    <TabsContent value="form">
                      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        {/* Photos */}
                        <div className="grid grid-cols-2 gap-6">
                          <div className="flex flex-col items-center border p-4 rounded-lg">
                            <Label>Arrival (Civil Dress)</Label>
                            <Input type="file" accept="image/*" {...register("arrivalPhoto")} />
                          </div>

                          <div className="flex flex-col items-center border p-4 rounded-lg">
                            <Label>Departure (Uniform)</Label>
                            <Input type="file" accept="image/*" {...register("departurePhoto")} />
                          </div>
                        </div>

                        {/* Pre-Commissioning */}
                        <h3 className="text-lg font-semibold bg-blue-100 px-4 py-1 rounded-2xl">
                          Pre-Commissioning TRG PH-I
                        </h3>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>TES No</Label>
                            <Input {...register("tesNo")} />
                          </div>
                          <div>
                            <Label>Name</Label>
                            <Input {...register("name")} />
                          </div>
                          <div>
                            <Label>Course</Label>
                            <Input {...register("course")} />
                          </div>
                          <div>
                            <Label>PI</Label>
                            <Input {...register("pi")} />
                          </div>
                          <div>
                            <Label>Date of Arrival</Label>
                            <Input type="date" {...register("dtOfArr")} />
                          </div>
                          <div>
                            <Label>Relegated to Course & Date</Label>
                            <Input {...register("relegated")} />
                          </div>
                          <div>
                            <Label>Withdrawn On</Label>
                            <Input type="date" {...register("withdrawnOn")} />
                          </div>
                        </div>

                        {/* Commissioning */}
                        <h3 className="text-lg font-semibold bg-blue-100 px-4 py-1 rounded-2xl">
                          Commissioning Details
                        </h3>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Date of Passing Out</Label>
                            <Input type="date" {...register("dtOfPassingOut")} />
                          </div>
                          <div>
                            <Label>IC No</Label>
                            <Input {...register("icNo")} />
                          </div>
                          <div>
                            <Label>Order of Merit</Label>
                            <Input {...register("orderOfMerit")} />
                          </div>
                          <div>
                            <Label>Regt/Arm Allotted</Label>
                            <Input {...register("regtArm")} />
                          </div>
                          <div className="col-span-2">
                            <Label>Posted/Attached To (Unit & Location)</Label>
                            <Input {...register("postedAtt")} />
                          </div>
                        </div>

                        <div className="flex justify-center mt-6 gap-4">
                          <Button type="submit" className="w-40">
                            Save
                          </Button>
                          <Button type="button" variant="outline" className="w-40" onClick={() => reset()}>
                            Reset
                          </Button>
                        </div>
                      </form>
                    </TabsContent>

                    {/* === Preview === */}
                    <TabsContent value="preview">
                      {savedData ? (
                        <Card className="p-6 bg-gray-50 border rounded-lg">
                          <h3 className="text-lg font-semibold mb-4">Preview</h3>

                          <div className="grid grid-cols-2 gap-6 mb-6">
                            {savedData.arrivalPhoto?.[0] ? (
                              <div className="flex flex-col items-center">
                                <img
                                  src={URL.createObjectURL(savedData.arrivalPhoto[0])}
                                  alt="Arrival"
                                  className="h-32 w-32 object-cover rounded border"
                                />
                                <p className="mt-2 text-sm text-gray-600">Arrival (Civil Dress)</p>
                              </div>
                            ) : (
                              <p className="text-gray-500 italic">No arrival photo</p>
                            )}

                            {savedData.departurePhoto?.[0] ? (
                              <div className="flex flex-col items-center">
                                <img
                                  src={URL.createObjectURL(savedData.departurePhoto[0])}
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
                              Name: savedData.name,
                              "TES No": savedData.tesNo,
                              Course: savedData.course,
                              PI: savedData.pi,
                              "Date of Arrival": savedData.dtOfArr,
                              Relegated: savedData.relegated,
                              "Withdrawn On": savedData.withdrawnOn,
                              "Date of Passing Out": savedData.dtOfPassingOut,
                              "IC No": savedData.icNo,
                              "Order of Merit": savedData.orderOfMerit,
                              "Regt/Arm": savedData.regtArm,
                              "Posted/Attached To": savedData.postedAtt,
                            }).map(([label, value]) => (
                              <p key={label}>
                                <strong>{label}:</strong> {value || "-"}
                              </p>
                            ))}
                          </div>
                        </Card>
                      ) : (
                        <p className="text-gray-500 italic text-center">
                          No data saved yet. Fill and save the form first.
                        </p>
                      )}
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

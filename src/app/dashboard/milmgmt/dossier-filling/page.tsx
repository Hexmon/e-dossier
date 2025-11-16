"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { useSelector } from "react-redux";
import { RootState } from "@/store";

import DashboardLayout from "@/components/layout/DashboardLayout";
import BreadcrumbNav from "@/components/layout/BreadcrumbNav";
import SelectedCadetTable from "@/components/cadet_table/SelectedCadetTable";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { useState } from "react";
import { DossierFormData } from "@/types/dossierFilling";


export default function DossierFilling() {
  const router = useRouter();
  const selectedCadet = useSelector((state: RootState) => state.cadet.selectedCadet);

  const { register, handleSubmit, reset } = useForm<DossierFormData>({
    defaultValues: {
      initiatedBy: "",
      openedOn: "",
      initialInterview: "",
      closedBy: "",
      closedOn: "",
      finalInterview: "",
    },
  });

  const [savedDossier, setSavedDossier] = useState<DossierFormData | null>(null);

  const onSubmit = (data: DossierFormData) => {
    setSavedDossier(data);
    alert("Dossier saved successfully!");
    reset();
  };

  return (
    <DashboardLayout
      title="Dossier Filling"
      description="Record, maintain, and fill cadet dossiers for documentation."
    >
      <main className="p-6">
        {/* Breadcrumb */}
        <BreadcrumbNav
          paths={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Dossier", href: "/dashboard/milmgmt" },
            { label: "Dossier Filling" },
          ]}
        />

        {/* Selected Cadet */}
        {selectedCadet && (
          <div className="hidden md:flex sticky top-16 z-40 mb-6">
            <SelectedCadetTable selectedCadet={selectedCadet} />
          </div>
        )}

        {/* Dossier Form */}
        <Card className="shadow-lg rounded-xl p-6 border border-border mt-6">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-primary">
              Dossier Details
            </CardTitle>
          </CardHeader>

          <CardContent>
            <Tabs defaultValue="form">
              <TabsList className="mb-6">
                <TabsTrigger
                  value="form"
                  className="border border-gray-300 text-blue-700 data-[state=inactive]:bg-blue-100 data-[state=active]:bg-white data-[state=active]:border-primary rounded-md px-3 py-2 transition-colors"
                >
                  Fill Form
                </TabsTrigger>
                <TabsTrigger
                  value="view"
                  className="border border-gray-300 text-blue-700 data-[state=inactive]:bg-blue-100 data-[state=active]:bg-white data-[state=active]:border-primary rounded-md px-3 py-2 transition-colors"
                >
                  View Data
                </TabsTrigger>
              </TabsList>

              {/* FORM TAB */}
              <TabsContent value="form">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Initiated By</label>
                      <Input placeholder="Enter your name" {...register("initiatedBy")} />
                    </div>

                    <div>
                      <label className="text-sm font-medium">Opened On</label>
                      <Input type="date" {...register("openedOn")} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Initial Interview</label>
                    <Textarea
                      placeholder="Enter initial interview notes..."
                      className="min-h-[100px]"
                      {...register("initialInterview")}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Closed By</label>
                      <Input placeholder="Enter your name" {...register("closedBy")} />
                    </div>

                    <div>
                      <label className="text-sm font-medium">Closed On</label>
                      <Input type="date" {...register("closedOn")} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Final Interview</label>
                    <Textarea
                      placeholder="Enter final interview notes..."
                      className="min-h-[100px]"
                      {...register("finalInterview")}
                    />
                  </div>

                  <div className="flex justify-end gap-2 mt-6">
                    <Button variant="outline" type="button" onClick={() => reset()}>
                      Reset
                    </Button>
                    <Button type="submit">Save</Button>
                  </div>
                </form>
              </TabsContent>

              {/* VIEW TAB */}
              <TabsContent value="view">
                <Card className="p-6 border rounded-lg bg-gray-50">
                  <h3 className="text-lg font-semibold mb-4">Saved Dossier Data</h3>

                  {savedDossier ? (
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <p><strong>Initiated By:</strong> {savedDossier.initiatedBy}</p>
                      <p><strong>Opened On:</strong> {savedDossier.openedOn}</p>

                      <p className="col-span-2">
                        <strong>Initial Interview:</strong> {savedDossier.initialInterview}
                      </p>

                      <p><strong>Closed By:</strong> {savedDossier.closedBy}</p>
                      <p><strong>Closed On:</strong> {savedDossier.closedOn}</p>

                      <p className="col-span-2">
                        <strong>Final Interview:</strong> {savedDossier.finalInterview}
                      </p>
                    </div>
                  ) : (
                    <p className="text-gray-500 italic">No dossier data saved yet.</p>
                  )}
                </Card>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </main>
    </DashboardLayout>
  );
}

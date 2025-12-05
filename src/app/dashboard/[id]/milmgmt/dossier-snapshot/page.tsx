"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

import DashboardLayout from "@/components/layout/DashboardLayout";
import BreadcrumbNav from "@/components/layout/BreadcrumbNav";
import SelectedCadetTable from "@/components/cadet_table/SelectedCadetTable";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import DossierTab from "@/components/Tabs/DossierTab";
import { dossierTabs, militaryTrainingCards } from "@/config/app.config";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Shield, ChevronDown } from "lucide-react";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

import { useOcDetails } from "@/hooks/useOcDetails";

import type { OfficerCadetForm } from "@/types/dossierSnap";
import OfficerCadetFormComponent from "@/components/dossier/OfficerCadetForm";

export default function DossierSnapshotPage() {
  const { id } = useParams();
  const ocId = Array.isArray(id) ? id[0] : id ?? "";

  const { cadet } = useOcDetails(ocId);

  const {
    name = "",
    courseName = "",
    ocNumber = "",
    ocId: cadetOcId = ocId,
    course = "",
  } = cadet ?? {};

  const selectedCadet = { name, courseName, ocNumber, ocId: cadetOcId, course };

  const [savedData, setSavedData] = useState<OfficerCadetForm | null>(null);

  useEffect(() => {
    setSavedData(null);
  }, [ocId]);

  return (
    <DashboardLayout title="Dossier Snapshot" description="Quickly view and analyze OC details">
      <main className="p-6">
        <BreadcrumbNav
          paths={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Dossier", href: `/dashboard/${ocId}/milmgmt` },
            { label: "Dossier Snapshot" },
          ]}
        />

        {selectedCadet && (
          <div className="hidden md:flex sticky top-16 z-40 mb-6">
            <SelectedCadetTable selectedCadet={selectedCadet} />
          </div>
        )}

        <DossierTab tabs={dossierTabs} defaultValue="dossier-snapshot" ocId={ocId}>
          <TabsContent value="dossier-snapshot">
            <section className="p-6">
              <Card className="max-w-5xl mx-auto shadow-lg rounded-2xl">
                <CardHeader>
                  <CardTitle className="text-xl font-bold text-center">Officer Cadet Form</CardTitle>
                </CardHeader>

                <CardContent>
                  {/* TABS FOR FORM + PREVIEW */}
                  <Tabs defaultValue="dossier-snapshot" className="w-full">

                    {/* === FORM TAB === */}
                    <TabsContent value="form">
                      <OfficerCadetFormComponent
                        initialValues={null}
                        onSave={(data) => setSavedData(data)}
                      />
                    </TabsContent>

                  </Tabs>
                </CardContent>
              </Card>
            </section>
          </TabsContent>
        </DossierTab>
      </main>
    </DashboardLayout>
  );
}


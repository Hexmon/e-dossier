"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";

import DashboardLayout from "@/components/layout/DashboardLayout";
import BreadcrumbNav from "@/components/layout/BreadcrumbNav";
import SelectedCadetTable from "@/components/cadet_table/SelectedCadetTable";
import DossierTab from "@/components/Tabs/DossierTab";
import { dossierTabs } from "@/config/app.config";
import { TabsContent } from "@/components/ui/tabs";

import { useOcDetails } from "@/hooks/useOcDetails";
import DossierFillingForm from "@/components/dossier/DossierFillingForm";

export default function DossierFillingPage() {
  // route param -> ocId
  const { id } = useParams();
  const ocId = Array.isArray(id) ? id[0] : id ?? "";

  // load cadet via hook
  const { cadet } = useOcDetails(ocId);

  const {
    name = "",
    courseName = "",
    ocNumber = "",
    ocId: cadetOcId = ocId,
    course = "",
  } = cadet ?? {};

  const selectedCadet = { name, courseName, ocNumber, ocId: cadetOcId, course };

  return (
    <DashboardLayout title="Dossier Filling" description="Record, maintain, and fill cadet dossiers for documentation.">
      <main className="p-6">
        <BreadcrumbNav
          paths={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Dossier", href: `/dashboard/${ocId}/milmgmt` },
            { label: "Dossier Filling" },
          ]}
        />

        {/* Selected Cadet */}
        {selectedCadet && (
          <div className="hidden md:flex sticky top-16 z-40 mb-6">
            <SelectedCadetTable selectedCadet={selectedCadet} />
          </div>
        )}

        <DossierTab tabs={dossierTabs} defaultValue="dossier-filling" ocId={ocId}>
          <TabsContent value="dossier-filling">
            <section className="p-6">
              <DossierFillingForm ocId={ocId} />
            </section>
          </TabsContent>
        </DossierTab>
      </main>
    </DashboardLayout>
  );
}
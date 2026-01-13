"use client";

import { useParams } from "next/navigation";

import DashboardLayout from "@/components/layout/DashboardLayout";
import BreadcrumbNav from "@/components/layout/BreadcrumbNav";
import SelectedCadetTable from "@/components/cadet_table/SelectedCadetTable";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import DossierTab from "@/components/Tabs/DossierTab";
import { dossierTabs } from "@/config/app.config";

import { Tabs, TabsContent } from "@/components/ui/tabs";

import { useOcDetails } from "@/hooks/useOcDetails";

import OfficerCadetFormComponent from "@/components/dossier/OfficerCadetFormComponent";

export default function DossierSnapshotPage() {
  const { id } = useParams();
  const ocId = Array.isArray(id) ? id[0] : id ?? "";

  const { cadet } = useOcDetails(ocId);

  const selectedCadet = cadet ? {
    name: cadet.name,
    courseName: cadet.courseName,
    ocNumber: cadet.ocNumber,
    ocId: cadet.ocId,
    course: cadet.course,
  } : null;

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
                  <OfficerCadetFormComponent ocId={ocId} />
                </CardContent>
              </Card>
            </section>
          </TabsContent>
        </DossierTab>
      </main>
    </DashboardLayout>
  );
}
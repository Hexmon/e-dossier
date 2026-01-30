"use client";

import React from "react";
import { useParams } from "next/navigation";
import { useOcDetails } from "@/hooks/useOcDetails";
import DashboardLayout from "@/components/layout/DashboardLayout";

import BreadcrumbNav from "@/components/layout/BreadcrumbNav";
import SelectedCadetTable from "@/components/cadet_table/SelectedCadetTable";
import DossierTab from "@/components/Tabs/DossierTab";
import { dossierTabs, militaryTrainingCards } from "@/config/app.config";
import { DropdownMenu } from "@radix-ui/react-dropdown-menu";
import { DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Shield, ChevronDown } from "lucide-react";
import { TabsContent, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import PhysicalForm from "@/components/physic-training/PhysicalForm";

export default function PhysicalTrainingPage() {
  const params = useParams();
  // Handle both 'id' and 'ocId' param names
  const paramId = params?.ocId || params?.id;
  const ocId = Array.isArray(paramId) ? paramId[0] : paramId ?? "";
  const { cadet } = useOcDetails(ocId);

  return (
    <DashboardLayout
      title="Physical Training"
      description="Record and manage cadet physical training details."
    >
      <main className="p-6">
        <BreadcrumbNav
          paths={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Dossier", href: `/dashboard/${ocId}/milmgmt` },
            { label: "Physical Training" },
          ]}
        />

        {cadet ? (
          <SelectedCadetTable
            selectedCadet={{
              name: cadet.name ?? "",
              courseName: cadet.courseName ?? "",
              ocNumber: cadet.ocNumber ?? "",
              ocId: cadet.ocId ?? "",
              course: cadet.course ?? "",
            }}
          />
        ) : (
          <SelectedCadetTable
            selectedCadet={{
              name: "",
              courseName: "",
              ocNumber: "",
              ocId: ocId,
              course: "",
            }}
          />
        )}

        <DossierTab
          tabs={dossierTabs}
          defaultValue="physical-training"
          ocId={ocId}
          extraTabs={
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <TabsTrigger value="miltrg" className="flex items-center gap-2">
                  <Shield className="h-4 w-4" /> Mil-Trg
                  <ChevronDown className="h-4 w-4" />
                </TabsTrigger>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-96 max-h-64 overflow-y-auto">
                {militaryTrainingCards.map((card) => {
                  const { to, color, title } = card;
                  if (!to) return null;
                  const href = to(ocId);
                  return (
                    <DropdownMenuItem key={title} asChild>
                      <a href={href} className="flex items-center gap-2">
                        <card.icon className={`h-4 w-4 ${color}`} />
                        <span>{title}</span>
                      </a>
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          }
        >
          <TabsContent value="physical-training">
            <Card className="max-w-6xl mx-auto p-6 rounded-2xl shadow-xl bg-white">
              <CardHeader>
                <CardTitle className="text-lg font-bold text-center text-primary">
                  Physical Training
                </CardTitle>
              </CardHeader>
              <CardContent>
                <PhysicalForm ocId={ocId} />
              </CardContent>
            </Card>
          </TabsContent>
        </DossierTab>
      </main>
    </DashboardLayout>
  );
}
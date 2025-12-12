// app/dashboard/[id]/performance/page.tsx
"use client";

import React from "react";
import { useParams } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import BreadcrumbNav from "@/components/layout/BreadcrumbNav";
import { data } from "@/components/performance_graph/Data";
import PerformanceGraphs from "@/components/performance_graph/PerformanceGraphs";
import SelectedCadetTable from "@/components/cadet_table/SelectedCadetTable";
import { useOcDetails } from "@/hooks/useOcDetails";
import { dossierTabs, militaryTrainingCards } from "@/config/app.config";
import DossierTab from "@/components/Tabs/DossierTab";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Shield, ChevronDown } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { TabsContent } from "@radix-ui/react-tabs";
import { Link } from "lucide-react";

export default function PerformanceGraphPage() {
  const { id } = useParams();
  const ocId = Array.isArray(id) ? id[0] : id ?? "";
  const { cadet } = useOcDetails(ocId);
  const performanceData = data(ocId);

  return (
    <DashboardLayout title="Performance Graph" description="Performance Graph">
      <main className="p-6">
        <BreadcrumbNav
          paths={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Dossier", href: `/dashboard/${id}/milmgmt` },
            { label: "Performance Graph" },
          ]}
        />

        {cadet && (
          <div className="hidden md:flex sticky top-16 z-40 mb-6">
            <SelectedCadetTable
              selectedCadet={cadet}
              academicsData={performanceData?.academics ?? []}
              olqData={performanceData?.olq ?? []}
              odtData={performanceData?.odt ?? []}
              disciplineData={performanceData?.discipline ?? []}
            />
          </div>
        )}

        <DossierTab
          tabs={dossierTabs}
          defaultValue="performance-graph"
          ocId={ocId}
          extraTabs={
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Mil-Trg
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>

              <DropdownMenuContent className="w-96 max-h-64 overflow-y-auto">
                {militaryTrainingCards.map(({ title, icon: Icon, color, to }) => {
                  const link = to(ocId);
                  return (
                    <DropdownMenuItem key={title} asChild>
                      {/* Note: using Link from next/navigation */}
                      <a href={link} className="flex items-center gap-2">
                        <Icon className={`h-4 w-4 ${color}`} />
                        {title}
                      </a>
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          }
        >
          <TabsContent value="performance-graph">
            <Card className="max-w-6xl mx-auto p-6 rounded-2xl shadow-xl bg-white">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-center text-primary">
                  PERFORMANCE GRAPH
                </CardTitle>
              </CardHeader>

              {/* Reuse same PerformanceGraphs component (page) */}
              <PerformanceGraphs
                academicsData={performanceData?.academics ?? []}
                olqData={performanceData?.olq ?? []}
                odtData={performanceData?.odt ?? []}
                disciplineData={performanceData?.discipline ?? []}
              />
            </Card>
          </TabsContent>
        </DossierTab>
      </main>
    </DashboardLayout>
  );
}

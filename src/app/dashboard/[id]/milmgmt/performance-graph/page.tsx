"use client";

import React from "react";
import { useParams } from "next/navigation";
import { useOcDetails } from "@/hooks/useOcDetails";
import DashboardLayout from "@/components/layout/DashboardLayout";
import BreadcrumbNav from "@/components/layout/BreadcrumbNav";
import SelectedCadetTable from "@/components/cadet_table/SelectedCadetTable";
import { dossierTabs, militaryTrainingCards } from "@/config/app.config";
import DossierTab from "@/components/Tabs/DossierTab";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Shield, ChevronDown, Link } from "lucide-react";
import Graph from "@/components/performance_graph/Graph";
import OlqGraph from "@/components/performance_graph/OLQ_Graph";
import { TabsContent } from "@radix-ui/react-tabs";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import OdtGraph from "@/components/performance_graph/ODT_Graph";
import DisciplineGraph from "@/components/performance_graph/Discipline";
// import MedGraph from "@/components/performance_graph/Med_Graph";
import { data } from "@/components/performance_graph/Data";

export default function PerformanceGraphPage() {

    const { id } = useParams();
    const ocId = Array.isArray(id) ? id[0] : id ?? "";
    const { cadet } = useOcDetails(ocId);



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
                        <SelectedCadetTable selectedCadet={cadet} />
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
                                            <Link href={link} className="flex items-center gap-2">
                                                <Icon className={`h-4 w-4 ${color}`} />
                                                {title}
                                            </Link>
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
                            <Graph data={data(ocId)?.academics ?? []} />
                            <OlqGraph data={data(ocId)?.olq ?? []} />
                            <OdtGraph data={data(ocId)?.odt ?? []} />
                            <DisciplineGraph data={data(ocId)?.discipline ?? []} />
                            {/* <MedGraph /> */}
                        </Card>
                    </TabsContent>
                   
                </DossierTab>
            </main>
        </DashboardLayout>        
    );
}

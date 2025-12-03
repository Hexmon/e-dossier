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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

import { Shield, ChevronDown, Settings } from "lucide-react";
import { dossierTabs, militaryTrainingCards } from "@/config/app.config";
import DossierTab from "@/components/Tabs/DossierTab";

import { useEffect, useState } from "react";
import { createOCInsp, getOCInsp } from "@/app/lib/api/ocInsp";
import { InspFormData } from "@/types/dossierInsp";

export default function DossierInspSheetPage() {
    const router = useRouter();
    const selectedCadet = useSelector((state: RootState) => state.cadet.selectedCadet);

    const userRole = "Pl Cdr";
    const ROLES = ["Pl Cdr", "DS Coord", "Cdr"];

    const [inspData, setInspData] = useState<Record<string, InspFormData>>({
        "Pl Cdr": {} as InspFormData,
        "DS Coord": {} as InspFormData,
        "Cdr": {} as InspFormData,
    });

    const { register, handleSubmit, reset } = useForm<InspFormData>({
        defaultValues: {
            date: "",
            rk: "",
            name: "",
            appointment: "",
            remarks: "",
            initials: "",
        },
    });

    const onSubmit = async (data: InspFormData) => {
        if (!selectedCadet?.ocId) {
            alert("No cadet selected");
            return;
        }

        try {
            const saved = await createOCInsp(selectedCadet.ocId, data);

            setInspData((prev) => ({
                ...prev,
                [userRole]: data,
            }));

            alert(`Inspection data saved for ${userRole}`);
            reset();
        } catch (err) {
            console.error("Failed to save inspection:", err);
            alert("Failed to save inspection record.");
        }
    };

    useEffect(() => {
        if (!selectedCadet?.ocId) return;

        (async () => {
            try {
                const records = await getOCInsp(selectedCadet.ocId);

                if (!Array.isArray(records)) return;

                const updated = { ...inspData };
                records.forEach((record) => {
                    const role = record.appointment || "Pl Cdr";
                    updated[role] = {
                        date: record.date,
                        rk: record.rk,
                        name: record.name,
                        appointment: record.appointment,
                        remarks: record.remarks,
                        initials: record.initials,
                    };
                });

                setInspData(updated);
            } catch (err) {
                console.error("Failed to load insp data:", err);
            }
        })();
    }, [selectedCadet]);

    return (
        <DashboardLayout
            title="Dossier Insp Sheet"
            description="Maintain and review cadet inspection details for evaluation and documentation."
        >
            <main className="p-6">
                {/* Breadcrumb */}
                <BreadcrumbNav
                    paths={[
                        { label: "Dashboard", href: "/dashboard" },
                        { label: "Dossier", href: "/dashboard/milmgmt" },
                        { label: "Dossier Insp" },
                    ]}
                />

                {selectedCadet && (
                    <div className="hidden md:flex sticky top-16 z-40 mb-6">
                        <SelectedCadetTable selectedCadet={selectedCadet} />
                    </div>
                )}

                {/* Dossier Tabs */}
                <DossierTab
                    tabs={dossierTabs}
                    defaultValue="dossier-insp"
                    extraTabs={
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <TabsTrigger
                                    value="dossier-insp"
                                    className="flex items-center gap-2 border border-transparent hover:!border-blue-700"
                                >
                                    <Shield className="h-4 w-4" />
                                    Mil-Trg
                                    <ChevronDown className="h-4 w-4" />
                                </TabsTrigger>
                            </DropdownMenuTrigger>

                            <DropdownMenuContent className="w-96 max-h-64 overflow-y-auto">
                                {militaryTrainingCards.map((card) => (
                                    <DropdownMenuItem key={card.to} asChild>
                                        <a href={card.to} className="flex items-center gap-2 w-full">
                                            <card.icon className={`h-4 w-4 ${card.color}`} />
                                            {card.title}
                                        </a>
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    }
                >
                    {/* Main Content */}
                    <TabsContent value="dossier-insp" className="space-y-6">
                        <Card className="shadow-lg rounded-xl border p-6">
                            <CardHeader>
                                <CardTitle className="text-lg font-semibold text-primary">
                                    Dossier Inspection — {userRole}
                                </CardTitle>
                                <p className="text-sm text-muted-foreground">
                                    Fill inspection details as {userRole} or view inspection summary.
                                </p>
                            </CardHeader>

                            <CardContent>
                                <Tabs defaultValue="fill">
                                    <TabsList className="mb-4">
                                        <TabsTrigger value="fill" className="border text-blue-700 px-3 py-2">
                                            Fill Form
                                        </TabsTrigger>
                                        <TabsTrigger value="preview" className="border text-blue-700 px-3 py-2">
                                            Preview All
                                        </TabsTrigger>
                                    </TabsList>

                                    {/* Fill Form */}
                                    <TabsContent value="fill" className="space-y-6">
                                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                                <div>
                                                    <label className="text-sm font-medium">Date</label>
                                                    <Input type="date" {...register("date")} className="mt-1" />
                                                </div>
                                                <div>
                                                    <label className="text-sm font-medium">Rank</label>
                                                    <Input {...register("rk")} placeholder="Rank" className="mt-1" />
                                                </div>
                                                <div>
                                                    <label className="text-sm font-medium">Name</label>
                                                    <Input {...register("name")} placeholder="Name" className="mt-1" />
                                                </div>
                                            </div>

                                            <div>
                                                <label className="text-sm font-medium">Appointment</label>
                                                <Input {...register("appointment")} className="mt-1" />
                                            </div>

                                            <div>
                                                <label className="text-sm font-medium">Remarks</label>
                                                <Textarea {...register("remarks")} className="mt-1 min-h-[100px]" />
                                            </div>

                                            <div>
                                                <label className="text-sm font-medium">Initials</label>
                                                <Textarea {...register("initials")} className="mt-1 min-h-[80px]" />
                                            </div>

                                            <div className="flex justify-end gap-3">
                                                <Button variant="outline" type="button" onClick={() => reset()}>
                                                    Reset
                                                </Button>
                                                <Button type="submit">Save</Button>
                                            </div>
                                        </form>
                                    </TabsContent>

                                    {/* Preview All */}
                                    <TabsContent value="preview">
                                        <div className="space-y-4">
                                            {ROLES.map((role) => (
                                                <div key={role} className="bg-gray-50 border rounded-lg p-4">
                                                    <h4 className="font-semibold text-primary">{role}</h4>

                                                    {inspData[role]?.name ? (
                                                        <>
                                                            <p><strong>Date:</strong> {inspData[role].date}</p>
                                                            <p><strong>Rank:</strong> {inspData[role].rk}</p>
                                                            <p><strong>Name:</strong> {inspData[role].name}</p>
                                                            <p><strong>Appointment:</strong> {inspData[role].appointment}</p>
                                                            <p><strong>Remarks:</strong> {inspData[role].remarks}</p>
                                                            <p><strong>Initials:</strong> {inspData[role].initials}</p>
                                                        </>
                                                    ) : (
                                                        <p className="text-muted-foreground italic">No data yet.</p>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </TabsContent>
                                </Tabs>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Settings Tab */}
                    <TabsContent value="settings">
                        <div className="text-center py-12">
                            <Settings className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                            <h3 className="text-xl font-semibold">General Settings</h3>
                            <p className="text-muted-foreground">
                                Manage system roles, permissions, and general configurations.
                            </p>
                        </div>
                    </TabsContent>
                </DossierTab>
            </main>
        </DashboardLayout>
    );
}
"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { useSelector } from "react-redux";
import { RootState } from "@/store";

import { AppSidebar } from "@/components/AppSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SidebarProvider } from "@/components/ui/sidebar";
import BreadcrumbNav from "@/components/layout/BreadcrumbNav";
import { PageHeader } from "@/components/layout/PageHeader";
import SelectedCadetTable from "@/components/cadet_table/SelectedCadetTable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Shield, ChevronDown, Settings } from "lucide-react";
import { dossierTabs, militaryTrainingCards } from "@/config/app.config";

import { useState } from "react";
import DossierTab from "@/components/Tabs/DossierTab";

interface InspFormData {
    date: string;
    rk: string;
    name: string;
    appointment: string;
    remarks: string;
    initials: string;
}

export default function DossierInspSheetPage() {
    const router = useRouter();
    const selectedCadet = useSelector((state: RootState) => state.cadet.selectedCadet);

    const userRole = "Pl Cdr"; // Example roles: "Pl Cdr", "DS Coord", "Cdr"
    const ROLES = ["Pl Cdr", "DS Coord", "Cdr"];

    const [inspData, setInspData] = useState<Record<string, InspFormData>>({
        "Pl Cdr": {} as InspFormData,
        "DS Coord": {} as InspFormData,
        "Cdr": {} as InspFormData,
    });

    const { register, handleSubmit, reset, watch } = useForm<InspFormData>({
        defaultValues: {
            date: "",
            rk: "",
            name: "",
            appointment: "",
            remarks: "",
            initials: "",
        },
    });

    const handleLogout = () => {
        router.push("/login");
        console.log("Logout clicked");
    };

    const onSubmit = (data: InspFormData) => {
        setInspData((prev) => ({
            ...prev,
            [userRole]: data,
        }));
        alert(`Inspection data saved for ${userRole}`);
        reset();
    };

    return (
        <SidebarProvider>
            <div className="min-h-screen flex w-full bg-background">
                <AppSidebar />

                <div className="flex-1 flex flex-col">
                    {/* Header */}
                    <header className="h-16 border-b border-border bg-card/50 backdrop-blur sticky top-0 z-50">
                        <PageHeader
                            title="Dossier Insp Sheet"
                            description="Maintain and review cadet dossiers, record inspection notes, and track progress for evaluation and documentation."
                            onLogout={handleLogout}
                        />
                    </header>

                    {/* Main Content */}
                    <main className="flex-1 p-6">
                        <BreadcrumbNav
                            paths={[
                                { label: "Dashboard", href: "/dashboard" },
                                { label: "Dossier", href: "/dashboard/milmgmt" },
                                { label: "Dossier Insp" },
                            ]}
                        />

                        {/* Selected Cadet */}
                        <div className="hidden md:flex sticky top-16 z-40">
                            {selectedCadet && <SelectedCadetTable selectedCadet={selectedCadet} />}
                        </div>

                        {/* Tabs */}
                        <DossierTab
                            tabs={dossierTabs}
                            defaultValue="dossier-insp"
                            extraTabs={
                                <div className="flex items-center justify-center">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <TabsTrigger
                                                value="dossier-insp"
                                                className="flex items-center gap-2 border border-transparent hover:!border-blue-700"
                                            >
                                                <Shield className="h-4 w-4" />
                                                Mil-Trg
                                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                            </TabsTrigger>
                                        </DropdownMenuTrigger>

                                        <DropdownMenuContent className="w-96 max-h-64 overflow-y-auto">
                                            {militaryTrainingCards.map((card) => (
                                                <DropdownMenuItem key={card.to} asChild>
                                                    <a href={card.to} className="flex items-center gap-2 w-full">
                                                        <card.icon className={`h-4 w-4 ${card.color}`} />
                                                        <span>{card.title}</span>
                                                    </a>
                                                </DropdownMenuItem>
                                            ))}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            }
                        >
                            {/* Dossier Inspection Form */}
                            <TabsContent value="dossier-insp" className="space-y-6">
                                <Card className="shadow-lg rounded-xl border border-border p-6">
                                    <CardHeader>
                                        <CardTitle className="text-lg font-semibold text-primary">
                                            Dossier Inspection — {userRole}
                                        </CardTitle>
                                        <p className="text-sm text-muted-foreground">
                                            Fill inspection details as {userRole} or view full inspection summary.
                                        </p>
                                    </CardHeader>

                                    <CardContent>
                                        <Tabs defaultValue="fill" className="w-full">
                                            <TabsList className="mb-4">
                                                <TabsTrigger
                                                    value="fill"
                                                    className="border border-gray-300 text-blue-700 data-[state=inactive]:bg-blue-100 data-[state=active]:bg-white data-[state=active]:border-primary rounded-md px-3 py-2"
                                                >
                                                    Fill Form
                                                </TabsTrigger>
                                                <TabsTrigger
                                                    value="preview"
                                                    className="border border-gray-300 text-blue-700 data-[state=inactive]:bg-blue-100 data-[state=active]:bg-white data-[state=active]:border-primary rounded-md px-3 py-2"
                                                >
                                                    Preview All
                                                </TabsTrigger>
                                            </TabsList>

                                            {/* --- Fill Form --- */}
                                            <TabsContent value="fill" className="space-y-6">
                                                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                                        <div>
                                                            <label className="text-sm font-medium">Date</label>
                                                            <Input type="date" {...register("date")} className="mt-1" />
                                                        </div>
                                                        <div>
                                                            <label className="text-sm font-medium">Rank</label>
                                                            <Input
                                                                placeholder="Enter Rank"
                                                                {...register("rk")}
                                                                className="mt-1"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="text-sm font-medium">Name</label>
                                                            <Input
                                                                placeholder="Enter Name"
                                                                {...register("name")}
                                                                className="mt-1"
                                                            />
                                                        </div>
                                                    </div>

                                                    <div>
                                                        <label className="text-sm font-medium">Appointment</label>
                                                        <Input
                                                            placeholder="Enter Appointment"
                                                            {...register("appointment")}
                                                            className="mt-1"
                                                        />
                                                    </div>

                                                    <div>
                                                        <label className="text-sm font-medium">Remarks</label>
                                                        <Textarea
                                                            placeholder="Enter remarks..."
                                                            className="mt-1 min-h-[100px]"
                                                            {...register("remarks")}
                                                        />
                                                    </div>

                                                    <div>
                                                        <label className="text-sm font-medium">Initials</label>
                                                        <Textarea
                                                            placeholder="Enter initials..."
                                                            className="mt-1 min-h-[80px]"
                                                            {...register("initials")}
                                                        />
                                                    </div>

                                                    <div className="flex justify-end gap-3">
                                                        <Button variant="outline" type="button" onClick={() => reset()}>
                                                            Reset
                                                        </Button>
                                                        <Button type="submit">Save</Button>
                                                    </div>
                                                </form>
                                            </TabsContent>

                                            {/* --- Preview All --- */}
                                            <TabsContent value="preview">
                                                <div className="space-y-4">
                                                    {ROLES.map((role) => (
                                                        <div
                                                            key={role}
                                                            className="bg-gray-50 border rounded-lg p-4 space-y-1"
                                                        >
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
                                                                <p className="text-muted-foreground italic">
                                                                    No data submitted yet.
                                                                </p>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </TabsContent>
                                        </Tabs>
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            <TabsContent value="settings" className="space-y-6">
                                <div className="text-center py-12">
                                    <Settings className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                                    <h3 className="text-xl font-semibold text-foreground mb-2">
                                        General Settings
                                    </h3>
                                    <p className="text-muted-foreground">
                                        Manage system roles, permissions, and more.
                                    </p>
                                </div>
                            </TabsContent>
                        </DossierTab>
                    </main>
                </div>
            </div>
        </SidebarProvider>
    );
}

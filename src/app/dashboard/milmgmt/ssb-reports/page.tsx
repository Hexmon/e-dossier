"use client";

import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { AppSidebar } from "@/components/AppSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Shield, ChevronDown, Settings } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { dossierTabs, militaryTrainingCards } from "@/config/app.config";
import { Textarea } from "@/components/ui/textarea";
import BreadcrumbNav from "@/components/layout/BreadcrumbNav";
import SelectedCadetTable from "@/components/cadet_table/SelectedCadetTable";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import { PageHeader } from "@/components/layout/PageHeader";
import DossierTab from "@/components/Tabs/DossierTab";
import { SSBFormData } from "@/types/ssb-rpt";
import { getSsbReport, saveSsbReport, SsbReport, updateSsbReport } from "@/app/lib/api/ssbReportApi";
import { toast } from "sonner";
import { useEffect, useState } from "react";

export default function SSBReportPage() {
    const router = useRouter();
    const selectedCadet = useSelector((state: RootState) => state.cadet.selectedCadet);
    const [ssbReport, setSsbReport] = useState<SsbReport | null>(null);
    const [loading, setLoading] = useState(false);
    const [isEditingView, setIsEditingView] = useState(false);
    const [editForm, setEditForm] = useState<SsbReport | null>(null);


    const handleLogout = () => router.push("/login");

    const {
        control,
        handleSubmit,
        register,
        reset,
        watch,
    } = useForm<SSBFormData>({
        defaultValues: {
            positiveTraits: [{ trait: "" }],
            negativeTraits: [{ trait: "" }],
            rating: "",
            improvement: "",
        },
    });

    const {
        fields: positiveFields,
        append: addPositive,
        remove: removePositive,
    } = useFieldArray({ control, name: "positiveTraits" });

    const {
        fields: negativeFields,
        append: addNegative,
        remove: removeNegative,
    } = useFieldArray({ control, name: "negativeTraits" });

    const startEdit = () => {
        setEditForm(ssbReport);
        setIsEditingView(true);
    };

    const handleEditChange = (field: keyof SsbReport, value: any) => {
        setEditForm(prev => prev ? { ...prev, [field]: value } : prev);
    };

    const saveEdit = async () => {
        if (!selectedCadet?.ocId || !editForm) return;

        try {
            const response = await updateSsbReport(selectedCadet.ocId, editForm);

            if (response) {
                toast.success("SSB Report updated successfully!");
                setSsbReport(editForm);
                setIsEditingView(false);
            } else {
                toast.error("Failed to update SSB Report");
            }
        } catch (err) {
            toast.error("Error updating SSB report");
        }
    };

    const cancelEdit = () => {
        setIsEditingView(false);
        setEditForm(null);
    };


    const onSubmit = async (data: SSBFormData) => {
        if (!selectedCadet?.ocId) {
            toast.error("No cadet selected");
            return;
        }

        try {
            const payload = {
                positives: data.positiveTraits
                    .filter((t) => t.trait)
                    .map((t) => ({ note: t.trait, by: data.positiveBy })),
                negatives: data.negativeTraits
                    .filter((t) => t.trait)
                    .map((t) => ({ note: t.trait, by: data.negativeBy })),
                predictiveRating: Number(data.rating) || 0,
                scopeForImprovement: data.improvement,
            };

            const response = await saveSsbReport(selectedCadet.ocId, payload);
            if (response) {
                toast.success("SSB Report saved successfully!");
            } else {
                toast.warning("Unexpected response while saving report.");
            }
        } catch (err) {
            console.error("Error saving SSB Report:", err);
            toast.error("Failed to save SSB Report.");
        }
    };

    useEffect(() => {
        const fetchReport = async () => {
            if (!selectedCadet?.ocId) return;

            setLoading(true);
            const report = await getSsbReport(selectedCadet.ocId);
            console.log("view data", report);

            setSsbReport(report);
            setLoading(false);
        };

        fetchReport();
    }, [selectedCadet]);




    const savedData = watch();

    return (
        <SidebarProvider>
            <div className="min-h-screen flex w-full bg-background">
                <AppSidebar />
                <div className="flex-1 flex flex-col">
                    <PageHeader
                        title="SSB Report"
                        description="Document candidate performance, assess psychological, group, and interview outcomes, and compile structured evaluations."
                    />

                    <main className="flex-1 p-6">
                        <BreadcrumbNav
                            paths={[
                                { label: "Dashboard", href: "/dashboard" },
                                { label: "Dossier", href: "/dashboard/milmgmt" },
                                { label: "SSB Report" },
                            ]}
                        />

                        {selectedCadet && <SelectedCadetTable selectedCadet={selectedCadet} />}

                        <DossierTab
                            tabs={dossierTabs}
                            defaultValue="ssb-reports"
                            extraTabs={
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <TabsTrigger
                                            value="ssb-reports"
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
                            }
                        >
                            <TabsContent value="ssb-reports" className="space-y-6">
                                <Card className="shadow-lg rounded-xl p-6 border border-border w-full max-w-5xl mx-auto">
                                    <CardHeader>
                                        <CardTitle className="text-xl font-semibold text-primary text-center">
                                            SSB Report
                                        </CardTitle>
                                    </CardHeader>

                                    <CardContent>
                                        <Tabs defaultValue="form">
                                            <TabsList className="mb-6">
                                                <TabsTrigger value="form">Fill Form</TabsTrigger>
                                                <TabsTrigger value="view">View Data</TabsTrigger>
                                            </TabsList>

                                            {/* ---- Form ---- */}
                                            <TabsContent value="form">
                                                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                                                    {/* Positive Traits */}
                                                    <div className="grid grid-cols-2 gap-12">
                                                        <div>
                                                            <label className="text-sm font-medium">Positive Traits</label>
                                                            <div className="space-y-2 mt-2">
                                                                {positiveFields.map((field, index) => (
                                                                    <div key={field.id} className="flex items-center gap-2">
                                                                        <Input
                                                                            {...register(`positiveTraits.${index}.trait` as const)}
                                                                            placeholder={`Positive trait ${index + 1}`}
                                                                            className="flex-1"
                                                                        />
                                                                        <Button
                                                                            type="button"
                                                                            variant="destructive"
                                                                            size="sm"
                                                                            onClick={() => removePositive(index)}
                                                                        >
                                                                            Remove
                                                                        </Button>
                                                                    </div>
                                                                ))}
                                                                <Button
                                                                    type="button"
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => addPositive({ trait: "" })}
                                                                >
                                                                    + Add Positive Trait
                                                                </Button>
                                                            </div>
                                                        </div>

                                                        <div className="w-full max-w-sm">
                                                            <label className="text-sm font-medium">By</label>
                                                            <select
                                                                {...register("positiveBy")}
                                                                className="mt-1 w-full rounded-md border p-2 text-sm"
                                                                defaultValue=""
                                                            >
                                                                <option value="" disabled>Select</option>
                                                                <option value="IO">IO</option>
                                                                <option value="GTO">GTO</option>
                                                                <option value="Psy">Psy</option>
                                                                <option value="TO">TO</option>
                                                            </select>
                                                        </div>
                                                    </div>

                                                    {/* Negative Traits */}
                                                    <div className="grid grid-cols-2 gap-12">
                                                        <div>
                                                            <label className="text-sm font-medium">Negative Traits</label>
                                                            <div className="space-y-2 mt-2">
                                                                {negativeFields.map((field, index) => (
                                                                    <div key={field.id} className="flex items-center gap-2">
                                                                        <Input
                                                                            {...register(`negativeTraits.${index}.trait` as const)}
                                                                            placeholder={`Negative trait ${index + 1}`}
                                                                            className="flex-1"
                                                                        />
                                                                        <Button
                                                                            type="button"
                                                                            variant="destructive"
                                                                            size="sm"
                                                                            onClick={() => removeNegative(index)}
                                                                        >
                                                                            Remove
                                                                        </Button>
                                                                    </div>
                                                                ))}
                                                                <Button
                                                                    type="button"
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => addNegative({ trait: "" })}
                                                                >
                                                                    + Add Negative Trait
                                                                </Button>
                                                            </div>
                                                        </div>

                                                        <div className="w-full max-w-sm">
                                                            <label className="text-sm font-medium">By</label>
                                                            <select
                                                                {...register("negativeBy")}
                                                                className="mt-1 w-full rounded-md border p-2 text-sm"
                                                                defaultValue=""
                                                            >
                                                                <option value="" disabled>Select</option>
                                                                <option value="IO">IO</option>
                                                                <option value="GTO">GTO</option>
                                                                <option value="Psy">Psy</option>
                                                                <option value="TO">TO</option>
                                                            </select>
                                                        </div>
                                                    </div>

                                                    {/* Rating */}
                                                    <div className="grid grid-cols-2 gap-12">
                                                        <div>
                                                            <label className="text-sm font-medium">
                                                                Overall Predictive Rating as an Officer
                                                            </label>
                                                            <select
                                                                {...register("rating")}
                                                                className="mt-1 w-full rounded-md border p-2 text-sm"
                                                            >
                                                                <option value="">Select Rating</option>
                                                                <option value="OS">Outstanding (OS)</option>
                                                                <option value="WAA">Way Above Avg (WAA)</option>
                                                                <option value="AA">Above Avg (AA)</option>
                                                                <option value="JAA">Just Above Avg (JAA)</option>
                                                                <option value="HA">High Avg (HA)</option>
                                                                <option value="LA">Low Avg (LA)</option>
                                                                <option value="JBA">Just Below Avg (JBA)</option>
                                                                <option value="BA">Below Avg (BA)</option>
                                                                <option value="WBA">Way Below Avg (WBA)</option>
                                                                <option value="Poor">Poor</option>
                                                            </select>
                                                        </div>

                                                        <div className="w-full max-w-sm">
                                                            <label className="text-sm font-medium">By</label>
                                                            <select className="mt-1 w-full rounded-md border p-2 text-sm" defaultValue="">
                                                                <option value="" disabled>
                                                                    Select
                                                                </option>
                                                                <option value="IO">IO</option>
                                                                <option value="GTO">GTO</option>
                                                                <option value="Psy">Psy</option>
                                                                <option value="TO">TO</option>
                                                            </select>
                                                        </div>
                                                    </div>

                                                    {/* Scope of Improvement */}
                                                    <div>
                                                        <label className="text-sm font-medium">Scope of Improvement</label>
                                                        <Textarea
                                                            {...register("improvement")}
                                                            placeholder="Mention areas of improvement..."
                                                            className="mt-1 max-w-5xl"
                                                        />
                                                    </div>

                                                    {/* Buttons */}
                                                    <div className="flex justify-center gap-2">
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            onClick={() =>
                                                                reset({
                                                                    positiveTraits: [{ trait: "" }],
                                                                    negativeTraits: [{ trait: "" }],
                                                                    rating: "",
                                                                    improvement: "",
                                                                })
                                                            }
                                                        >
                                                            Reset
                                                        </Button>
                                                        <Button type="submit">Save</Button>
                                                    </div>
                                                </form>
                                            </TabsContent>

                                            {/* ---- View Data ---- */}
                                            <TabsContent value="view">
                                                <Card className="p-6 border rounded-lg bg-gray-50">
                                                    <h3 className="text-lg font-semibold mb-4 flex justify-between">
                                                        Saved SSB Report Data
                                                        {!isEditingView && ssbReport && (
                                                            <Button size="sm" onClick={startEdit}>
                                                                Edit
                                                            </Button>
                                                        )}
                                                    </h3>

                                                    {!ssbReport ? (
                                                        <p>No SSB Report Found.</p>
                                                    ) : !isEditingView ? (
                                                        // ------------------ NORMAL VIEW MODE -----------------------
                                                        <div className="text-sm space-y-3">
                                                            <p><strong>Positive Traits:</strong>{" "}
                                                                {ssbReport.positives.length > 0
                                                                    ? ssbReport.positives.map(p => `${p.note} (${p.by})`).join(", ")
                                                                    : "-"}
                                                            </p>

                                                            <p><strong>Negative Traits:</strong>{" "}
                                                                {ssbReport.negatives.length > 0
                                                                    ? ssbReport.negatives.map(n => `${n.note} (${n.by})`).join(", ")
                                                                    : "-"}
                                                            </p>

                                                            <p><strong>Rating:</strong> {ssbReport.predictiveRating}</p>

                                                            <p><strong>Scope For Improvement:</strong> {ssbReport.scopeForImprovement}</p>
                                                        </div>
                                                    ) : (
                                                        // ------------------ EDIT MODE -----------------------------
                                                        <div className="text-sm space-y-4">

                                                            {/* Predictive Rating */}
                                                            <div>
                                                                <label className="font-semibold">Predictive Rating</label>
                                                                <Input
                                                                    type="number"
                                                                    value={editForm?.predictiveRating}
                                                                    onChange={(e) =>
                                                                        handleEditChange("predictiveRating", Number(e.target.value))
                                                                    }
                                                                />
                                                            </div>

                                                            {/* Scope For Improvement */}
                                                            <div>
                                                                <label className="font-semibold">Scope For Improvement</label>
                                                                <Textarea
                                                                    value={editForm?.scopeForImprovement}
                                                                    onChange={(e) =>
                                                                        handleEditChange("scopeForImprovement", e.target.value)
                                                                    }
                                                                />
                                                            </div>

                                                            <div className="flex gap-3 mt-4">
                                                                <Button onClick={saveEdit}>Save</Button>
                                                                <Button variant="outline" onClick={cancelEdit}>Cancel</Button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </Card>
                                            </TabsContent>
                                        </Tabs>
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            <TabsContent value="settings">
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

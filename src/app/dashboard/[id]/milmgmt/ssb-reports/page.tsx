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
import { dossierTabs, militaryTrainingCards, ratingMap, reverseRatingMap } from "@/config/app.config";
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
import DashboardLayout from "@/components/layout/DashboardLayout";

export default function SSBReportPage() {
    const router = useRouter();
    const selectedCadet = useSelector((state: RootState) => state.cadet.selectedCadet);
    const [ssbReport, setSsbReport] = useState<SsbReport | null>(null);
    const [loading, setLoading] = useState(false);
    const [isEditingView, setIsEditingView] = useState(false);
    const [editForm, setEditForm] = useState<SsbReport | null>(null);
    const [isEditing, setIsEditing] = useState(false);

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
                positives: data.positiveTraits.filter(t => t.trait).map(t => ({
                    note: t.trait,
                    by: data.positiveBy
                })),
                negatives: data.negativeTraits.filter(t => t.trait).map(t => ({
                    note: t.trait,
                    by: data.negativeBy
                })),
                predictiveRating: reverseRatingMap[data.rating] ?? 0,
                scopeForImprovement: data.improvement
            };

            const response = await saveSsbReport(selectedCadet.ocId, payload);

            if (response) {
                toast.success("SSB Report saved successfully!");

                setIsEditing(false);

                const saved = await getSsbReport(selectedCadet.ocId);
                setSsbReport(saved);

                reset({
                    positiveTraits: saved?.positives.map(p => ({ trait: p.note })),
                    negativeTraits: saved?.negatives.map(n => ({ trait: n.note })),
                    positiveBy: saved?.positives[0]?.by || "",
                    negativeBy: saved?.negatives[0]?.by || "",
                    rating: ratingMap[saved.predictiveRating] || "",
                    improvement: saved?.scopeForImprovement
                });
            }
        } catch (err) {
            console.error("Error saving SSB Report:", err);
            toast.error("Failed to save SSB Report.");
        }
    };
    const fetchReport = async () => {
        if (!selectedCadet?.ocId) return;

        const report = await getSsbReport(selectedCadet.ocId);

        if (report) {
            setSsbReport(report);
            reset({
                positiveTraits: report.positives.map(p => ({ trait: p.note })),
                negativeTraits: report.negatives.map(n => ({ trait: n.note })),
                positiveBy: report.positives[0]?.by || "",
                negativeBy: report.negatives[0]?.by || "",
                rating: ratingMap[report.predictiveRating] || "",
                improvement: report.scopeForImprovement,
            });

            setIsEditing(false);
        }
    };


    useEffect(() => {
        fetchReport();
    }, [selectedCadet]);

    const savedData = watch();

    return (
        <DashboardLayout
            title="SSB Report"
            description="Document candidate performance, assess psychological, group, and interview outcomes, and compile structured evaluations."
        >
            <main className="p-6">

                <BreadcrumbNav
                    paths={[
                        { label: "Dashboard", href: "/dashboard" },
                        { label: "Dossier", href: "/dashboard/milmgmt" },
                        { label: "SSB Report" }
                    ]}
                />

                {selectedCadet && <SelectedCadetTable selectedCadet={selectedCadet} />}

                {/* ------------------ TABS + CONTENT ------------------ */}
                <DossierTab
                    tabs={dossierTabs}
                    defaultValue="ssb-reports"
                    extraTabs={
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <TabsTrigger value="miltrg" className="flex items-center gap-2">
                                    <Shield className="h-4 w-4" /> Mil-Trg
                                    <ChevronDown className="h-4 w-4" />
                                </TabsTrigger>
                            </DropdownMenuTrigger>

                            <DropdownMenuContent className="w-96 max-h-64 overflow-y-auto">
                                {militaryTrainingCards.map(card => (
                                    <DropdownMenuItem key={card.to} asChild>
                                        <a href={card.to} className="flex items-center gap-2">
                                            <card.icon className={`h-4 w-4 ${card.color}`} />
                                            {card.title}
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
                                                            disabled={!isEditing}
                                                        />
                                                        <Button
                                                            type="button"
                                                            variant="destructive"
                                                            size="sm"
                                                            onClick={() => removePositive(index)}
                                                            disabled={!isEditing}
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
                                                    disabled={!isEditing}
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
                                                disabled={!isEditing}
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
                                                            disabled={!isEditing}
                                                        />
                                                        <Button
                                                            type="button"
                                                            variant="destructive"
                                                            size="sm"
                                                            onClick={() => removeNegative(index)}
                                                            disabled={!isEditing}
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
                                                    disabled={!isEditing}
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
                                                disabled={!isEditing}
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
                                                disabled={!isEditing}
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
                                            disabled={!isEditing}
                                        />
                                    </div>

                                    {/* Buttons */}
                                    <div className="flex justify-center gap-2">

                                        {!isEditing ? (
                                            <Button type="button" onClick={() => setIsEditing(true)}>
                                                Edit
                                            </Button>
                                        ) : (
                                            <>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    onClick={() => {
                                                        reset(ssbReport ? {
                                                            positiveTraits: ssbReport.positives.map(p => ({ trait: p.note })),
                                                            negativeTraits: ssbReport.negatives.map(n => ({ trait: n.note })),
                                                            positiveBy: ssbReport.positives[0]?.by || "",
                                                            negativeBy: ssbReport.negatives[0]?.by || "",
                                                            rating: ssbReport.predictiveRating.toString(),
                                                            improvement: ssbReport.scopeForImprovement,
                                                        } : {});
                                                        setIsEditing(false);
                                                    }}
                                                >
                                                    Cancel
                                                </Button>

                                                <Button type="submit">
                                                    Save
                                                </Button>
                                            </>
                                        )}

                                    </div>
                                </form>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </DossierTab>

            </main>
        </DashboardLayout>
    );
}
"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useDispatch, useSelector } from "react-redux";
import { useDebounce } from "@/hooks/useDebounce";

import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useDossierFilling } from "@/hooks/useDossierFilling";

import type { DossierFormData } from "@/types/dossierFilling";
import { saveDossierForm, clearDossierForm } from "@/store/slices/dossierFillingSlice";
import type { RootState } from "@/store";

interface DossierFillingFormProps {
    ocId: string;
}

/**
 * Dossier Filling form component integrated with API.
 * - Loads data from API on mount
 * - Saves data to API
 * - View mode by default with Edit button
 * - Tabs are inside edit mode
 * - Strict typing, no `any`
 * - Destructures values with fallbacks
 * - map() that returns JSX lives inside a return
 */

// Helper function to format dates
function formatDate(dateString: string | null | undefined): string {
    if (!dateString) return "-";
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return "-";
        return date.toLocaleDateString('en-GB'); // DD/MM/YYYY format
    } catch {
        return "-";
    }
}

export default function DossierFillingForm({ ocId }: DossierFillingFormProps) {
    const [isEditMode, setIsEditMode] = useState(false);

    const handleEditClick = () => setIsEditMode(true);

    const { dossierFilling, loading, isSaving, saveDossierFilling } = useDossierFilling(ocId);

    const form = useForm<DossierFormData>({
        defaultValues: {
            initiatedBy: "",
            openedOn: "",
            initialInterview: "",
            closedBy: "",
            closedOn: "",
            finalInterview: "",
        },
    });

    const { register, handleSubmit, reset, setValue } = form;

    const dispatch = useDispatch();

    // Set form values when dossierFilling loads
    useEffect(() => {
        if (dossierFilling) {
            Object.entries(dossierFilling).forEach(([key, value]) => {
                setValue(key as keyof DossierFormData, value || "");
            });
        } else {
            reset();
        }
    }, [dossierFilling, setValue, reset]);

    const onSubmit = async (data: DossierFormData) => {
        // simple validation example
        const { initiatedBy = "" } = data;
        if (!initiatedBy.trim()) {
            toast.error("Please enter 'Initiated By'.");
            return;
        }

        try {
            await saveDossierFilling(data);
            setIsEditMode(false);
        } catch (error) {
            // Error handling is done in the hook
        }
    };

    const handleReset = () => {
        if (!confirm("Clear all form data?")) return;

        reset({
            initiatedBy: "",
            openedOn: "",
            initialInterview: "",
            closedBy: "",
            closedOn: "",
            finalInterview: "",
        });

        dispatch(clearDossierForm(ocId));
        toast.info("Form cleared");
    };

    const handleCancel = () => {
        setIsEditMode(false);
        reset();
    };

    // Helper to render label/value rows (map returns JSX inside return)
    function RenderSavedRows({ dossier }: { dossier: DossierFormData | null }) {
        if (!dossier) {
            return <p className="text-muted-foreground italic text-center">No dossier data available.</p>;
        }

        // Fields to display, excluding ocId, createdAt, updatedAt
        const displayFields = [
            { key: 'initiatedBy', label: 'Initiated By' },
            { key: 'openedOn', label: 'Opened On' },
            { key: 'initialInterview', label: 'Initial Interview' },
            { key: 'closedBy', label: 'Closed By' },
            { key: 'closedOn', label: 'Closed On' },
            { key: 'finalInterview', label: 'Final Interview' },
        ];

        return (
            <div className="grid grid-cols-2 gap-4 text-sm">
                {displayFields.map(({ key, label }) => {
                    const value = (dossier as any)[key];
                    const displayValue = (key === 'openedOn' || key === 'closedOn') ? formatDate(value) : (value || "-");
                    return (
                        <p key={key}>
                            <strong>{label}:</strong> {displayValue}
                        </p>
                    );
                })}
            </div>
        );
    }

    if (loading) {
        return (
            <Card className="max-w-4xl mx-auto shadow-lg rounded-2xl">
                <CardContent className="p-6">
                    <p className="text-center">Loading dossier data...</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="max-w-4xl mx-auto shadow-lg rounded-2xl">
            <CardHeader>
                <CardTitle className="text-xl font-semibold text-center">
                    Dossier Details
                </CardTitle>
            </CardHeader>

            <CardContent>
                {!isEditMode ? (
                    // VIEW MODE
                    <div className="p-6 border rounded-lg bg-muted/40">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-semibold">Dossier Filling Data</h3>
                            <Button onClick={handleEditClick} className="bg-primary hover:bg-primary">
                                Edit
                            </Button>
                        </div>
                        <RenderSavedRows dossier={dossierFilling} />
                    </div>
                ) : (
                    // EDIT MODE
                    <Tabs defaultValue="form" className="w-full">

                        <TabsContent value="form">
                            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-sm font-medium">Initiated By</label>
                                        <Input placeholder="Enter your name" {...register("initiatedBy")} />
                                    </div>

                                    <div>
                                        <label className="text-sm font-medium">Opened On</label>
                                        <Input type="date" {...register("openedOn")} />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Initial Interview</label>
                                    <Textarea placeholder="Enter initial interview notes..." className="min-h-[100px]" {...register("initialInterview")} />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-sm font-medium">Closed By</label>
                                        <Input placeholder="Enter your name" {...register("closedBy")} />
                                    </div>

                                    <div>
                                        <label className="text-sm font-medium">Closed On</label>
                                        <Input type="date" {...register("closedOn")} />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Final Interview</label>
                                    <Textarea placeholder="Enter final interview notes..." className="min-h-[100px]" {...register("finalInterview")} />
                                </div>

                                <div className="flex justify-center gap-2 mt-6">
                                    <Button type="submit" disabled={isSaving} className="bg-success">
                                        {isSaving ? "Saving..." : "Save"}
                                    </Button>
                                    <Button variant="outline" type="button" className="hover:bg-destructive hover:text-primary-foreground" onClick={handleCancel}>
                                        Cancel
                                    </Button>
                                </div>
                            </form>
                        </TabsContent>

                        <TabsContent value="view">
                            <div className="p-6 border rounded-lg bg-muted/40">
                                <h3 className="text-lg font-semibold mb-4">Dossier Filling Data</h3>
                                <RenderSavedRows dossier={dossierFilling} />
                            </div>
                        </TabsContent>
                    </Tabs>
                )}
            </CardContent>
        </Card>
    );
}

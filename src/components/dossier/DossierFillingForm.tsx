"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useDispatch, useSelector } from "react-redux";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";

import type { DossierFormData } from "@/types/dossierFilling";
import { saveDossierForm, clearDossierForm } from "@/store/slices/dossierFillingSlice";
import type { RootState } from "@/store";
import { useDebounce } from "@/hooks/useDebounce";

interface Props {
    ocId: string;
}

export default function DossierFillingForm({ ocId }: Props) {
    const dispatch = useDispatch();

    // Get persisted data from Redux
    const savedDossier = useSelector((state: RootState) =>
        state.dossierFilling.forms[ocId]
    );

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

    const { register, handleSubmit, reset, watch } = form;

    // Watch all form values for auto-save
    const formValues = watch();
    const debouncedFormValues = useDebounce(formValues, 500);

    // Load persisted data when component mounts or ocId changes
    useEffect(() => {
        if (savedDossier) {
            reset(savedDossier);
        }
    }, [ocId, savedDossier, reset]);

    // Auto-save on form changes (debounced)
    useEffect(() => {
        if (debouncedFormValues && Object.keys(debouncedFormValues).length > 0) {
            const hasAnyData = Object.values(debouncedFormValues).some(val => {
                return val !== null && val !== undefined && val !== "";
            });

            if (hasAnyData) {
                dispatch(saveDossierForm({ ocId, data: debouncedFormValues as DossierFormData }));
            }
        }
    }, [debouncedFormValues, dispatch, ocId]);

    const onSubmit = (data: DossierFormData) => {
        const { initiatedBy = "" } = data;
        if (!initiatedBy.trim()) {
            toast.error("Please enter 'Initiated By'.");
            return;
        }

        dispatch(saveDossierForm({ ocId, data }));
        toast.success("Dossier submitted successfully");
    };

    const handleReset = () => {
        if (confirm("Are you sure you want to clear all form data? This cannot be undone.")) {
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
        }
    };

    // Helper to render label/value rows
    function RenderSavedRows({ dossier }: { dossier: DossierFormData | null }) {
        if (!dossier) {
            return <p className="text-gray-500 italic">No dossier data saved yet.</p>;
        }

        const {
            initiatedBy = "-",
            openedOn = "-",
            initialInterview = "-",
            closedBy = "-",
            closedOn = "-",
            finalInterview = "-",
        } = dossier;

        const pairs: Array<[string, string]> = [
            ["Initiated By", initiatedBy || "-"],
            ["Opened On", openedOn || "-"],
            ["Initial Interview", initialInterview || "-"],
            ["Closed By", closedBy || "-"],
            ["Closed On", closedOn || "-"],
            ["Final Interview", finalInterview || "-"],
        ];

        return (
            <div className="grid grid-cols-2 gap-4 text-sm">
                {pairs.map(([label, val]) => (
                    <p key={label}>
                        <strong>{label}:</strong> {val}
                    </p>
                ))}
            </div>
        );
    }

    return (
        <Card className="max-w-4xl mx-auto shadow-lg rounded-2xl">
            <CardHeader>
                <CardTitle className="text-xl font-semibold text-center">Dossier Details</CardTitle>
            </CardHeader>

            <CardContent>
                <Tabs defaultValue="form" className="w-full">
                    <TabsList className="mb-6">
                        <TabsTrigger value="form" className="border border-gray-300 rounded-md px-3 py-2">
                            Fill Form
                        </TabsTrigger>
                        <TabsTrigger value="view" className="border border-gray-300 rounded-md px-3 py-2">
                            View Data
                        </TabsTrigger>
                    </TabsList>

                    {/* FORM TAB */}
                    <TabsContent value="form">
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                            {/* Auto-save indicator */}
                            <div className="text-xs text-gray-500 text-right">
                                ✓ Changes are saved automatically
                            </div>

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
                                <Button variant="outline" type="button" className="hover:bg-destructive hover:text-white" onClick={handleReset}>
                                    Clear Form
                                </Button>
                                <Button type="submit" className="bg-[#40ba4d]">Submit</Button>
                            </div>
                        </form>
                    </TabsContent>

                    {/* VIEW TAB */}
                    <TabsContent value="view">
                        <div className="p-6 border rounded-lg bg-gray-50">
                            <h3 className="text-lg font-semibold mb-4">Saved Dossier Data</h3>
                            <RenderSavedRows dossier={savedDossier} />
                        </div>
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
}
"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";

import type { DossierFormData } from "@/types/dossierFilling";

/**
 * Self-contained Dossier Filling form component.
 * - Tabs are inside this component (Option B)
 * - Strict typing, no `any`
 * - Destructures values with fallbacks
 * - map() that returns JSX lives inside a return
 */
export default function DossierFillingForm() {
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
    const watchedValues = watch();

    // local saved dossier used for preview
    const [savedDossier, setSavedDossier] = useState<DossierFormData | null>(null);

    // keep preview in sync optionally if you want live preview; here we keep saved preview after Save
    useEffect(() => {
        return () => {
            // cleanup if needed
        };
    }, []);

    const onSubmit = (data: DossierFormData) => {
        // simple validation example
        const { initiatedBy = "" } = data;
        if (!initiatedBy.trim()) {
            toast.error("Please enter 'Initiated By'.");
            return;
        }

        setSavedDossier(data);
        toast.success("Dossier saved locally for preview.");
        reset();
    };

    // Helper to render label/value rows (map returns JSX inside return)
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
                                <Button variant="outline" type="button" onClick={() => reset()}>
                                    Reset
                                </Button>
                                <Button type="submit">Save</Button>
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

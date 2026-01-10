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

    /* ✅ Redux Persist – KEEP */
    const savedDossier = useSelector(
        (state: RootState) => state.dossierFilling.forms[ocId]
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

    /* Load persisted data */
    useEffect(() => {
        if (savedDossier) {
            reset(savedDossier);
        }
    }, [savedDossier, reset]);

    /* Auto-save (Redux Persist) */
    const debouncedValues = useDebounce(watch(), 500);

    useEffect(() => {
        if (!debouncedValues) return;

        const hasData = Object.values(debouncedValues).some(
            v => v !== "" && v !== null && v !== undefined
        );

        if (hasData) {
            dispatch(saveDossierForm({ ocId, data: debouncedValues }));
        }
    }, [debouncedValues, dispatch, ocId]);

    const onSubmit = (data: DossierFormData) => {
        if (!data.initiatedBy?.trim()) {
            toast.error("Initiated By is required");
            return;
        }

        dispatch(saveDossierForm({ ocId, data }));
        toast.success("Dossier saved successfully");
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

    function RenderSavedRows({ dossier }: { dossier: DossierFormData | null }) {
        if (!dossier) {
            return <p className="text-gray-500 italic text-center">No dossier data saved yet.</p>;
        }

        return (
            <div className="grid grid-cols-2 gap-4 text-sm">
                {Object.entries(dossier).map(([k, v]) => (
                    <p key={k}>
                        <strong>{k}:</strong> {v || "-"}
                    </p>
                ))}
            </div>
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
                <Tabs defaultValue="form">
                    <TabsList className="mb-6">
                        <TabsTrigger value="form">Fill Form</TabsTrigger>
                        <TabsTrigger value="view">View Data</TabsTrigger>
                    </TabsList>

                    {/* FORM */}
                    <TabsContent value="form">
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                            <div className="text-xs text-gray-500 text-right">
                                ✓ Changes are saved automatically
                            </div>

                            <Input placeholder="Initiated By" {...register("initiatedBy")} />
                            <Input type="date" {...register("openedOn")} />
                            <Textarea {...register("initialInterview")} />
                            <Input placeholder="Closed By" {...register("closedBy")} />
                            <Input type="date" {...register("closedOn")} />
                            <Textarea {...register("finalInterview")} />

                            <div className="flex justify-center gap-2">
                                <Button variant="outline" type="button" onClick={handleReset}>
                                    Clear Form
                                </Button>
                                <Button type="submit">Submit</Button>
                            </div>
                        </form>
                    </TabsContent>

                    {/* VIEW */}
                    <TabsContent value="view">
                        <div className="p-6 border rounded-lg bg-gray-50">
                            <h3 className="text-lg font-semibold mb-4">Saved Dossier Data</h3>
                            <RenderSavedRows dossier={savedDossier ?? null} />
                        </div>
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
}

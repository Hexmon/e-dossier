"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useDispatch, useSelector } from "react-redux";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";

import type { InspFormData } from "@/types/dossierInsp";
import { saveInspForm, clearInspForm } from "@/store/slices/inspSheetSlice";
import type { RootState } from "@/store";
import { useDebounce } from "@/hooks/useDebounce";

interface Props {
    ocId: string;
}

export default function InspFormComponent({ ocId }: Props) {
    const dispatch = useDispatch();

    // Get persisted data from Redux
    const savedData = useSelector((state: RootState) =>
        state.inspSheet.forms[ocId]
    );

    const form = useForm<InspFormData>({
        defaultValues: {
            date: "",
            rk: "",
            name: "",
            appointment: "",
            remarks: "",
            initials: "",
        },
    });

    const { register, handleSubmit, reset, watch } = form;

    // Watch all form values for auto-save
    const formValues = watch();
    const debouncedFormValues = useDebounce(formValues, 500);

    // Load persisted data when component mounts or ocId changes
    useEffect(() => {
        if (savedData) {
            reset(savedData);
        }
    }, [ocId, savedData, reset]);

    // Auto-save on form changes (debounced)
    useEffect(() => {
        if (debouncedFormValues && Object.keys(debouncedFormValues).length > 0) {
            const hasAnyData = Object.values(debouncedFormValues).some(val => {
                return val !== null && val !== undefined && val !== "";
            });

            if (hasAnyData) {
                dispatch(saveInspForm({ ocId, data: debouncedFormValues as InspFormData }));
            }
        }
    }, [debouncedFormValues, dispatch, ocId]);

    const onSubmit = (data: InspFormData) => {
        const { name = "" } = data;

        if (!name.trim()) {
            toast.error("Name is required.");
            return;
        }

        dispatch(saveInspForm({ ocId, data }));
        toast.success("Inspection submitted successfully.");
    };

    const handleReset = () => {
        if (confirm("Are you sure you want to clear all form data? This cannot be undone.")) {
            reset({
                date: "",
                rk: "",
                name: "",
                appointment: "",
                remarks: "",
                initials: "",
            });
            dispatch(clearInspForm(ocId));
            toast.info("Form cleared");
        }
    };

    // Helper for preview mapping
    const renderRows = (obj: InspFormData | null) => {
        if (!obj) {
            return <p className="italic text-gray-500">No saved inspection yet.</p>;
        }

        const {
            date = "-",
            rk = "-",
            name = "-",
            appointment = "-",
            remarks = "-",
            initials = "-",
        } = obj;

        const rows: Array<[string, string]> = [
            ["Date", date || "-"],
            ["Rank", rk || "-"],
            ["Name", name || "-"],
            ["Appointment", appointment || "-"],
            ["Remarks", remarks || "-"],
            ["Initials", initials || "-"],
        ];

        return (
            <div className="grid grid-cols-2 gap-4 text-sm">
                {rows.map(([label, val]) => (
                    <p key={label}>
                        <strong>{label}:</strong> {val}
                    </p>
                ))}
            </div>
        );
    };

    return (
        <Card className="max-w-4xl mx-auto shadow-lg rounded-xl">
            <CardHeader>
                <CardTitle className="text-lg font-semibold text-center bg-blue-100 rounded-2xl">
                    Inspection Sheet
                </CardTitle>
            </CardHeader>

            <CardContent>
                <Tabs defaultValue="fill" className="w-full">
                    <TabsList className="mb-6">
                        <TabsTrigger value="fill">Fill Form</TabsTrigger>
                        <TabsTrigger value="preview">Preview</TabsTrigger>
                    </TabsList>

                    {/* FORM TAB */}
                    <TabsContent value="fill">
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                            {/* Auto-save indicator */}
                            <div className="text-xs text-gray-500 text-right">
                                ✓ Changes are saved automatically
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div>
                                    <label className="text-sm font-medium">Date</label>
                                    <Input type="date" {...register("date")} className="mt-1" />
                                </div>
                                <div>
                                    <label className="text-sm font-medium">Rank</label>
                                    <Input {...register("rk")} className="mt-1" placeholder="Rank" />
                                </div>
                                <div>
                                    <label className="text-sm font-medium">Name</label>
                                    <Input {...register("name")} className="mt-1" placeholder="Name" />
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

                            <div className="flex justify-center gap-2">
                                <Button variant="outline" type="button" className="hover:bg-destructive hover:text-white" onClick={handleReset}>
                                    Clear Form
                                </Button>
                                <Button type="submit" className="bg-[#40ba4d]">Submit</Button>
                            </div>
                        </form>
                    </TabsContent>

                    {/* PREVIEW TAB */}
                    <TabsContent value="preview">
                        <div className="p-6 bg-gray-50 border rounded-lg">
                            <h3 className="text-lg font-semibold mb-4">Preview</h3>
                            {renderRows(savedData)}
                        </div>
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
}
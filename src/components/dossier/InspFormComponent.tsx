"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";

import type { InspFormData } from "@/types/dossierInsp";

export default function InspFormComponent() {
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

    const { register, handleSubmit, reset } = form;

    const [savedData, setSavedData] = useState<InspFormData | null>(null);

    const onSubmit = (data: InspFormData) => {
        const { name = "" } = data;

        if (!name.trim()) {
            toast.error("Name is required.");
            return;
        }

        setSavedData(data);
        toast.success("Inspection saved.");
        reset();
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
                                <Button variant="outline" type="button" onClick={() => reset()}>
                                    Reset
                                </Button>
                                <Button type="submit">Save</Button>
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

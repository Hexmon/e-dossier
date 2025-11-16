"use client";

import { useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

import {
    getAutobiographyDetails,
    saveAutobiography,
    AutoBioPayload,
} from "@/app/lib/api/autobiographyApi";

import { AutoBio } from "@/types/background-detls";

export default function AutobiographySection({ selectedCadet }: { selectedCadet: any }) {
    const autoBioForm = useForm<AutoBio>({
        defaultValues: {
            general: "",
            proficiency: "",
            work: "",
            additional: "",
            date: "",
            sign_oc: "",
            sign_pi: "",
        },
    });

    const { register, handleSubmit, reset, watch } = autoBioForm;
    const savedAutoBio = watch();


    // ---------------------------
    // FETCH AUTOBIOGRAPHY
    // ---------------------------
    const fetchAutobiography = useCallback(async () => {
        if (!selectedCadet?.ocId) return;

        try {
            const data = await getAutobiographyDetails(selectedCadet.ocId);

            if (data) {
                reset({
                    general: data.general ?? "",
                    proficiency: data.sportsProficiency ?? "",
                    work: data.achievementsNote ?? "",
                    additional: data.areasToWork ?? "",
                    date: data.filledOn ?? "",
                    sign_oc: data.platoonCommanderName ?? "",
                    sign_pi: "",
                });
            }
        } catch (err) {
            console.error("Error loading autobiography data:", err);
            toast.error("Error loading autobiography details.");
        }
    }, [selectedCadet?.ocId, reset]);


    useEffect(() => {
        fetchAutobiography();
    }, [fetchAutobiography]);


    // ---------------------------
    // SAVE AUTOBIOGRAPHY
    // ---------------------------
    const submitAutoBio = async (data: AutoBio) => {
        if (!selectedCadet?.ocId) {
            toast.error("No cadet selected");
            return;
        }

        const payload: AutoBioPayload = {
            general: data.general,
            sportsProficiency: data.proficiency,
            achievementsNote: data.work,
            areasToWork: data.additional,
            additionalInfo: data.additional,
            filledOn:
                typeof data.date === "string"
                    ? data.date
                    : new Date(data.date).toISOString().split("T")[0],
            platoonCommanderName: data.sign_oc,
        };

        try {
            const response = await saveAutobiography(selectedCadet.ocId, payload);

            if (response?.data && Object.keys(response.data).length > 0) {
                await fetchAutobiography();
                toast.success("Autobiography saved successfully!");
            } else {
                toast.warning("Failed to save autobiography. Please try again.");
            }
        } catch (err) {
            console.error("Error saving autobiography:", err);
            toast.error("Unexpected error saving autobiography.");
        }
    };


    return (
        <Card className="shadow-lg rounded-2xl border border-border w-full max-w-4xl mx-auto">
            <CardHeader>
                <CardTitle className="text-xl font-bold text-center uppercase text-primary">
                    Confidential - Autobiography Form
                </CardTitle>
            </CardHeader>

            <CardContent>
                <Tabs defaultValue="form">
                    <TabsList className="mb-6">
                        <TabsTrigger value="form">Fill Form</TabsTrigger>
                        <TabsTrigger value="view">View Data</TabsTrigger>
                    </TabsList>


                    {/* ---------------- FORM TAB ---------------- */}
                    <TabsContent value="form">
                        <form onSubmit={handleSubmit(submitAutoBio)} className="space-y-6">
                            {["general", "proficiency", "work", "additional"].map((field, i) => (
                                <div key={field}>
                                    <label className="block font-semibold mb-2">
                                        {i + 1}. {field.charAt(0).toUpperCase() + field.slice(1)}
                                    </label>
                                    <Textarea {...register(field)} rows={4} className="w-full" />
                                </div>
                            ))}

                            {/* DATE */}
                            <div>
                                <label className="block font-semibold mb-2">Date</label>
                                <Input type="date" {...register("date")} />
                            </div>

                            {/* SIGNATURES */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div>
                                    <label className="block font-semibold mb-2">Sign of OC</label>
                                    <Input {...register("sign_oc")} placeholder="Signature / Name" />
                                </div>

                                <div>
                                    <label className="block font-semibold mb-2">Sign of PI Cdr</label>
                                    <Input {...register("sign_pi")} placeholder="Signature / Name" />
                                </div>
                            </div>

                            {/* BUTTONS */}
                            <div className="flex justify-center gap-2 mt-6">
                                <Button
                                    variant="outline"
                                    type="button"
                                    className="w-[200px]"
                                    onClick={() => reset()}
                                >
                                    Reset
                                </Button>
                                <Button type="submit" className="w-[200px]">
                                    Save
                                </Button>
                            </div>
                        </form>
                    </TabsContent>


                    {/* ---------------- VIEW TAB ---------------- */}
                    <TabsContent value="view">
                        <div className="p-6 bg-gray-50 border rounded-lg">
                            <h3 className="text-lg font-semibold mb-4">Saved Autobiography Data</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                                {Object.entries(savedAutoBio).map(([key, value]) => (
                                    <p key={key}>
                                        <strong>{key}:</strong> {value || "-"}
                                    </p>
                                ))}
                            </div>
                        </div>
                    </TabsContent>

                </Tabs>
            </CardContent>
        </Card>
    );
}

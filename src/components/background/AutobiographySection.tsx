"use client";

import { useEffect, useCallback, useState } from "react";
import { useForm } from "react-hook-form";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

import {
    getAutobiographyDetails,
    saveAutobiography,
    AutoBioPayload,
    patchAutobiography,
} from "@/app/lib/api/autobiographyApi";

import { AutoBio } from "@/types/background-detls";

export default function AutobiographySection({ selectedCadet }: { selectedCadet: any }) {
    const [isEditing, setIsEditing] = useState(false);

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

    const { register, handleSubmit, reset } = autoBioForm;
    const [hasExistingRecord, setHasExistingRecord] = useState(false);

    // ---------------------------
    // FETCH AUTOBIOGRAPHY
    // ---------------------------
    const fetchAutobiography = useCallback(async () => {
        if (!selectedCadet?.ocId) return;

        try {
            const data = await getAutobiographyDetails(selectedCadet.ocId);

            if (data) {
                setHasExistingRecord(true);
                reset({
                    general: data.generalSelf ?? "",
                    proficiency: data.proficiencySports ?? "",
                    work: data.achievementsNote ?? "",
                    additional: data.areasToWork ?? "",
                    date: data.filledOn ?? "",
                    sign_oc: selectedCadet.name ?? "",
                    sign_pi: data.platoonCommanderName ?? "",
                });
                setIsEditing(false);
            } else {
                setHasExistingRecord(false);
                reset();
                setIsEditing(true);
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
            generalSelf: data.general,
            proficiencySports: data.proficiency,
            achievementsNote: data.work,
            areasToWork: data.additional,
            additionalInfo: data.additional,
            filledOn: typeof data.date === "string" ? data.date : new Date(data.date).toISOString().split("T")[0],
            platoonCommanderName: data.sign_oc,
        };

        try {
            let response;

            if (hasExistingRecord) {
                response = await patchAutobiography(selectedCadet.ocId, payload);
            } else {
                response = await saveAutobiography(selectedCadet.ocId, payload);
            }

            if (response?.data) {
                toast.success(
                    hasExistingRecord
                        ? "Autobiography updated successfully!"
                        : "Autobiography created successfully!"
                );

                await fetchAutobiography();
                setIsEditing(false);
                setHasExistingRecord(true);
            } else {
                toast.warning("Failed to save autobiography.");
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
                <form onSubmit={handleSubmit(submitAutoBio)} className="space-y-6">

                    {["general", "proficiency", "work", "additional"].map((field, i) => (
                        <div key={field}>
                            <label className="block font-semibold mb-2">
                                {i + 1}. {field.charAt(0).toUpperCase() + field.slice(1)}
                            </label>
                            <Textarea
                                {...register(field as any)}
                                rows={4}
                                disabled={!isEditing}
                                className="w-full"
                            />
                        </div>
                    ))}

                    <div>
                        <label className="block font-semibold mb-2">Date</label>
                        <Input type="date" {...register("date")} disabled={!isEditing} />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div>
                            <label className="block font-semibold mb-2">Sign of OC</label>
                            <Input {...register("sign_oc")} disabled={!isEditing} />
                        </div>

                        <div>
                            <label className="block font-semibold mb-2">Sign of PI Cdr</label>
                            <Input {...register("sign_pi")} disabled={!isEditing} />
                        </div>
                    </div>

                    <div className="flex justify-center gap-2 mt-6">

                        {!isEditing ? (
                            <Button
                                type="button"
                                className="w-[200px]"
                                onClick={() => setIsEditing(true)}
                            >
                                Edit
                            </Button>
                        ) : (
                            <>
                                <Button
                                    variant="outline"
                                    type="button"
                                    className="w-[200px]"
                                    onClick={() => { fetchAutobiography(); setIsEditing(false); }}
                                >
                                    Cancel
                                </Button>

                                <Button
                                    type="submit"
                                    className="w-[200px]"
                                >
                                    Save
                                </Button>
                            </>
                        )}

                    </div>
                </form>
            </CardContent>
        </Card>
    );
}

"use client";

import { useEffect, useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { useDispatch, useSelector } from "react-redux";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

import { useAutobiography } from "@/hooks/useAutobiography";
import { AutoBio } from "@/types/background-detls";
import { AutoBioPayload } from "@/app/lib/api/autobiographyApi";
import type { RootState } from "@/store";
import { saveAutobiographyForm, clearAutobiographyForm } from "@/store/slices/autobiographySlice";

type Props = {
    ocId: string;
    cadet: {
        name?: string;
        ocNumber?: string;
    } | null;
};

const textFields = ["general", "proficiency", "work", "additional"] as const;
type TextFieldKey = typeof textFields[number];

export default function AutobiographySection({ ocId, cadet }: Props) {
    const [isEditing, setIsEditing] = useState(false);
    const isInitialLoad = useRef(true);

    // Redux
    const dispatch = useDispatch();
    const savedFormData = useSelector((state: RootState) =>
        state.autobiography.forms[ocId]
    );

    const { autoBio, exists, fetchAutoBio, save } = useAutobiography(ocId);

    const { register, handleSubmit, reset, watch } = useForm<AutoBio>({
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

    const cadetName = cadet?.name ?? "";

    // Auto-save to Redux on form changes (only when editing and not initial load)
    useEffect(() => {
        if (!isEditing || isInitialLoad.current) return;

        const subscription = watch((value) => {
            const formData = {
                general: value.general || "",
                proficiency: value.proficiency || "",
                work: value.work || "",
                additional: value.additional || "",
                date: value.date || "",
                sign_oc: value.sign_oc || "",
                sign_pi: value.sign_pi || "",
            };
            dispatch(saveAutobiographyForm({ ocId, data: formData }));
        });
        return () => subscription.unsubscribe();
    }, [watch, dispatch, ocId, isEditing]);

    // Load data from backend
    useEffect(() => {
        fetchAutoBio();
    }, [fetchAutoBio]);

    // Initialize form data
    useEffect(() => {
        // If backend data exists, use it
        if (autoBio) {
            const {
                generalSelf,
                proficiencySports,
                achievementsNote,
                areasToWork,
                filledOn,
                platoonCommanderName,
            } = autoBio;

            reset({
                general: generalSelf ?? "",
                proficiency: proficiencySports ?? "",
                work: achievementsNote ?? "",
                additional: areasToWork ?? "",
                date: filledOn ?? "",
                sign_oc: cadetName,
                sign_pi: platoonCommanderName ?? "",
            });

            setIsEditing(false);
            isInitialLoad.current = false;
            return;
        }

        // If no backend data but we have saved form data in Redux
        if (savedFormData && isInitialLoad.current) {
            reset(savedFormData);
            setIsEditing(true);
            isInitialLoad.current = false;
            return;
        }

        // If no data at all
        if (isInitialLoad.current) {
            reset({
                general: "",
                proficiency: "",
                work: "",
                additional: "",
                date: "",
                sign_oc: cadetName,
                sign_pi: "",
            });
            setIsEditing(true);
            isInitialLoad.current = false;
        }
    }, [autoBio, cadetName]);

    // Save handler
    const onSubmit = async (form: AutoBio) => {
        const {
            general,
            proficiency,
            work,
            additional,
            date,
            sign_oc,
        } = form;

        const payload: AutoBioPayload = {
            generalSelf: general,
            proficiencySports: proficiency,
            achievementsNote: work,
            areasToWork: additional,
            additionalInfo: additional,
            filledOn: date,
            platoonCommanderName: sign_oc,
        };

        const saved = await save(payload);
        if (saved) {
            toast.success("Autobiography saved successfully!");
            // Clear Redux cache after successful save
            dispatch(clearAutobiographyForm(ocId));
            setIsEditing(false);
            fetchAutoBio();
        } else {
            toast.error("Failed to save autobiography");
        }
    };

    // Clear form handler
    const handleClearForm = () => {
        if (confirm("Are you sure you want to clear all unsaved changes?")) {
            dispatch(clearAutobiographyForm(ocId));
            reset({
                general: "",
                proficiency: "",
                work: "",
                additional: "",
                date: "",
                sign_oc: cadetName,
                sign_pi: "",
            });
            toast.info("Form cleared");
        }
    };

    // Cancel handler
    const handleCancel = () => {
        // If we have backend data, restore it
        if (autoBio) {
            const {
                generalSelf,
                proficiencySports,
                achievementsNote,
                areasToWork,
                filledOn,
                platoonCommanderName,
            } = autoBio;

            reset({
                general: generalSelf ?? "",
                proficiency: proficiencySports ?? "",
                work: achievementsNote ?? "",
                additional: areasToWork ?? "",
                date: filledOn ?? "",
                sign_oc: cadetName,
                sign_pi: platoonCommanderName ?? "",
            });
        }
        setIsEditing(false);
    };

    return (
        <Card className="shadow-lg rounded-2xl border border-border w-full max-w-4xl mx-auto">
            <CardHeader>
                <CardTitle className="text-xl font-bold text-center uppercase text-[#1677ff]">
                    Confidential – Autobiography Form
                </CardTitle>
            </CardHeader>

            <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

                    {/* TEXTAREAS */}
                    {textFields.map((field, idx) => {
                        const label = field.charAt(0).toUpperCase() + field.slice(1);

                        return (
                            <div key={field}>
                                <label className="block font-semibold mb-2">
                                    {idx + 1}. {label}
                                </label>
                                <Textarea
                                    {...register(field)}
                                    disabled={!isEditing}
                                    rows={4}
                                />
                            </div>
                        );
                    })}

                    {/* DATE */}
                    <div>
                        <label className="block font-semibold mb-2">Date</label>
                        <Input type="date" disabled={!isEditing} {...register("date")} />
                    </div>

                    {/* SIGNATURES */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div>
                            <label className="block font-semibold mb-2">Sign of OC</label>
                            <Input disabled={!isEditing} {...register("sign_oc")} />
                        </div>

                        <div>
                            <label className="block font-semibold mb-2">Sign of PI Cdr</label>
                            <Input disabled={!isEditing} {...register("sign_pi")} />
                        </div>
                    </div>

                    {/* BUTTONS */}
                    <div className="flex justify-center gap-2 mt-6">
                        {!isEditing ? (
                            <Button type="button" className="w-[200px]" onClick={() => setIsEditing(true)}>
                                Edit
                            </Button>
                        ) : (
                            <>
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="w-[200px] hover:bg-destructive hover:text-white"
                                    onClick={handleCancel}
                                >
                                    Cancel
                                </Button>

                                <Button
                                    type="button"
                                    variant="outline"
                                    className="w-[200px]"
                                    onClick={handleClearForm}
                                >
                                    Clear Form
                                </Button>

                                <Button type="submit" className="w-[200px] bg-[#40ba4d]">
                                    Save
                                </Button>
                            </>
                        )}
                    </div>

                    {isEditing && savedFormData && !isInitialLoad.current && (
                        <p className="text-sm text-muted-foreground text-center mt-2">
                            * Changes are automatically saved
                        </p>
                    )}
                </form>
            </CardContent>
        </Card>
    );
}
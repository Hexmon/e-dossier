"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

import { useAutobiography } from "@/hooks/useAutobiography";
import { AutoBio } from "@/types/background-detls";
import { AutoBioPayload } from "@/app/lib/api/autobiographyApi";

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

    const { autoBio, exists, fetchAutoBio, save } = useAutobiography(ocId);

    const { register, handleSubmit, reset } = useForm<AutoBio>({
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

    // ----------------------------------------------------
    // LOAD DATA
    // ----------------------------------------------------
    useEffect(() => {
        fetchAutoBio();
    }, [fetchAutoBio]);

    useEffect(() => {
        if (!autoBio) {
            reset();
            setIsEditing(true);
            return;
        }

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
    }, [autoBio, cadetName, reset]);

    // ----------------------------------------------------
    // SAVE HANDLER
    // ----------------------------------------------------
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
        if (saved) fetchAutoBio();
    };

    // ----------------------------------------------------
    // UI
    // ----------------------------------------------------
    return (
        <Card className="shadow-lg rounded-2xl border border-border w-full max-w-4xl mx-auto">
            <CardHeader>
                <CardTitle className="text-xl font-bold text-center uppercase text-primary">
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
                                    className="w-[200px]"
                                    onClick={() => {
                                        fetchAutoBio();
                                        setIsEditing(false);
                                    }}
                                >
                                    Cancel
                                </Button>

                                <Button type="submit" className="w-[200px]">
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

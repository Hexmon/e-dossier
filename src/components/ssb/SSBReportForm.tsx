"use client";

import { useForm, useFieldArray } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ratingMap, reverseRatingMap } from "@/config/app.config";
import { SsbReport } from "@/app/lib/api/ssbReportApi";
import { useEffect, useState } from "react";

export interface SSBFormData {
    positiveTraits: { trait: string }[];
    negativeTraits: { trait: string }[];
    positiveBy: string;
    negativeBy: string;
    rating: string;
    improvement: string;
}

export function SSBReportForm({
    ocId,
    report,
    onSave,
}: {
    ocId: string;
    report: SsbReport | null;
    onSave: (data: SSBFormData) => Promise<void>;
}) {
    const [isEditing, setIsEditing] = useState(false);

    const {
        register,
        control,
        handleSubmit,
        reset
    } = useForm<SSBFormData>({
        defaultValues: {
            positiveTraits: [{ trait: "" }],
            negativeTraits: [{ trait: "" }],
            positiveBy: "",
            negativeBy: "",
            rating: "",
            improvement: "",
        }
    });

    const { fields: positiveFields, append: addPositive, remove: removePositive } =
        useFieldArray({ control, name: "positiveTraits" });

    const { fields: negativeFields, append: addNegative, remove: removeNegative } =
        useFieldArray({ control, name: "negativeTraits" });

    useEffect(() => {
        if (!report) return;

        reset({
            positiveTraits: report.positives.map(p => ({ trait: p.note ?? "" })),
            negativeTraits: report.negatives.map(n => ({ trait: n.note ?? "" })),
            positiveBy: report.positives[0]?.by ?? "",
            negativeBy: report.negatives[0]?.by ?? "",
            rating: ratingMap[report.predictiveRating] ?? "",
            improvement: report.scopeForImprovement ?? "",
        });

        setIsEditing(false);
    }, [report, reset]);

    return (
        <form onSubmit={handleSubmit(onSave)} className="space-y-6">
            <div className="rounded-2xl shadow-lg bg-white px-5 py-5">
                {/* POSITIVE TRAITS */}
                <div className="grid grid-cols-2 gap-12">
                    <div>
                        <label className="text-sm font-semibold">Positive Traits</label>
                        <div className="space-y-2 mt-2">
                            {positiveFields.map(({ id }, idx) => (
                                <div key={id} className="flex items-center gap-2">
                                    <Input
                                        {...register(`positiveTraits.${idx}.trait`)}
                                        placeholder={`Trait ${idx + 1}`}
                                        disabled={!isEditing}
                                        className="flex-1"
                                    />
                                    <Button
                                        type="button"
                                        variant="destructive"
                                        size="sm"
                                        disabled={!isEditing}
                                        onClick={() => removePositive(idx)}
                                    >
                                        Remove
                                    </Button>
                                </div>
                            ))}

                            <Button
                                type="button"
                                variant="outline"
                                className="hover:bg-[#40ba4d] hover:text-white"
                                size="sm"
                                disabled={!isEditing}
                                onClick={() => addPositive({ trait: "" })}
                            >
                                + Add Positive
                            </Button>
                        </div>
                    </div>

                    <div>
                        <label className="text-sm font-semibold">By</label>
                        <select
                            {...register("positiveBy")}
                            disabled={!isEditing}
                            className="w-full rounded-md border p-2 mt-1"
                        >
                            <option value="">Select</option>
                            <option value="IO">IO</option>
                            <option value="GTO">GTO</option>
                            <option value="Psy">Psy</option>
                            <option value="TO">TO</option>
                        </select>
                    </div>
                </div>

                {/* NEGATIVE TRAITS */}
                <div className="grid grid-cols-2 gap-12">
                    <div>
                        <label className="text-sm font-semibold">Negative Traits</label>
                        <div className="space-y-2 mt-2">
                            {negativeFields.map(({ id }, idx) => (
                                <div key={id} className="flex items-center gap-2">
                                    <Input
                                        {...register(`negativeTraits.${idx}.trait`)}
                                        placeholder={`Trait ${idx + 1}`}
                                        disabled={!isEditing}
                                        className="flex-1"
                                    />
                                    <Button
                                        type="button"
                                        variant="destructive"
                                        size="sm"
                                        disabled={!isEditing}
                                        onClick={() => removeNegative(idx)}
                                    >
                                        Remove
                                    </Button>
                                </div>
                            ))}

                            <Button
                                type="button"
                                variant="outline"
                                className="hover:bg-[#40ba4d] hover:text-white"
                                size="sm"
                                disabled={!isEditing}
                                onClick={() => addNegative({ trait: "" })}
                            >
                                + Add Negative
                            </Button>
                        </div>
                    </div>

                    <div>
                        <label className="text-sm font-semibold">By</label>
                        <select
                            {...register("negativeBy")}
                            disabled={!isEditing}
                            className="w-full rounded-md border p-2 mt-1"
                        >
                            <option value="">Select</option>
                            <option value="IO">IO</option>
                            <option value="GTO">GTO</option>
                            <option value="Psy">Psy</option>
                            <option value="TO">TO</option>
                        </select>
                    </div>
                </div>

                {/* RATING */}
                <div>
                    <label className="text-sm font-semibold">Predictive Rating</label>
                    <select
                        {...register("rating")}
                        disabled={!isEditing}
                        className="w-full rounded-md border p-2 mt-1"
                    >
                        <option value="">Select Rating</option>
                        {Object.keys(reverseRatingMap).map((key) => (
                            <option key={key} value={key}>{key}</option>
                        ))}
                    </select>
                </div>

                {/* IMPROVEMENT */}
                <div>
                    <label className="text-sm font-semibold">Scope for Improvement</label>
                    <Textarea
                        {...register("improvement")}
                        disabled={!isEditing}
                        placeholder="Details..."
                        className="mt-1"
                    />
                </div>

                {/* BUTTONS */}
                <div className="flex justify-center gap-3 mt-4">
                    {!isEditing ? (
                        <Button
                            type="button"
                            onClick={() => setIsEditing(true)}
                        >
                            Edit
                        </Button>
                    ) : (
                        <>
                            <Button
                                type="button"
                                variant="outline"
                                className="hover:bg-destructive hover:text-white"
                                onClick={() => {
                                    setIsEditing(false);
                                    reset(report ? {
                                        positiveTraits: report.positives.map(p => ({ trait: p.note })),
                                        negativeTraits: report.negatives.map(n => ({ trait: n.note })),
                                        positiveBy: report.positives[0]?.by || "",
                                        negativeBy: report.negatives[0]?.by || "",
                                        rating: ratingMap[report.predictiveRating] || "",
                                        improvement: report.scopeForImprovement,
                                    } : {});
                                }}
                            >
                                Cancel
                            </Button>

                            <Button type="submit" className="bg-[#40ba4d]">
                                Save
                            </Button>
                        </>
                    )}
                </div>
            </div>
        </form>
    );
}

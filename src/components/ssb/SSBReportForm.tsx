"use client";

import { useForm, useFieldArray } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ratingMap, reverseRatingMap } from "@/config/app.config";
import { toast } from "sonner";
import { SsbReport } from "@/app/lib/api/ssbReportApi";
import { useEffect } from "react";

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
    const {
        register,
        control,
        handleSubmit,
        reset,
        formState: { isDirty },
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

    const { fields: positiveFields, append: addPositive, remove: removePositive } = useFieldArray({
        control, name: "positiveTraits",
    });

    const { fields: negativeFields, append: addNegative, remove: removeNegative } = useFieldArray({
        control, name: "negativeTraits",
    });

    useEffect(() => {
        if (!report) return;

        const {
            positives = [],
            negatives = [],
            predictiveRating = 0,
            scopeForImprovement = ""
        } = report;

        reset({
            positiveTraits: positives.map(({ note }) => ({ trait: note ?? "" })),
            negativeTraits: negatives.map(({ note }) => ({ trait: note ?? "" })),
            positiveBy: positives[0]?.by ?? "",
            negativeBy: negatives[0]?.by ?? "",
            rating: ratingMap[predictiveRating] ?? "",
            improvement: scopeForImprovement ?? ""
        });
    }, [report, reset]);

    return (
        <form onSubmit={handleSubmit(onSave)} className="space-y-6">

            {/* POSITIVE TRAITS */}
            <div className="grid grid-cols-2 gap-12">
                <div>
                    <label className="text-sm font-semibold">Positive Traits</label>
                    <div className="space-y-2 mt-2">
                        {positiveFields.map(({ id }, idx) => {
                            return (
                                <div key={id} className="flex items-center gap-2">
                                    <Input
                                        {...register(`positiveTraits.${idx}.trait`)}
                                        placeholder={`Trait ${idx + 1}`}
                                        className="flex-1"
                                    />
                                    <Button type="button" variant="destructive" size="sm"
                                        onClick={() => removePositive(idx)}>
                                        Remove
                                    </Button>
                                </div>
                            );
                        })}

                        <Button type="button" variant="outline" size="sm"
                            onClick={() => addPositive({ trait: "" })}
                        >
                            + Add Positive
                        </Button>
                    </div>
                </div>

                <div>
                    <label className="text-sm font-semibold">By</label>
                    <select {...register("positiveBy")} className="w-full rounded-md border p-2 mt-1">
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
                                    className="flex-1"
                                />
                                <Button type="button" variant="destructive" size="sm"
                                    onClick={() => removeNegative(idx)}>
                                    Remove
                                </Button>
                            </div>
                        ))}

                        <Button type="button" variant="outline" size="sm"
                            onClick={() => addNegative({ trait: "" })}
                        >
                            + Add Negative
                        </Button>
                    </div>
                </div>

                <div>
                    <label className="text-sm font-semibold">By</label>
                    <select {...register("negativeBy")} className="w-full rounded-md border p-2 mt-1">
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
                <select {...register("rating")} className="w-full rounded-md border p-2 mt-1">
                    <option value="">Select Rating</option>
                    {Object.keys(reverseRatingMap).map((key) => (
                        <option key={key} value={key}>{key}</option>
                    ))}
                </select>
            </div>

            {/* IMPROVEMENT */}
            <div>
                <label className="text-sm font-semibold">Scope for Improvement</label>
                <Textarea {...register("improvement")} placeholder="Details..." className="mt-1" />
            </div>

            <Button type="submit" className="w-full">Save</Button>
        </form>
    );
}

"use client";

import { useForm, useFieldArray } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ratingMap, reverseRatingMap } from "@/config/app.config";
import { SsbReport } from "@/app/lib/api/ssbReportApi";
import { useEffect, useState } from "react";
import { useDebounce } from "@/hooks/useDebounce";

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
    savedFormData,
    onSave,
    onAutoSave,
    onClear,
}: {
    ocId: string;
    report: SsbReport | null;
    savedFormData?: SSBFormData;
    onSave: (data: SSBFormData) => Promise<void>;
    onAutoSave?: (data: SSBFormData) => void;
    onClear?: () => void;
}) {
    const [isEditing, setIsEditing] = useState(false);
    const [isInitialized, setIsInitialized] = useState(false);

    const {
        register,
        control,
        handleSubmit,
        reset,
        watch
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

    // Watch form values for auto-save
    const formValues = watch();
    const debouncedFormValues = useDebounce(formValues, 500);
    const ratingOptions = Object.values(ratingMap);
    const currentRating = formValues.rating || "";

    // ---------------------------
    // PRELOAD FORM DATA - SMART MERGE
    // ---------------------------
    useEffect(() => {
        if (!report || isInitialized) return;

        // Transform API data
        const transformedApiData: SSBFormData = {
            positiveTraits: report.positives.map(p => ({ trait: p.note ?? "" })),
            negativeTraits: report.negatives.map(n => ({ trait: n.note ?? "" })),
            positiveBy: report.positives[0]?.by ?? "",
            negativeBy: report.negatives[0]?.by ?? "",
            rating: ratingMap[report.predictiveRating] ?? "",
            improvement: report.scopeForImprovement ?? "",
        };

        // Smart merge: Prioritize API data, but use Redux data for empty API fields
        if (savedFormData) {
            console.log("Merging API data with Redux fallback");

            const mergedData: Partial<SSBFormData> = { ...transformedApiData };

            // Merge simple string fields
            const stringFields: (keyof SSBFormData)[] = ['positiveBy', 'negativeBy', 'rating', 'improvement'];
            stringFields.forEach((key) => {
                const apiValue = transformedApiData[key] as string;
                const reduxValue = savedFormData[key] as string;

                const isApiEmpty = !apiValue || apiValue === "";
                const hasReduxValue = reduxValue && reduxValue !== "";

                if (isApiEmpty && hasReduxValue) {
                    (mergedData as Record<string, unknown>)[key] = reduxValue;
                } else {
                    (mergedData as Record<string, unknown>)[key] = apiValue;
                }
            });

            // Merge array fields (positiveTraits)
            if (transformedApiData.positiveTraits.length === 0 ||
                transformedApiData.positiveTraits.every(t => !t.trait)) {
                if (savedFormData.positiveTraits && savedFormData.positiveTraits.length > 0) {
                    mergedData.positiveTraits = savedFormData.positiveTraits;
                }
            } else {
                mergedData.positiveTraits = transformedApiData.positiveTraits;
            }

            // Merge array fields (negativeTraits)
            if (transformedApiData.negativeTraits.length === 0 ||
                transformedApiData.negativeTraits.every(t => !t.trait)) {
                if (savedFormData.negativeTraits && savedFormData.negativeTraits.length > 0) {
                    mergedData.negativeTraits = savedFormData.negativeTraits;
                }
            } else {
                mergedData.negativeTraits = transformedApiData.negativeTraits;
            }

            console.log("Merged data:", mergedData);
            reset(mergedData as SSBFormData);
        } else {
            console.log("Loading from API:", transformedApiData);
            reset(transformedApiData);
        }

        setIsInitialized(true);
    }, [report, savedFormData, reset, isInitialized]);

    // ---------------------------
    // AUTO-SAVE TO REDUX (DEBOUNCED)
    // ---------------------------
    useEffect(() => {
        if (!isInitialized || !isEditing || !onAutoSave) return;

        if (debouncedFormValues && Object.keys(debouncedFormValues).length > 0) {
            const hasAnyData =
                debouncedFormValues.positiveTraits?.some(t => t.trait) ||
                debouncedFormValues.negativeTraits?.some(t => t.trait) ||
                debouncedFormValues.positiveBy ||
                debouncedFormValues.negativeBy ||
                debouncedFormValues.rating ||
                debouncedFormValues.improvement;

            if (hasAnyData) {
                console.log("Auto-saving to Redux:", debouncedFormValues);
                onAutoSave(debouncedFormValues as SSBFormData);
            }
        }
    }, [debouncedFormValues, isEditing, isInitialized, onAutoSave]);

    // ---------------------------
    // HANDLE SUBMIT - PASS DATA DIRECTLY TO PARENT
    // ---------------------------
    const handleFormSubmit = async (data: SSBFormData) => {
        console.log("Form submitted with data:", data);
        await onSave(data);
        setIsEditing(false);
    };

    // ---------------------------
    // HANDLE CANCEL
    // ---------------------------
    const handleCancel = () => {
        setIsEditing(false);
        if (report) {
            reset({
                positiveTraits: report.positives.map(p => ({ trait: p.note ?? "" })),
                negativeTraits: report.negatives.map(n => ({ trait: n.note ?? "" })),
                positiveBy: report.positives[0]?.by ?? "",
                negativeBy: report.negatives[0]?.by ?? "",
                rating: ratingMap[report.predictiveRating] ?? "",
                improvement: report.scopeForImprovement ?? "",
            });
        }
    };

    return (
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
            <div className="rounded-2xl shadow-lg bg-white px-5 py-5">

                {isEditing && (
                    <div className="text-xs text-muted-foreground text-right mb-4">
                        ✓ Changes are saved automatically
                    </div>
                )}

                {/* POSITIVE TRAITS */}
                <div className="grid grid-cols-2 gap-12 mb-6">
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
                                    {isEditing && (
                                        <Button
                                            type="button"
                                            variant="destructive"
                                            size="sm"
                                            onClick={() => removePositive(idx)}
                                        >
                                            Remove
                                        </Button>
                                    )}
                                </div>
                            ))}

                            {isEditing && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="hover:bg-success hover:text-primary-foreground"
                                    size="sm"
                                    onClick={() => addPositive({ trait: "" })}
                                >
                                    + Add Positive
                                </Button>
                            )}
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
                <div className="grid grid-cols-2 gap-12 mb-6">
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
                                    {isEditing && (
                                        <Button
                                            type="button"
                                            variant="destructive"
                                            size="sm"
                                            onClick={() => removeNegative(idx)}
                                        >
                                            Remove
                                        </Button>
                                    )}
                                </div>
                            ))}

                            {isEditing && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="hover:bg-success hover:text-primary-foreground"
                                    size="sm"
                                    onClick={() => addNegative({ trait: "" })}
                                >
                                    + Add Negative
                                </Button>
                            )}
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
                <div className="mb-6">
                    <label className="text-sm font-semibold">Predictive Rating</label>
                    {isEditing ? (
                        <select
                            {...register("rating")}
                            className="w-full rounded-md border p-2 mt-1"
                        >
                            <option value="">Select Rating</option>
                            {Object.keys(reverseRatingMap).map((key) => (
                                <option key={key} value={key}>{key}</option>
                            ))}
                        </select>
                    ) : (
                        <div className="mt-2 flex flex-wrap gap-2">
                            {ratingOptions.map((label) => {
                                const isActive = label === currentRating;
                                return (
                                    <span
                                        key={label}
                                        className={`rounded-full border px-3 py-1 text-xs font-semibold ${isActive
                                            ? "border-primary bg-primary/10 text-primary"
                                            : "border-muted text-muted-foreground"
                                            }`}
                                    >
                                        {label}
                                    </span>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* IMPROVEMENT */}
                <div className="mb-6">
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
                            Edit & Add More
                        </Button>
                    ) : (
                        <>
                            <Button
                                type="button"
                                variant="outline"
                                className="hover:bg-destructive hover:text-primary-foreground"
                                onClick={handleCancel}
                            >
                                Cancel
                            </Button>

                            {onClear && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={onClear}
                                >
                                    Clear Form
                                </Button>
                            )}

                            <Button type="submit" className="bg-success">
                                Save
                            </Button>
                        </>
                    )}
                </div>
            </div>
        </form>
    );
}

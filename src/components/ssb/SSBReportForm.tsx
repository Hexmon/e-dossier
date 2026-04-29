"use client";

import { useForm, useFieldArray } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ratingMap, reverseRatingMap } from "@/config/app.config";
import { SsbReport } from "@/app/lib/api/ssbReportApi";
import { useEffect, useRef, useState } from "react";
import { useDebounce } from "@/hooks/useDebounce";

export interface SSBFormData {
    positiveTraits: { trait: string }[];
    negativeTraits: { trait: string }[];
    positiveBy: string;
    negativeBy: string;
    rating: string;
    improvement: string;
}

const DEFAULT_ASSESSOR_OPTIONS = ["IO", "GTO", "Psy", "TO", "Staff"] as const;

function createEmptyFormData(): SSBFormData {
    return {
        positiveTraits: [{ trait: "" }],
        negativeTraits: [{ trait: "" }],
        positiveBy: "",
        negativeBy: "",
        rating: "",
        improvement: "",
    };
}

function cloneTraitRows(traits: { trait: string }[] | undefined) {
    return (traits ?? []).map((item) => ({ trait: item?.trait ?? "" }));
}

function ensureTraitRows(traits: { trait: string }[] | undefined) {
    const rows = cloneTraitRows(traits);
    return rows.length > 0 ? rows : [{ trait: "" }];
}

export function cloneSsbFormData(data: SSBFormData): SSBFormData {
    return {
        positiveTraits: ensureTraitRows(data.positiveTraits),
        negativeTraits: ensureTraitRows(data.negativeTraits),
        positiveBy: data.positiveBy ?? "",
        negativeBy: data.negativeBy ?? "",
        rating: data.rating ?? "",
        improvement: data.improvement ?? "",
    };
}

function serializeSsbFormData(data: SSBFormData): string {
    return JSON.stringify(cloneSsbFormData(data));
}

function buildFormDataFromSources(
    report: SsbReport | null,
    savedFormData?: SSBFormData
): SSBFormData {
    if (!report) {
        if (!savedFormData) {
            return createEmptyFormData();
        }

        return {
            positiveTraits: ensureTraitRows(savedFormData.positiveTraits),
            negativeTraits: ensureTraitRows(savedFormData.negativeTraits),
            positiveBy: savedFormData.positiveBy ?? "",
            negativeBy: savedFormData.negativeBy ?? "",
            rating: savedFormData.rating ?? "",
            improvement: savedFormData.improvement ?? "",
        };
    }

    const transformedApiData: SSBFormData = {
        positiveTraits: report.positives.map((p) => ({ trait: p.note ?? "" })),
        negativeTraits: report.negatives.map((n) => ({ trait: n.note ?? "" })),
        positiveBy: report.positives[0]?.by ?? "",
        negativeBy: report.negatives[0]?.by ?? "",
        rating: ratingMap[report.predictiveRating] ?? "",
        improvement: report.scopeForImprovement ?? "",
    };

    if (!savedFormData) {
        return {
            ...transformedApiData,
            positiveTraits: ensureTraitRows(transformedApiData.positiveTraits),
            negativeTraits: ensureTraitRows(transformedApiData.negativeTraits),
        };
    }

    const mergedData: Partial<SSBFormData> = { ...transformedApiData };

    const stringFields: (keyof SSBFormData)[] = ["positiveBy", "negativeBy", "rating", "improvement"];
    stringFields.forEach((key) => {
        const apiValue = transformedApiData[key] as string;
        const reduxValue = savedFormData[key] as string;
        const isApiEmpty = !apiValue || apiValue === "";
        const hasReduxValue = reduxValue && reduxValue !== "";

        (mergedData as Record<string, unknown>)[key] = isApiEmpty && hasReduxValue ? reduxValue : apiValue;
    });

    mergedData.positiveTraits =
        transformedApiData.positiveTraits.length === 0 ||
            transformedApiData.positiveTraits.every((t) => !t.trait)
            ? ensureTraitRows(savedFormData.positiveTraits)
            : transformedApiData.positiveTraits;

    mergedData.negativeTraits =
        transformedApiData.negativeTraits.length === 0 ||
            transformedApiData.negativeTraits.every((t) => !t.trait)
            ? ensureTraitRows(savedFormData.negativeTraits)
            : transformedApiData.negativeTraits;

    return {
        positiveTraits: ensureTraitRows(mergedData.positiveTraits),
        negativeTraits: ensureTraitRows(mergedData.negativeTraits),
        positiveBy: (mergedData.positiveBy as string) ?? "",
        negativeBy: (mergedData.negativeBy as string) ?? "",
        rating: (mergedData.rating as string) ?? "",
        improvement: (mergedData.improvement as string) ?? "",
    };
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
    const lastAutoSaveRef = useRef<string | null>(null);

    const {
        register,
        control,
        handleSubmit,
        reset,
        watch
    } = useForm<SSBFormData>({
        defaultValues: createEmptyFormData()
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
        if (isEditing) return;

        const nextData = buildFormDataFromSources(report, savedFormData);
        console.log("Hydrating SSB form:", nextData);
        reset(nextData);
    }, [report, savedFormData, reset, isEditing]);

    // ---------------------------
    // AUTO-SAVE TO REDUX (DEBOUNCED)
    // ---------------------------
    useEffect(() => {
        if (!isEditing || !onAutoSave) return;

        if (debouncedFormValues && Object.keys(debouncedFormValues).length > 0) {
            const hasAnyData =
                debouncedFormValues.positiveTraits?.some(t => t.trait) ||
                debouncedFormValues.negativeTraits?.some(t => t.trait) ||
                debouncedFormValues.positiveBy ||
                debouncedFormValues.negativeBy ||
                debouncedFormValues.rating ||
                debouncedFormValues.improvement;

            if (hasAnyData) {
                const autosaveData = cloneSsbFormData(debouncedFormValues as SSBFormData);
                const serialized = serializeSsbFormData(autosaveData);
                if (serialized === lastAutoSaveRef.current) return;

                lastAutoSaveRef.current = serialized;
                console.log("Auto-saving to Redux:", autosaveData);
                onAutoSave(autosaveData);
            }
        }
    }, [debouncedFormValues, isEditing, onAutoSave]);

    // ---------------------------
    // HANDLE SUBMIT - PASS DATA DIRECTLY TO PARENT
    // ---------------------------
    const handleFormSubmit = async (data: SSBFormData) => {
        console.log("Form submitted with data:", data);
        await onSave(data);
        lastAutoSaveRef.current = null;
        setIsEditing(false);
    };

    // ---------------------------
    // HANDLE CANCEL
    // ---------------------------
    const handleCancel = () => {
        setIsEditing(false);
        lastAutoSaveRef.current = null;
        reset(buildFormDataFromSources(report, savedFormData));
    };

    const positiveByOptions = formValues.positiveBy && !DEFAULT_ASSESSOR_OPTIONS.includes(formValues.positiveBy as typeof DEFAULT_ASSESSOR_OPTIONS[number])
        ? [...DEFAULT_ASSESSOR_OPTIONS, formValues.positiveBy]
        : DEFAULT_ASSESSOR_OPTIONS;

    const negativeByOptions = formValues.negativeBy && !DEFAULT_ASSESSOR_OPTIONS.includes(formValues.negativeBy as typeof DEFAULT_ASSESSOR_OPTIONS[number])
        ? [...DEFAULT_ASSESSOR_OPTIONS, formValues.negativeBy]
        : DEFAULT_ASSESSOR_OPTIONS;

    return (
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
            <div className="rounded-2xl shadow-lg bg-card px-5 py-5">

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
                            {positiveByOptions.map((option) => (
                                <option key={option} value={option}>{option}</option>
                            ))}
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
                            {negativeByOptions.map((option) => (
                                <option key={option} value={option}>{option}</option>
                            ))}
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

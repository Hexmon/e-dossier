"use client";

import { useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { useDispatch } from "react-redux";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MedicalInfoForm } from "@/types/med-records";
import { saveMedicalInfoForm } from "@/store/slices/medicalInfoSlice";

interface Props {
    onSubmit: (data: MedicalInfoForm) => void;
    disabled: boolean;
    detailsEditing: boolean;
    canEditDetails: boolean;
    onDetailsEdit: () => void;
    onDetailsCancel: () => void;
    onDetailsSave: (details: {
        medicalHistory: string;
        medicalIssues: string;
        allergies: string;
    }) => void;
    defaultValues: MedicalInfoForm;
    ocId: string;
    onClear: () => void;
}

const parseFloatValue = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    const num = Number(trimmed);
    return Number.isFinite(num) ? num : undefined;
};

const calculateBmi = (abw: string, heightCm: string) => {
    const weight = parseFloatValue(abw);
    const height = parseFloatValue(heightCm);
    if (weight === undefined || height === undefined || height <= 0) return "";
    const bmi = weight / ((height / 100) * (height / 100));
    return Number.isFinite(bmi) ? bmi.toFixed(2) : "";
};

export default function MedicalInfoFormComponent({
    onSubmit,
    disabled,
    detailsEditing,
    canEditDetails,
    onDetailsEdit,
    onDetailsCancel,
    onDetailsSave,
    defaultValues,
    ocId,
    onClear
}: Props) {
    const dispatch = useDispatch();

    const form = useForm<MedicalInfoForm>({
        defaultValues,
    });

    const { control, handleSubmit, register, getValues, watch, setValue } = form;

    const { fields, append, remove } = useFieldArray({ control, name: "medInfo" });

    // Auto-save to Redux on form changes
    useEffect(() => {
        const subscription = watch((value) => {
            if (ocId && value.medInfo && value.medInfo.length > 0) {
                const medInfoData = value.medInfo.map(item => ({
                    date: item?.date || "",
                    age: item?.age || "",
                    height: item?.height || "",
                    ibw: item?.ibw || "",
                    abw: item?.abw || "",
                    overw: item?.overw || "",
                    bmi: item?.bmi || "",
                    chest: item?.chest || "",
                }));

                const detailsData = {
                    medicalHistory: value.medicalHistory || "",
                    medicalIssues: value.medicalIssues || "",
                    allergies: value.allergies || "",
                };

                dispatch(saveMedicalInfoForm({
                    ocId,
                    medInfo: medInfoData,
                    details: detailsData
                }));
            }
        });
        return () => subscription.unsubscribe();
    }, [watch, dispatch, ocId]);

    // Auto-calculate BMI from ABW (kg) and Height (cm)
    const medInfoRows = watch("medInfo");
    useEffect(() => {
        (medInfoRows ?? []).forEach((row, index) => {
            const computedBmi = calculateBmi(row.abw ?? "", row.height ?? "");
            if ((row.bmi ?? "") !== computedBmi) {
                setValue(`medInfo.${index}.bmi`, computedBmi, { shouldDirty: true });
            }
        });
    }, [medInfoRows, setValue]);

    return (
        <form onSubmit={handleSubmit(onSubmit)}>
            <div className="overflow-x-auto">
                <table className="w-full border text-sm">
                    <thead>
                        <tr>
                            {["Date", "Age", "Ht", "IBW", "ABW", "Overwt", "BMI", "Chest", "Action"].map((h) => (
                                <th key={h} className="border p-2">{h}</th>
                            ))}
                        </tr>
                    </thead>

                    <tbody>
                        {fields.map((field, i) => {
                            return (
                                <tr key={field.id}>
                                    {["date", "age", "height", "ibw", "abw", "overw", "bmi", "chest"].map((f) => {
                                        if (f === "bmi") {
                                            return (
                                                <td key={f} className="border p-2">
                                                    <Input
                                                        {...register(`medInfo.${i}.bmi` as any)}
                                                        value={medInfoRows?.[i]?.bmi ?? ""}
                                                        type="number"
                                                        step="any"
                                                        inputMode="decimal"
                                                        readOnly
                                                        className="bg-muted"
                                                    />
                                                </td>
                                            );
                                        }

                                        return (
                                            <td key={f} className="border p-2">
                                                <Input
                                                    {...register(`medInfo.${i}.${f}` as any)}
                                                    type={f === "date" ? "date" : "number"}
                                                    step={f === "date" ? undefined : "any"}
                                                    inputMode={f === "date" ? undefined : "decimal"}
                                                />
                                            </td>
                                        );
                                    })}

                                    <td className="border p-2 text-center">
                                        <Button type="button" variant="destructive" size="sm" onClick={() => remove(i)}>
                                            Remove
                                        </Button>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>

            <div className="mt-4 flex justify-center gap-3">
                <Button type="button" onClick={() => append({
                    date: "",
                    age: "",
                    height: "",
                    ibw: "",
                    abw: "",
                    overw: "",
                    bmi: "",
                    chest: "",
                })}>
                    + Add Row
                </Button>

                <Button
                    variant="outline"
                    className="hover:bg-destructive hover:text-primary-foreground"
                    type="button"
                    onClick={onClear}
                >
                    Clear Form
                </Button>
            </div>

            <div className="flex flex-col items-center mt-4 gap-2">
                <Button type="submit" className="w-64 bg-primary">
                    Submit Medical Info
                </Button>

                {/* Show auto-save indicator */}
                <p className="text-sm text-muted-foreground text-center">
                    * Changes are automatically saved
                </p>
            </div>

            <div className="mt-6 space-y-4">
                <Textarea
                    {...register("medicalHistory")}
                    placeholder="Medical History"
                    disabled={disabled}
                />
                <Textarea
                    {...register("medicalIssues")}
                    placeholder="Medical Issues"
                    disabled={disabled}
                />
                <Textarea
                    {...register("allergies")}
                    placeholder="Allergies"
                    disabled={disabled}
                />
            </div>

            <div className="mt-3 flex justify-center gap-2">
                {detailsEditing ? (
                    <>
                        <Button
                            type="button"
                            size="sm"
                            onClick={() =>
                                onDetailsSave({
                                    medicalHistory: getValues("medicalHistory") || "",
                                    medicalIssues: getValues("medicalIssues") || "",
                                    allergies: getValues("allergies") || "",
                                })
                            }
                        >
                            Save Details
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={onDetailsCancel}
                        >
                            Cancel
                        </Button>
                    </>
                ) : (
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={onDetailsEdit}
                        disabled={!canEditDetails}
                    >
                        Edit Details
                    </Button>
                )}
            </div>
        </form>
    );
}

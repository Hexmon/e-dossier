"use client";

import { useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MedicalInfoForm } from "@/types/med-records";

interface Props {
    onSubmit: (data: MedicalInfoForm) => void;
    disabled: boolean;
    defaultValues: MedicalInfoForm;
}

export default function MedicalInfoFormComponent({ onSubmit, disabled, defaultValues }: Props) {

    const form = useForm<MedicalInfoForm>({
        defaultValues,
    });

    const { control, handleSubmit, register, reset } = form;

    const { fields, append, remove } = useFieldArray({ control, name: "medInfo" });

    //Reset form whenever defaultValues change
    useEffect(() => {
        reset(defaultValues);
    }, [defaultValues, reset]);

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
                                    {["date", "age", "height", "ibw", "abw", "overw", "bmi", "chest"].map((f) => (
                                        <td key={f} className="border p-2">
                                            <Input
                                                {...register(`medInfo.${i}.${f}` as any)}
                                                type={f === "date" ? "date" : "text"}
                                            />
                                        </td>
                                    ))}

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
                    medicalHistory: "",
                    medicalIssues: "",
                    allergies: "",
                })}>
                    + Add Row
                </Button>

                <Button variant="outline" type="button" onClick={() => reset(defaultValues)}>
                    Reset
                </Button>
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

            <div className="flex justify-center mt-4">
                <Button type="submit" className="w-64 bg-blue-600">
                    Submit Medical Info
                </Button>
            </div>
        </form>
    );
}

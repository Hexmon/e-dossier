"use client";

import { useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { useDispatch } from "react-redux";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MedicalCategoryFormData } from "@/types/med-records";
import { saveMedicalCategoryForm } from "@/store/slices/medicalCategorySlice";

interface Props {
    onSubmit: (data: MedicalCategoryFormData) => void;
    defaultValues: MedicalCategoryFormData;
    ocId: string;
    onClear: () => void;
}

export default function MedicalCategoryForm({ onSubmit, defaultValues, ocId, onClear }: Props) {
    const dispatch = useDispatch();

    const form = useForm<MedicalCategoryFormData>({
        defaultValues,
    });

    const { control, register, handleSubmit, reset, watch } = form;
    const { fields, append, remove } = useFieldArray({ control, name: "records" });

    // Auto-save to Redux on form changes
    useEffect(() => {
        const subscription = watch((value) => {
            if (ocId && value.records && value.records.length > 0) {
                const formData = value.records.map(record => ({
                    date: record?.date || "",
                    diagnosis: record?.diagnosis || "",
                    catFrom: record?.catFrom || "",
                    catTo: record?.catTo || "",
                    mhFrom: record?.mhFrom || "",
                    mhTo: record?.mhTo || "",
                    absence: record?.absence || "",
                    piCdrInitial: record?.piCdrInitial || "",
                }));

                dispatch(saveMedicalCategoryForm({ ocId, data: formData }));
            }
        });
        return () => subscription.unsubscribe();
    }, [watch, dispatch, ocId]);

    return (
        <form onSubmit={handleSubmit(onSubmit)}>
            <div className="overflow-x-auto border rounded-lg shadow">
                <table className="w-full border text-sm">
                    <thead className="bg-muted/70">
                        <tr>
                            {[
                                "Date",
                                "Diagnosis",
                                "Cat From",
                                "Cat To",
                                "MH From",
                                "MH To",
                                "Absence",
                                "PI Cdr Initial",
                                "Action",
                            ].map((h) => {
                                return (
                                    <th key={h} className="border p-2 text-center">{h}</th>
                                )
                            })}
                        </tr>
                    </thead>

                    <tbody>
                        {fields.map((field, index) => {
                            return (
                                <tr key={field.id}>
                                    <td className="border p-2">
                                        <Input type="date" {...register(`records.${index}.date`)} className="w-24 h-7 px-1 text-xs" />
                                    </td>

                                    <td className="border p-2">
                                        <Input type="text" {...register(`records.${index}.diagnosis`)} />
                                    </td>

                                    <td className="border p-2">
                                        <Input type="date" {...register(`records.${index}.catFrom`)} className="w-24 h-7 px-1 text-xs" />
                                    </td>

                                    <td className="border p-2">
                                        <Input type="date" {...register(`records.${index}.catTo`)} className="w-24 h-7 px-1 text-xs" />
                                    </td>

                                    <td className="border p-2">
                                        <Input type="date" {...register(`records.${index}.mhFrom`)} className="w-24 h-7 px-1 text-xs" />
                                    </td>

                                    <td className="border p-2">
                                        <Input type="date" {...register(`records.${index}.mhTo`)} className="w-24 h-7 px-1 text-xs" />
                                    </td>

                                    <td className="border p-2">
                                        <Input type="text" {...register(`records.${index}.absence`)} />
                                    </td>

                                    <td className="border p-2">
                                        <Input type="text" {...register(`records.${index}.piCdrInitial`)} />
                                    </td>

                                    <td className="border p-2 text-center">
                                        <Button type="button" variant="destructive" onClick={() => remove(index)}>
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
                <Button
                    type="button"
                    onClick={() =>
                        append({
                            date: "",
                            diagnosis: "",
                            catFrom: "",
                            catTo: "",
                            mhFrom: "",
                            mhTo: "",
                            absence: "",
                            piCdrInitial: "",
                        })
                    }
                >
                    + Add Row
                </Button>

                <Button type="submit" className="bg-primary">
                    Submit MED CAT
                </Button>

                <Button
                    type="button"
                    variant="outline"
                    className="hover:bg-destructive hover:text-primary-foreground"
                    onClick={onClear}
                >
                    Clear Form
                </Button>
            </div>

            {/* Auto-save indicator */}
            <p className="text-sm text-muted-foreground text-center mt-2">
                * Changes are automatically saved
            </p>
        </form>
    );
}
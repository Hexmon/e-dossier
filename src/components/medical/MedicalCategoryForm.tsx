"use client";

import { useForm, useFieldArray } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MedicalCategoryFormData } from "@/types/med-records";

interface Props {
    onSubmit: (data: MedicalCategoryFormData) => void;
}

export default function MedicalCategoryForm({ onSubmit }: Props) {
    const form = useForm<MedicalCategoryFormData>({
        defaultValues: {
            records: [
                {
                    date: "",
                    diagnosis: "",
                    catFrom: "",
                    catTo: "",
                    mhFrom: "",
                    mhTo: "",
                    absence: "",
                    piCdrInitial: "",
                },
            ],
        },
    });

    const { control, register, handleSubmit, reset } = form;
    const { fields, append, remove } = useFieldArray({ control, name: "records" });

    return (
        <form onSubmit={handleSubmit(onSubmit)}>
            <div className="overflow-x-auto border rounded-lg shadow">
                <table className="w-full border text-sm">
                    <thead className="bg-gray-100">
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
                                        <Input type="date" {...register(`records.${index}.date`)} className="w-24 h-7 px-1 text-xs"/>
                                    </td>

                                    <td className="border p-2">
                                        <Input type="text" {...register(`records.${index}.diagnosis`)} />
                                    </td>

                                    <td className="border p-2">
                                        <Input type="date" {...register(`records.${index}.catFrom`)} className="w-24 h-7 px-1 text-xs"/>
                                    </td>

                                    <td className="border p-2">
                                        <Input type="date" {...register(`records.${index}.catTo`)} className="w-24 h-7 px-1 text-xs"/>
                                    </td>

                                    <td className="border p-2">
                                        <Input type="date" {...register(`records.${index}.mhFrom`)} className="w-24 h-7 px-1 text-xs"/>
                                    </td>

                                    <td className="border p-2">
                                        <Input type="date" {...register(`records.${index}.mhTo`)} className="w-24 h-7 px-1 text-xs"/>
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

                <Button type="submit" className="bg-blue-600">
                    Submit MED CAT
                </Button>

                <Button type="button" variant="outline" onClick={() => reset()}>
                    Reset
                </Button>
            </div>
        </form>
    );
}

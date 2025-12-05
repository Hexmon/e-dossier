// components/cfe/CfeForm.tsx
"use client";

import { useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { catOptions } from "@/constants/app.constants";

import type { cfeFormData, cfeRow } from "@/types/cfe";

interface Props {
    onSubmit: (data: cfeFormData) => Promise<void> | void;
    semIndex: number;
    existingRows: cfeRow[];
}

export default function CfeForm({ onSubmit, semIndex, existingRows }: Props) {
    const form = useForm<cfeFormData>({
        defaultValues: {
            records: [
                {
                    serialNo: "1",
                    cat: "",
                    mks: "",
                    remarks: "",
                },
            ],
        },
    });

    const { control, handleSubmit, register, reset, setValue, watch } = form;
    const { fields, append, remove } = useFieldArray({ control, name: "records" });

    // keep the select value fallback / in sync (no term stored here)
    useEffect(() => {
        // nothing to sync for semIndex (we rely on parent when saving)
        // This hook kept for parity with other forms
    }, [semIndex]);

    const addRow = () =>
        append({
            serialNo: String(fields.length + 1),
            cat: "",
            mks: "",
            remarks: "",
        });

    return (
        <form onSubmit={handleSubmit(onSubmit)}>
            <div className="overflow-x-auto border rounded-lg shadow">
                <table className="w-full border text-sm">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="p-2 border">S No</th>
                            <th className="p-2 border">Cat</th>
                            <th className="p-2 border">Mks</th>
                            <th className="p-2 border">Remarks</th>
                            <th className="p-2 border text-center">Action</th>
                        </tr>
                    </thead>

                    <tbody>
                        {fields.map((field, idx) => {
                            return (
                                <tr key={field.id}>
                                    <td className="p-2 border text-center">
                                        <Input value={String(idx + 1)} disabled className="bg-gray-100 text-center" />
                                    </td>

                                    <td className="p-2 border">
                                        <Select
                                            value={watch(`records.${idx}.cat`) ?? ""}
                                            onValueChange={(v) =>
                                                setValue(`records.${idx}.cat`, v, { shouldDirty: true, shouldValidate: true })
                                            }
                                        >
                                            <SelectTrigger className="w-full">
                                                <SelectValue placeholder="Select category..." />
                                            </SelectTrigger>
                                            <SelectContent className="max-h-72">
                                                {catOptions.map((opt) => (
                                                    <SelectItem key={opt} value={opt}>
                                                        {opt}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </td>

                                    <td className="p-2 border">
                                        <Input {...register(`records.${idx}.mks` as const)} type="text" />
                                    </td>

                                    <td className="p-2 border">
                                        <Input {...register(`records.${idx}.remarks` as const)} type="text" />
                                    </td>

                                    <td className="p-2 border text-center">
                                        <Button type="button" variant="destructive" size="sm" onClick={() => remove(idx)}>
                                            Remove
                                        </Button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <div className="mt-4 flex justify-center gap-3">
                <Button type="button" onClick={addRow}>
                    + Add Row
                </Button>

                <Button type="submit" className="bg-green-600 hover:bg-green-700">
                    Submit
                </Button>

                <Button type="button" variant="outline" onClick={() => reset()}>
                    Reset
                </Button>
            </div>
        </form>
    );
}

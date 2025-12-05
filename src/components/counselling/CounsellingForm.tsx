"use client";

import { useEffect } from "react";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { CounsellingFormData } from "@/types/counselling";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { warningTypes } from "@/constants/app.constants";

interface Props {
    onSubmit: (data: CounsellingFormData) => Promise<void> | void;
    semLabel: string;
}

export default function CounsellingForm({ onSubmit, semLabel }: Props) {
    const form = useForm<CounsellingFormData>({
        defaultValues: {
            records: [
                {
                    term: semLabel ?? "",
                    reason: "",
                    warningType: "",
                    date: "",
                    warningBy: "",
                },
            ],
        },
    });

    const { control, handleSubmit, register, reset, setValue, watch } = form;
    const { fields, append, remove } = useFieldArray({ control, name: "records" });

    // keep term in sync with semLabel for new rows
    useEffect(() => {
        // update existing rows' term
        for (let i = 0; i < fields.length; i += 1) {
            setValue(`records.${i}.term`, semLabel ?? "", { shouldDirty: true });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [semLabel]);

    const addRow = () =>
        append({
            term: semLabel ?? "",
            reason: "",
            warningType: "",
            date: "",
            warningBy: "",
        });

    // present minimal UI; parent will call saveRecords using semLabel
    return (
        <form onSubmit={handleSubmit(onSubmit)}>
            <div className="overflow-x-auto border rounded-lg shadow mb-4">
                <table className="w-full border text-sm">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="p-2 border text-center">S No</th>
                            <th className="p-2 border">Reason (Attach copy)</th>
                            <th className="p-2 border">Nature of Warning</th>
                            <th className="p-2 border">Date</th>
                            <th className="p-2 border">Warning by (Rk & Name)</th>
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
                                        <Input {...register(`records.${idx}.reason`)} />
                                    </td>

                                    <td className="p-2 border">
                                        <Select
                                            value={watch(`records.${idx}.warningType`) || ""}
                                            onValueChange={(value) => setValue(`records.${idx}.warningType`, value)}
                                        >
                                            <SelectTrigger className="w-full">
                                                <SelectValue placeholder="Relegation / Withdrawal" />
                                            </SelectTrigger>

                                            <SelectContent>
                                                {warningTypes.map((w) => (
                                                    <SelectItem key={w} value={w}>
                                                        {w}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </td>

                                    <td className="p-2 border">
                                        <Input type="date" {...register(`records.${idx}.date`)} />
                                    </td>

                                    <td className="p-2 border">
                                        <Input {...register(`records.${idx}.warningBy`)} />
                                    </td>

                                    <td className="p-2 border text-center">
                                        <Button type="button" size="sm" variant="destructive" onClick={() => remove(idx)}>Remove</Button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <div className="mt-4 flex justify-center gap-4">
                <Button type="button" onClick={addRow}>+ Add Row</Button>
                <Button type="submit" className="bg-green-600 hover:bg-green-700">Submit</Button>
                <Button type="button" variant="outline" onClick={() => reset()}>Reset</Button>
            </div>
        </form>
    );
}
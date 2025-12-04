"use client";

import React, { useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type ParentCommFormRow = {
    serialNo?: string;
    letterNo?: string;
    date?: string;
    teleCorres?: string;
    briefContents?: string;
    sigPICdr?: string;
};

export type ParentCommFormData = {
    records: ParentCommFormRow[];
};

interface Props {
    onSubmit: (data: ParentCommFormData) => Promise<void> | void;
    defaultValues?: ParentCommFormData;
}

export default function ParentCommForm({ onSubmit, defaultValues }: Props) {
    const form = useForm<ParentCommFormData>({
        defaultValues: defaultValues ?? {
            records: [
                { letterNo: "", date: "", teleCorres: "", briefContents: "", sigPICdr: "" },
            ],
        },
    });

    const { control, handleSubmit, register, reset } = form;
    const { fields, append, remove } = useFieldArray({ control, name: "records" });

    useEffect(() => {
        if (defaultValues) {
            reset(defaultValues);
        }
    }, [defaultValues, reset]);

    return (
        <form onSubmit={handleSubmit(onSubmit)}>
            <div className="overflow-x-auto border rounded-lg shadow">
                <table className="w-full border text-sm">
                    <thead className="bg-gray-100">
                        <tr>
                            {["S.No", "Letter No", "Date", "Tele/Corres", "Brief Contents", "Sig PI Cdr", "Action"].map((h) => (
                                <th key={h} className="p-2 border text-center">{h}</th>
                            ))}
                        </tr>
                    </thead>

                    <tbody>
                        {fields.map((field, i) => {
                            return (
                                <tr key={field.id}>
                                    <td className="p-2 border text-center">
                                        <Input disabled value={String(i + 1)} className="bg-gray-100 text-center" />
                                    </td>

                                    <td className="p-2 border">
                                        <Input {...register(`records.${i}.letterNo`)} />
                                    </td>

                                    <td className="p-2 border">
                                        <Input type="date" {...register(`records.${i}.date`)} />
                                    </td>

                                    <td className="p-2 border">
                                        <Input {...register(`records.${i}.teleCorres`)} />
                                    </td>

                                    <td className="p-2 border">
                                        <Input {...register(`records.${i}.briefContents`)} />
                                    </td>

                                    <td className="p-2 border">
                                        <Input {...register(`records.${i}.sigPICdr`)} />
                                    </td>

                                    <td className="p-2 border text-center">
                                        <Button type="button" variant="destructive" size="sm" onClick={() => remove(i)}>
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
                <Button type="button" onClick={() => append({ letterNo: "", date: "", teleCorres: "", briefContents: "", sigPICdr: "" })}>
                    + Add Row
                </Button>

                <Button type="submit" className="bg-green-600">
                    Submit
                </Button>

                <Button type="button" variant="outline" onClick={() => reset()}>
                    Reset
                </Button>
            </div>
        </form>
    );
}

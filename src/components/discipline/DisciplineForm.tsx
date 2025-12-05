"use client";

import { useEffect } from "react";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import type { DisciplineForm as DisciplineFormType } from "@/types/dicp-records";

/**
 * DisciplineForm
 * - onSubmit receives { records: [...] }
 * - live cumulative calculation (only negative cumulative displayed)
 * - all form values editable
 * - uses react-hook-form, no `any`
 */

interface Props {
    onSubmit: (data: DisciplineFormType) => Promise<void> | void;
}

export default function DisciplineForm({ onSubmit }: Props) {
    const defaultRow = {
        serialNo: "",
        dateOfOffence: "",
        offence: "",
        punishmentAwarded: "",
        dateOfAward: "",
        byWhomAwarded: "",
        negativePts: "",
        cumulative: "",
    };

    const form = useForm<DisciplineFormType>({
        defaultValues: {
            records: [{ ...defaultRow }],
        },
    });

    const { control, handleSubmit, register, reset, setValue } = form;
    const { fields, append, remove } = useFieldArray({ control, name: "records" });

    // watch negativePts to compute live cumulative (only show negatives for UI)
    const watched = useWatch({ control, name: "records" }) || [];

    useEffect(() => {
        // compute cumulative using the sequence of negativePts and base 0
        let total = 0;
        for (let i = 0; i < (watched?.length ?? 0); i += 1) {
            const rec = watched[i] ?? { negativePts: "" };
            const delta = Number(rec.negativePts ?? 0);
            total += delta;
            // always set to form value (string) so backend receives a number if needed later
            setValue(`records.${i}.cumulative`, String(total), { shouldDirty: true, shouldTouch: false });
        }
    }, [JSON.stringify(watched), setValue]);

    // helper for append with defaults
    const handleAppend = () =>
        append({
            ...defaultRow,
        });

    return (
        <form onSubmit={handleSubmit(onSubmit)}>
            <div className="overflow-auto border rounded-lg shadow">
                <table className="w-full table-fixed text-sm">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="p-2 border">S.No</th>
                            <th className="p-2 border">Date Of Offence</th>
                            <th className="p-2 border">Offence</th>
                            <th className="p-2 border">Punishment Awarded</th>
                            <th className="p-2 border">Date Of Award</th>
                            <th className="p-2 border">By Whom Awarded</th>
                            <th className="p-2 border">Negative Pts</th>
                            <th className="p-2 border">Cumulative</th>
                            <th className="p-2 border">Action</th>
                        </tr>
                    </thead>

                    <tbody>
                        {fields.map((field, index) => {
                            // destructure nothing from 'field' because react-hook-form field has internal props; use index for names
                            return (
                                <tr key={field.id}>
                                    <td className="p-2 border text-center">
                                        <Input disabled value={String(index + 1)} className="bg-gray-100 text-center" />
                                    </td>

                                    <td className="p-2 border">
                                        <Input type="date" {...register(`records.${index}.dateOfOffence`)} />
                                    </td>

                                    <td className="p-2 border">
                                        <Input {...register(`records.${index}.offence`)} />
                                    </td>

                                    <td className="p-2 border">
                                        <Input {...register(`records.${index}.punishmentAwarded`)} />
                                    </td>

                                    <td className="p-2 border">
                                        <Input type="date" {...register(`records.${index}.dateOfAward`)} />
                                    </td>

                                    <td className="p-2 border">
                                        <Input {...register(`records.${index}.byWhomAwarded`)} />
                                    </td>

                                    <td className="p-2 border">
                                        <Input type="number" {...register(`records.${index}.negativePts`)} />
                                    </td>

                                    <td className="p-2 border">
                                        {/* show cumulative only if negative, otherwise show blank (but keep value in form) */}
                                        <Input
                                            disabled
                                            value={
                                                Number((watched?.[index]?.cumulative ?? "0")) < 0
                                                    ? String(watched[index].cumulative)
                                                    : ""
                                            }
                                            className="bg-gray-100 text-center"
                                        />
                                    </td>

                                    <td className="p-2 border text-center">
                                        <button
                                            type="button"
                                            onClick={() => remove(index)}
                                            className="inline-block px-2 py-1 bg-red-600 text-white rounded text-xs"
                                        >
                                            Remove
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <div className="mt-4 flex justify-center gap-3">
                <Button type="button" onClick={handleAppend}>
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

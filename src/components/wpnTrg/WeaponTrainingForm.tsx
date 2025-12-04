"use client";

import React, { useEffect, useMemo } from "react";
import { useForm, UseFormReturn } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { WeaponTrainingRecord } from "@/app/lib/api/weaponTrainingApi";

type Row = {
    subject: string;
    maxMarks: number;
    obtained: string;
};

type FormValues = {
    records: Row[];
};

interface Props {
    semesterNumber: number;
    inputPrefill: Row[];
    savedRecords: WeaponTrainingRecord[]; // from hook
    onSave: (values: FormValues) => Promise<void>;
    disabled?: boolean;
    formMethods?: UseFormReturn<FormValues>;
}

export default function WeaponTrainingForm({
    semesterNumber,
    inputPrefill,
    savedRecords,
    onSave,
    disabled = false,
    formMethods,
}: Props) {
    const methods = formMethods ?? useForm<FormValues>({ defaultValues: { records: inputPrefill } });
    const { register, handleSubmit, reset, watch } = methods;

    const merged = useMemo(() => {
        return inputPrefill.map((pref) => {
            const match = [...savedRecords].reverse().find((s) => s.subject === pref.subject && s.semester === semesterNumber);
            return {
                subject: pref.subject ?? "-",
                maxMarks: pref.maxMarks ?? 0,
                obtained: match ? String(match.marksObtained ?? "") : String(pref.obtained ?? ""),
            };
        });
    }, [inputPrefill, savedRecords, semesterNumber]);

    useEffect(() => {
        reset({ records: merged });
    }, [merged, reset]);

    const watched = watch("records");

    return (
        <form onSubmit={handleSubmit(onSave)}>
            <div className="overflow-x-auto border rounded-lg shadow">
                <table className="w-full border text-sm">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="p-2 border">Subject</th>
                            <th className="p-2 border">Max Marks</th>
                            <th className="p-2 border">Obtained</th>
                        </tr>
                    </thead>

                    <tbody>
                        {merged.map((row, idx) => {
                            return (
                                <tr key={row.subject ?? idx}>
                                    <td className="p-2 border">{row.subject ?? "-"}</td>

                                    <td className="p-2 border">
                                        <Input
                                            {...register(`records.${idx}.maxMarks`, { valueAsNumber: true })}
                                            type="number"
                                            defaultValue={row.maxMarks}
                                            disabled={disabled}
                                        />
                                    </td>

                                    <td className="p-2 border">
                                        <Input
                                            {...register(`records.${idx}.obtained`)}
                                            type="number"
                                            defaultValue={row.obtained}
                                            disabled={disabled}
                                        />
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Buttons */}
            <div className="flex justify-center gap-3 mt-6">
                <Button type="submit" disabled={disabled}>
                    Save Training
                </Button>
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => reset({ records: merged })}
                    disabled={disabled}
                >
                    Reset
                </Button>
            </div>
        </form>
    );
}

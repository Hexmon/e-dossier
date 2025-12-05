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
    savedRecords: WeaponTrainingRecord[];
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
    /** ALWAYS call hook at top-level */
    const internalForm = useForm<FormValues>({
        defaultValues: { records: inputPrefill },
    });

    const methods = formMethods ?? internalForm;

    const { register, handleSubmit, reset, watch } = methods;

    /**
     * Merged values:
     * - Prefill values
     * - Latest saved record override
     */
    const merged = useMemo<Row[]>(() => {
        return inputPrefill.map((pref) => {
            const match = [...savedRecords]
                .reverse()
                .find(
                    (s) =>
                        s.subject === pref.subject &&
                        Number(s.semester) === Number(semesterNumber)
                );

            return {
                subject: pref.subject ?? "-",
                maxMarks: pref.maxMarks ?? 0,
                obtained: match
                    ? String(match.marksObtained ?? "")
                    : String(pref.obtained ?? ""),
            };
        });
    }, [inputPrefill, savedRecords, semesterNumber]);

    /** Sync form on merged change */
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
                            const subject = row.subject ?? "-";
                            const maxMarks = row.maxMarks ?? 0;
                            const obtained = row.obtained ?? "";

                            return (
                                <tr key={subject + idx}>
                                    <td className="p-2 border">{subject}</td>

                                    <td className="p-2 border">
                                        <Input
                                            {...register(`records.${idx}.maxMarks`, {
                                                valueAsNumber: true,
                                            })}
                                            type="number"
                                            defaultValue={maxMarks}
                                            disabled={disabled}
                                        />
                                    </td>

                                    <td className="p-2 border">
                                        <Input
                                            {...register(`records.${idx}.obtained`)}
                                            type="number"
                                            defaultValue={obtained}
                                            disabled={disabled}
                                        />
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Action Buttons */}
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

"use client";

import React, { useEffect, useMemo } from "react";
import { useForm, UseFormReturn } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { SpeedMarchRecord } from "@/app/lib/api/speedMarchApi";
import { tablePrefill, termColumns } from "@/constants/app.constants";

type Row = {
    id?: string;
    test: string;
    timing10Label?: string;
    distance10?: string;
    timing20Label?: string;
    distance20?: string;
    timing30Label?: string;
    distance30?: string;
    marks?: string;
    remark?: string;
};

type FormValues = {
    records: Row[];
};

interface Props {
    semesterNumber: number;
    inputPrefill: Row[];
    savedRecords: SpeedMarchRecord[];
    onSave: (values: FormValues) => Promise<void>;
    isEditing: boolean;
    onCancelEdit: () => void;
    disabled?: boolean;
    formMethods?: UseFormReturn<FormValues>;
}

export default function SpeedMarchForm({
    semesterNumber,
    inputPrefill,
    savedRecords,
    onSave,
    isEditing,
    onCancelEdit,
    disabled = false,
    formMethods,
}: Props) {
    const internalMethods = useForm<FormValues>({
        defaultValues: { records: inputPrefill },
    });

    const methods = formMethods ?? internalMethods;

    const { register, handleSubmit, reset } = methods;

    // Select correct timing + distance fields for current semester
    const timingKey = termColumns[semesterNumber - 4].timing;
    const distanceKey = termColumns[semesterNumber - 4].distance;

    const merged = useMemo(() => {
        return inputPrefill.map((pref) => ({
            ...pref,
            [timingKey]: pref[timingKey] ?? "",
            [distanceKey]: pref[distanceKey] ?? "",
        }));
    }, [inputPrefill, timingKey, distanceKey]);

    useEffect(() => {
        reset({ records: merged });
    }, [merged, reset]);

    return (
        <form onSubmit={handleSubmit(onSave)}>
            <div className="overflow-x-auto border rounded-lg shadow">
                <table className="w-full border text-sm">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="p-2 border">Test</th>
                            <th className="p-2 border">Timings</th>
                            <th className="p-2 border">
                                {semesterNumber === 4
                                    ? "10 KM"
                                    : semesterNumber === 5
                                        ? "20 KM"
                                        : "30 KM"}
                            </th>
                        </tr>
                    </thead>

                    <tbody>
                        {merged.map((row, i) => {
                            const id = row.id ?? `row-${i}`;
                            const test = row.test ?? "-";
                            const timingLabel = row[timingKey] ?? "";
                            const distanceValue = row[distanceKey] ?? "";

                            return (
                                <tr key={id}>
                                    <td className="p-2 border">{test}</td>

                                    <td className="p-2 border">{timingLabel}</td>

                                    <td className="p-2 border">
                                        <Input
                                            {...register(`records.${i}.${distanceKey}` as const)}
                                            defaultValue={distanceValue}
                                            disabled={!isEditing || disabled}
                                        />
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Bottom Buttons */}
            <div className="flex justify-center gap-3 mt-6">
                {isEditing && (
                    <>
                        <Button type="submit" disabled={disabled}>
                            Save
                        </Button>

                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => reset({ records: merged })}
                            disabled={disabled}
                        >
                            Reset
                        </Button>

                        <Button
                            type="button"
                            variant="secondary"
                            onClick={onCancelEdit}
                            disabled={disabled}
                        >
                            Cancel
                        </Button>
                    </>
                )}
            </div>
        </form>
    );
}
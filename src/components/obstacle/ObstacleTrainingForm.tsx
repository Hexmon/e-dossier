"use client";

import React, { useEffect, useMemo } from "react";
import { useForm, UseFormReturn } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ObstacleTrainingRecord } from "@/app/lib/api/obstacleTrainingApi";
import { Row as ObstacleRow, TermData } from "@/types/obstacleTrg";

type Row = {
    id?: string;
    obstacle: string;
    obtained: string;
    remark?: string;
};

type FormValues = {
    records: Row[];
};

interface Props {
    semesterNumber: number;
    inputPrefill: Row[];
    savedRecords: ObstacleTrainingRecord[]; // from hook
    onSave: (values: TermData) => Promise<void>;
    isEditing: boolean;
    onCancelEdit: () => void;
    disabled?: boolean;
    formMethods?: UseFormReturn<TermData>;
}

export default function ObstacleTrainingForm({
    semesterNumber,
    inputPrefill,
    savedRecords,
    onSave,
    isEditing,
    onCancelEdit,
    disabled = false,
    formMethods,
}: Props) {
    const internalMethods = useForm<TermData>({
        defaultValues: { records: inputPrefill },
    });

    const methods = formMethods ?? internalMethods;
    const { register, handleSubmit, reset, watch } = methods;

    // merged: map prefill -> latest saved record for same obstacle & semester
    const merged = useMemo(() => {
        return inputPrefill.map((pref) => {
            const { obstacle: prefObstacle, obtained: prefObtained = "", remark: prefRemark = "", id: prefId } = pref;
            const match = [...savedRecords]
                .reverse()
                .find((r) => (r.obstacle ?? "") === (prefObstacle ?? "") && Number(r.semester ?? 0) === Number(semesterNumber));
            const obstacle = prefObstacle ?? "-";
            const obtained = match ? String(match.marksObtained ?? "") : String(prefObtained ?? "");
            const remark = match ? String(match.remark ?? "") : String(prefRemark ?? "");
            const id = match ? match.id : prefId;
            return { id, obstacle, obtained, remark };
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
                            <th className="p-2 border text-left">No</th>
                            <th className="p-2 border text-left">Obstacle</th>
                            <th className="p-2 border text-left">Marks Obtained</th>
                            <th className="p-2 border text-left">Remarks</th>
                        </tr>
                    </thead>

                    <tbody>
                        {merged.map((row, idx) => {
                            const { id = "", obstacle = "-", obtained = "", remark = "" } = row;
                            return (
                                <tr key={id || `${obstacle}-${idx}`}>
                                    <td className="p-2 border text-center">{idx + 1}</td>

                                    <td className="p-2 border">{obstacle}</td>

                                    <td className="p-2 border">
                                        <Input
                                            {...register(`records.${idx}.obtained`)}
                                            type="number"
                                            placeholder="Marks"
                                            defaultValue={obtained}
                                            disabled={!isEditing || disabled}
                                        />
                                    </td>

                                    <td className="p-2 border">
                                        <Input
                                            {...register(`records.${idx}.remark`)}
                                            type="text"
                                            placeholder="Remark"
                                            defaultValue={remark}
                                            disabled={!isEditing || disabled}
                                        />
                                    </td>
                                </tr>
                            );
                        })}

                        {/* Total row */}
                        <tr className="font-semibold bg-gray-50">
                            <td className="p-2 border text-center">{(watched?.length ?? merged.length) + 1}</td>
                            <td className="p-2 border">Total</td>
                            <td className="p-2 border text-center">
                                {(watched ?? merged).slice(0, merged.length).reduce((sum, r) => sum + (parseFloat(r.obtained || "0") || 0), 0)}
                            </td>
                            <td className="p-2 border text-center">—</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* Buttons toggled by parent editing state */}
            <div className="flex justify-center gap-3 mt-6">
                {isEditing ? (
                    <>
                        <Button type="submit" disabled={disabled}>
                            Save
                        </Button>

                        <Button type="button" variant="outline" onClick={() => reset({ records: merged })} disabled={disabled}>
                            Reset
                        </Button>

                        <Button type="button" variant="secondary" onClick={onCancelEdit} disabled={disabled}>
                            Cancel
                        </Button>
                    </>
                ) : null}
            </div>
        </form>
    );
}